import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { compare } from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { user, account, session, verificationToken, mfaFactor } from '@/db/schema';
import { env } from '@/lib/env';

const providers: NextAuthConfig['providers'] = [
  Credentials({
    name: 'Username & password',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(creds) {
      const username = typeof creds?.username === 'string' ? creds.username.trim() : '';
      const password = typeof creds?.password === 'string' ? creds.password : '';
      if (!username || !password) return null;

      const rows = await db.select().from(user).where(eq(user.email, username)).limit(1);
      const row = rows[0];
      if (!row?.passwordHash) return null;

      const ok = await compare(password, row.passwordHash);
      if (!ok) return null;

      return {
        id: row.id,
        name: row.name ?? username,
        email: row.email,
      };
    },
  }),
];

// Magic-link Resend provider only registers when RESEND_API_KEY + EMAIL_FROM are set.
if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  providers.push(
    Resend({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    }),
  );
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  // DrizzleAdapter is still configured so future OAuth providers + magic-link state has a home.
  // Sessions themselves use JWT so the Credentials provider works without manual DB session writes.
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: { strategy: 'jwt' },
  providers,
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, user: u, trigger, session: updatedSession }) {
      if (u) {
        token.id = (u as { id?: string }).id;
        token.email = u.email ?? token.email;
        // On sign-in, look up whether the user has a confirmed MFA factor so
        // proxy.ts can decide whether to send them to /mfa/verify before
        // letting them into /admin. mfaVerified always starts false for a new
        // session — they must pass the challenge each time.
        const uid = (u as { id?: string }).id;
        if (uid) {
          const factors = await db
            .select({ id: mfaFactor.id })
            .from(mfaFactor)
            .where(and(eq(mfaFactor.userId, uid), eq(mfaFactor.confirmed, true)))
            .limit(1);
          token.mfaEnrolled = factors.length > 0;
          token.mfaVerified = false;
        }
      }
      // `unstable_update({ mfaVerified: true })` lands here as a session payload.
      if (trigger === 'update' && updatedSession) {
        const patch = updatedSession as { mfaVerified?: boolean; mfaEnrolled?: boolean };
        if (typeof patch.mfaVerified === 'boolean') token.mfaVerified = patch.mfaVerified;
        if (typeof patch.mfaEnrolled === 'boolean') token.mfaEnrolled = patch.mfaEnrolled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = token.id as string | undefined;
      }
      // Expose MFA state on the session so server components can render it.
      (session as { mfaEnrolled?: boolean; mfaVerified?: boolean }).mfaEnrolled =
        Boolean(token.mfaEnrolled);
      (session as { mfaEnrolled?: boolean; mfaVerified?: boolean }).mfaVerified =
        Boolean(token.mfaVerified);
      return session;
    },
  },
});
