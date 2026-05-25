import { AuthShell } from '@/components/app-shell/auth-shell';
import { ADMIN_SIDEBAR } from '@/components/app-shell/sidebar-configs';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell sections={ADMIN_SIDEBAR}>{children}</AuthShell>;
}
