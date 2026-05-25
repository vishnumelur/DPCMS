import { AuthShell } from '@/components/app-shell/auth-shell';
import { CUSTOMER_SIDEBAR } from '@/components/app-shell/sidebar-configs';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell sections={CUSTOMER_SIDEBAR}>{children}</AuthShell>;
}
