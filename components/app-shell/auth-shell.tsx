import { TopBar } from './top-bar';
import { SidebarNav, type SidebarSection } from './sidebar-nav';

type Props = {
  sections: SidebarSection[];
  children: React.ReactNode;
};

export function AuthShell({ sections, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar variant="auth" />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <SidebarNav sections={sections} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
