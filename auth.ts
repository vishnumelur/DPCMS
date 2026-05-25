import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { user, account, session, verificationToken } from '@/db/schema';
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

export const { handlers, signIn, signOut, auth } = NextAuth({
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
    async jwt({ token, user: u }) {
      if (u) {
        token.id = (u as { id?: string }).id;
        token.email = u.email ?? token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = token.id as string | undefined;
      }
      return session;
    },
  },
});
