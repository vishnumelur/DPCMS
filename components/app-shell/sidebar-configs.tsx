import type { SidebarSection } from './sidebar-nav';

export const CUSTOMER_SIDEBAR: SidebarSection[] = [
  {
    title: 'My account',
    items: [
      { label: 'Dashboard', href: '/me', phase: 'P0', live: true },
      { label: 'My consents', href: '/me/consents', live: true },
      { label: 'Privacy notices', href: '/me/notices', live: true },
      { label: 'My data', href: '/me/data', phase: 'P3' },
    ],
  },
  {
    title: 'Rights & requests',
    items: [
      { label: 'Raise a request (DSR)', href: '/me/requests', live: true },
      { label: 'Nominees', href: '/me/nominees', phase: 'P2' },
      { label: 'Activity log', href: '/me/activity', phase: 'P0', live: true },
    ],
  },
];

export const ADMIN_SIDEBAR: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', phase: 'P0', live: true },
      { label: 'Audit chain', href: '/admin/audit', phase: 'P0', live: true },
      { label: 'RBAC viewer', href: '/admin/rbac', phase: 'P0', live: true },
      { label: 'Settings', href: '/admin/settings', phase: 'P0', live: true },
    ],
  },
  {
    title: 'Consent & notices',
    items: [
      { label: 'M1 · Consent management', href: '/admin/consents', live: true },
      { label: 'M2 · Cookie consent', href: '/admin/cookies', live: true },
      { label: 'M8 · Privacy notices', href: '/admin/notices', live: true },
    ],
  },
  {
    title: 'Rights & breach',
    items: [
      { label: 'M5 · Data principal rights', href: '/admin/dsr', live: true },
      { label: 'M9 · Breach management', href: '/admin/breach', live: true },
    ],
  },
  {
    title: 'Assessments & mapping',
    items: [
      { label: 'M3 · Data mapping (RoPA)', href: '/admin/data-mapping', phase: 'P3' },
      { label: 'M6 · Privacy assessments', href: '/admin/pia', phase: 'P3' },
      { label: 'M7 · DPIA', href: '/admin/dpia', phase: 'P3' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'M4 · Connectors', href: '/admin/integrations', phase: 'P4' },
    ],
  },
  {
    title: 'Reporting & research',
    items: [
      { label: 'M10 · Reports & dashboards', href: '/admin/reporting', phase: 'P5' },
      { label: 'M11 · Research repository', href: '/admin/research', phase: 'P5' },
    ],
  },
];
