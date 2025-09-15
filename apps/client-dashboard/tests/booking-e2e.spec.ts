import { test, expect } from '@playwright/test';

function widgetUrl(baseURL?: string) {
  const origin = baseURL && /^https?:/i.test(baseURL) ? baseURL.replace(/\/$/, '') : 'http://localhost:5173';
  return `${origin}/public-widget/book/demo?embed=1`;
}

test.describe('Booking Widget Happy Path (no deposit)', () => {
  test('completes a booking end-to-end', async ({ page, baseURL }) => {
    const url = widgetUrl(baseURL as string | undefined);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Step 1: select party size
    const partyButton = page.getByRole('option', { name: /2 guests/i }).first();
    await partyButton.click();

    // Step 2: wait for availability and pick first slot
    await page.getByText('Available times').waitFor();
    const firstSlot = page.locator('button[role="button"]').filter({ hasText: /available/ }).first();
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
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible({ timeout: 15000 });
  });
});
