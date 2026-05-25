import { test, expect } from '@playwright/test';

test('landing renders with new hero', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Data Privacy & Consent Management System/i }),
  ).toBeVisible();
  // top-bar present (Home link)
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
  // 3 hero CTAs
  await expect(page.getByRole('link', { name: /Sign in to compliance portal/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /View RFP Compliance Matrix/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Read public privacy notice/i })).toBeVisible();
});

test('public notices page renders sample notice', async ({ page }) => {
  await page.goto('/notices');
  await expect(page.getByRole('heading', { name: /Privacy notices/i })).toBeVisible();
  // "Kerala State Cooperative Bank" appears in both the card title and body — first() resolves it
  await expect(page.getByText(/Kerala State Cooperative Bank/).first()).toBeVisible();
});

test('rfp matrix renders with badges + status counts', async ({ page }) => {
  await page.goto('/rfp-matrix');
  await expect(page.getByRole('heading', { name: /RFP Compliance Matrix/i })).toBeVisible();
  await expect(page.getByText(/RA:/)).toBeVisible();
  await expect(page.getByText(/CA:/)).toBeVisible();
  await expect(page.getByText(/NA:/)).toBeVisible();
});

test('health endpoint returns ok', async ({ request }) => {
  const r = await request.get('/api/health');
  expect([200, 503]).toContain(r.status());
  const body = await r.json();
  expect(typeof body.ok).toBe('boolean');
  expect(typeof body.ts).toBe('string');
});

test('protected admin route redirects unauthenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/signin/);
  await page.screenshot({ path: 'test-results/screenshots/01-signin-redirect.png', fullPage: true });
});

test('dpcmsadmin signs in, lands on compliance dashboard, and can traverse the sidebar', async ({
  page,
}) => {
  await page.goto('/signin');
  await expect(page.getByText(/Sign in to DPCMS/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/02-signin-form.png', fullPage: true });

  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await page.screenshot({ path: 'test-results/screenshots/03-signin-filled.png', fullPage: true });

  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);

  // Compliance dashboard
  await expect(page.getByRole('heading', { name: /Compliance dashboard/i })).toBeVisible();
  await expect(page.getByText(/dpcmsadmin/i).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/04-admin-dashboard.png', fullPage: true });

  // Sidebar should list every module
  await expect(page.getByRole('link', { name: /M1 · Consent management/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /M5 · Data principal rights/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /M9 · Breach management/ })).toBeVisible();

  // Navigate to live audit chain page
  await page.getByRole('link', { name: 'Audit chain' }).click();
  await expect(page.getByRole('heading', { name: /Audit chain/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/05-admin-audit.png', fullPage: true });

  // Navigate to live RBAC viewer
  await page.getByRole('link', { name: 'RBAC viewer' }).click();
  await expect(page.getByRole('heading', { name: /RBAC viewer/i })).toBeVisible();
  await expect(page.getByText(/^dpo$/)).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/06-admin-rbac.png', fullPage: true });

  // Navigate to the live M1 Consent management module
  await page.getByRole('link', { name: /M1 · Consent management/ }).click();
  await expect(page.getByRole('heading', { name: /M1 · Consent management/i })).toBeVisible();
  await expect(page.getByText(/Purposes \(/)).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/07-admin-m1-live.png', fullPage: true });

  // Cross-portal: switch to /me
  await page.getByRole('link', { name: 'My Portal' }).click();
  await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/08-customer-dashboard.png', fullPage: true });
});

test('landing screenshot for evidence', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'test-results/screenshots/09-landing.png', fullPage: true });
});

test('rfp matrix screenshot for evidence', async ({ page }) => {
  await page.goto('/rfp-matrix');
  await page.screenshot({ path: 'test-results/screenshots/10-rfp-matrix.png', fullPage: true });
});

test('admin can navigate to consent management and see purposes', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/consents');
  await expect(page.getByRole('heading', { name: /M1 · Consent management/i })).toBeVisible();
  // Five seeded purposes should appear by code (font-mono code cells).
  for (const code of ['ACCOUNT_OPENING', 'KYC', 'TRANSACTIONS', 'MARKETING_EMAIL', 'ANALYTICS_COOKIES']) {
    await expect(page.getByText(code).first()).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/screenshots/11-admin-consents-live.png', fullPage: true });
});

test('customer can raise a DSR and see it in their list', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/me/requests');
  await expect(page.getByRole('heading', { name: /My data principal requests/i })).toBeVisible();

  const subject = `E2E test — please export my data ${Date.now()}`;
  await page.getByLabel('Subject (short)').fill(subject);
  await page.getByLabel('Details').fill('Automated test request created by playwright.');
  await page.getByRole('button', { name: /Submit request/i }).click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/me\/requests$/);
  await expect(page.getByText(subject)).toBeVisible();
  // SLA badge for a fresh request should be green.
  await expect(page.getByText('green', { exact: false }).first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/screenshots/14-customer-dsr-created.png',
    fullPage: true,
  });
});

test('admin can see DSR queue and transition a request', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/dsr');
  await expect(page.getByRole('heading', { name: /M5 · Data principal rights/i })).toBeVisible();
  await expect(page.getByText(/Queue \(/)).toBeVisible();

  // Open the first DSR in the queue.
  await page.getByRole('link', { name: 'Open →' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Timeline \(/).first()).toBeVisible();
  const beforeText = (await page.getByText(/Timeline \(/).first().textContent()) ?? '';
  const beforeCount = Number.parseInt(beforeText.match(/\((\d+)\)/)?.[1] ?? '0', 10);

  await page.getByRole('button', { name: /Transition/i }).click();

  // Poll for the timeline to update — server actions revalidate without firing a load event.
  await expect
    .poll(
      async () => {
        const t = (await page.getByText(/Timeline \(/).first().textContent()) ?? '';
        return Number.parseInt(t.match(/\((\d+)\)/)?.[1] ?? '0', 10);
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(beforeCount);

  await page.screenshot({
    path: 'test-results/screenshots/15-admin-dsr-transitioned.png',
    fullPage: true,
  });
});

test('admin can create a RoPA activity and see it listed', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/data-mapping');
  await expect(page.getByRole('heading', { name: /M3 · Data mapping/i })).toBeVisible();

  const name = `E2E activity ${Date.now()}`;
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Description').fill('Created by Playwright E2E.');
  await page.getByLabel('Data categories (comma-separated)').fill('identity, contact');
  await page.getByLabel('Data subjects (comma-separated)').fill('customer');
  await page.getByLabel('Recipients (comma-separated)').fill('NPCI');
  await page.getByLabel('System of record').fill('Finacle');
  await page.getByLabel('Retention (months)').fill('60');
  await page.getByLabel('Retention rationale').fill('RBI KYC §7');
  await page.getByRole('button', { name: /Add activity/i }).click();

  await page.waitForLoadState('networkidle');
  await expect(page.getByText(name)).toBeVisible();
  await page.screenshot({
    path: 'test-results/screenshots/16-admin-ropa-created.png',
    fullPage: true,
  });
});

test('admin can open seeded DPIA, see questions, and trigger AI prefill (offline path)', async ({
  page,
}) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/dpia');
  await expect(page.getByRole('heading', { name: /M7 · Data protection/i })).toBeVisible();

  // Open the seeded DPIA.
  const seededRow = page.getByRole('row', { name: /DPIA — Customer KYC processing/i });
  await expect(seededRow).toBeVisible();
  await seededRow.getByRole('link', { name: /Open/i }).click();

  await expect(
    page.getByRole('heading', { name: /DPIA — Customer KYC processing/i }),
  ).toBeVisible();
  // First DPIA question should be rendered (in read mode because status=in_review).
  await expect(page.getByText(/What is the purpose of this processing\?/)).toBeVisible();
  // AI prefill button surfaces on every DPIA.
  await expect(page.getByRole('button', { name: /AI prefill/i })).toBeVisible();

  await page.screenshot({
    path: 'test-results/screenshots/17-admin-dpia-detail.png',
    fullPage: true,
  });
});

test('admin can see connectors panel with 6 connectors', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/integrations');
  await expect(page.getByRole('heading', { name: /M4 · Integrations/i })).toBeVisible();

  for (const code of ['finacle', 'npci', 'aadhaar', 'digilocker', 'aa', 'meity_consent_stack']) {
    await expect(page.getByText(code, { exact: false }).first()).toBeVisible();
  }
  await page.screenshot({
    path: 'test-results/screenshots/18-admin-integrations-list.png',
    fullPage: true,
  });
});

test('admin can trigger a sample event and see it in the recent log', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/admin/integrations');
  await expect(page.getByRole('heading', { name: /M4 · Integrations/i })).toBeVisible();

  await page.locator('select#connectorCode').selectOption('finacle');
  await page.locator('select#eventKind').selectOption('customer.profile.fetched');
  await page.locator('textarea#payload').fill('{}');
  await page.getByRole('button', { name: /^Trigger event$/i }).click();

  // We land on the detail page for finacle after the action redirects.
  await page.waitForURL(/\/admin\/integrations\/finacle/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /Infosys Finacle/i })).toBeVisible();
  await expect(page.getByText('customer.profile.fetched').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/screenshots/19-admin-integrations-event.png',
    fullPage: true,
  });
});

test('customer can grant and withdraw consent', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill('dpcmsadmin');
  await page.getByLabel('Password').fill('dpcms@2026');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 10_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ]);
  await page.goto('/me/consents');
  await expect(page.getByRole('heading', { name: /My consents/i })).toBeVisible();

  // MARKETING_EMAIL is the safest purpose to toggle (pure consent basis, no
  // legal_obligation downstream). Find its card and click Grant or Withdraw.
  const card = page
    .locator('div')
    .filter({ has: page.getByText('MARKETING_EMAIL') })
    .first();

  // If we previously granted (e.g. flaky test reuse), toggle off first.
  if (await card.getByRole('button', { name: /Withdraw/i }).isVisible().catch(() => false)) {
    await card.getByRole('button', { name: /Withdraw/i }).click();
    await page.waitForLoadState('networkidle');
  }

  await page.getByRole('button', { name: /^Grant$/i }).first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Active').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/12-customer-consent-active.png', fullPage: true });

  await page.getByRole('button', { name: /^Withdraw$/i }).first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Withdrawn').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/13-customer-consent-withdrawn.png', fullPage: true });
});
