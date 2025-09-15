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

    // Step 1: select party size (wait for options to appear)
    const partyGrid = page.locator('[role="listbox"], [data-party-grid]');
    await partyGrid.first().waitFor({ timeout: 15000 });
    const partyButton = page.getByRole('button', { name: /2\s*(guest|guests)?/i }).first().or(page.getByRole('option', { name: /2\s*guests/i }).first());
    await partyButton.click({ timeout: 15000 });

    // Step 2: wait for availability and pick first slot
    await page.getByText(/Available times/i).first().waitFor({ timeout: 15000 });
    const firstSlot = page.locator('button').filter({ hasText: /available|\d{1,2}:\d{2}/i }).first();
    await firstSlot.click({ timeout: 15000 });

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
