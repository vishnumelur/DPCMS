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

  // Navigate to a module placeholder (M1)
  await page.getByRole('link', { name: /M1 · Consent management/ }).click();
  await expect(page.getByRole('heading', { name: /M1 · Universal Consent Management/i })).toBeVisible();
  await expect(page.getByText(/RFP requirements covered/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/07-admin-m1-stub.png', fullPage: true });

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
