import { AuthShell } from '@/components/app-shell/auth-shell';
import { CUSTOMER_SIDEBAR } from '@/components/app-shell/sidebar-configs';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell sections={CUSTOMER_SIDEBAR}>
      {/* Customer portal: text-base + larger tap targets for low-literacy / older users.
          Admin keeps the compact text-sm baseline. */}
      <div className="text-base">{children}</div>
    </AuthShell>
  );
}
