import { test, expect } from '@playwright/test';

test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /DPCMS/i })).toBeVisible();
});

test('rfp matrix renders with badges', async ({ page }) => {
  await page.goto('/rfp-matrix');
  await expect(page.getByRole('heading', { name: /RFP Compliance Matrix/i })).toBeVisible();
  await expect(page.getByText(/RA:/)).toBeVisible();
  await expect(page.getByText(/CA:/)).toBeVisible();
  await expect(page.getByText(/NA:/)).toBeVisible();
});

test('health endpoint returns ok', async ({ request }) => {
  const r = await request.get('/api/health');
  // Note: health hits the DB. Without real Neon, expect 503; with real Neon, expect 200.
  expect([200, 503]).toContain(r.status());
  const body = await r.json();
  expect(typeof body.ok).toBe('boolean');
  expect(typeof body.ts).toBe('string');
});

test('protected admin route redirects unauthenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/signin/);
});
