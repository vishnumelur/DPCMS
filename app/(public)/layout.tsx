import { PublicShell } from '@/components/app-shell/public-shell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
