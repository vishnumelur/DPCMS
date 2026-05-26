import { TopBar } from './top-bar';
import { SidebarNav, type SidebarSection } from './sidebar-nav';

type Props = {
  sections: SidebarSection[];
  children: React.ReactNode;
};

export function AuthShell({ sections, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <TopBar variant="auth" mobileSidebarSections={sections} />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <SidebarNav sections={sections} />
        </aside>
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
