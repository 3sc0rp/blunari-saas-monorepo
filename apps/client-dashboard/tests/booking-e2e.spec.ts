import { test, expect } from '@playwright/test';

function widgetUrl(baseURL?: string) {
  const origin = baseURL && /^https?:/i.test(baseURL) ? baseURL.replace(/\/$/, '') : 'http://localhost:5173';
  return `${origin}/public-widget/book/demo?embed=1`;
}

test.describe('Booking Widget Happy Path (no deposit)', () => {
  test('completes a booking end-to-end', async ({ page, baseURL }) => {
    const url = widgetUrl(baseURL as string | undefined);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // If the booking widget shows a restaurant unavailable for demo, skip gracefully
    if (await page.getByText(/Restaurant Unavailable|not found/i).first().isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Demo tenant has no live booking backend; skipping happy path.');
      return;
    }

    // Step 1: select party size (wait for options to appear)
    const partyGrid = page.locator('[data-party-grid], [role="listbox"], [aria-label*="party" i]');
    await partyGrid.first().waitFor({ timeout: 15000 });
    const partyButton = page.locator('button, [role="option"]').filter({ hasText: /(^|\b)2(\b|\s*guests?)/i }).first();
    await expect(partyButton).toBeVisible({ timeout: 15000 });
    await partyButton.click();

    // Step 2: wait for availability and pick first slot
    await page.getByText(/Available times|Choose a time/i).first().waitFor({ timeout: 15000 });
    const firstSlot = page.locator('button').filter({ hasText: /available|\d{1,2}:\d{2}/i }).first();
    await expect(firstSlot).toBeVisible({ timeout: 15000 });
    await firstSlot.click();

    // Step 3: fill guest details
    await page.getByLabel('First Name *').fill('Test');
    await page.getByLabel('Last Name *').fill('User');
    await page.getByLabel('Email Address *').fill('test@example.com');
    await page.getByLabel('Phone Number *').fill('+15551234567');
    await page.getByRole('button', { name: /Continue to Confirmation/i }).click();

    // Step 4: confirm
    const confirmBtn = page.getByRole('button', { name: /Confirm Reservation/i });
    await confirmBtn.click();

    // Expect confirmation UI
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible({ timeout: 45000 });
  });
});
