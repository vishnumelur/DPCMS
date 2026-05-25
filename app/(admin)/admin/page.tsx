import { auth } from '@/auth';

export default async function AdminHome() {
  const session = await auth();
  return <div>Admin home for {session?.user?.email}. (Phase P1+ adds modules.)</div>;
}
