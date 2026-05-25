import { auth } from '@/auth';

export default async function MeHome() {
  const session = await auth();
  return <div>Welcome {session?.user?.email ?? 'customer'}. (Phase P1 adds the real portal.)</div>;
}
