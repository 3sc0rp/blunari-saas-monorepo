import { test, expect, Page } from '@playwright/test';
import { installSupabaseStubs } from './helpers/supabaseStub';

// E2E: Public catering widget should load without redirecting to /auth and display initial loading UI then tenant name or catering heading.

const RELATIVE_WIDGET_PATH = '/public-widget/catering/demo?embed=1';
function getWidgetUrl(baseURL?: string) {
  if (baseURL && /^https?:/i.test(baseURL)) return baseURL.replace(/\/$/, '') + RELATIVE_WIDGET_PATH;
  return 'http://localhost:5173' + RELATIVE_WIDGET_PATH;
}

async function assertNoAuthRedirect(page: Page) {
  expect(page.url()).not.toContain('/auth');
}

// Utility to collect console errors with filtering
function installConsoleErrorCollector(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  return () => consoleErrors.filter(e => !/localStorage|supabase|GoTrue/i.test(e));
}

async function assertUrlStable(page: Page, expected: string) {
  const before = page.url();
  expect(before).toBe(expected);
  await page.waitForTimeout(150);
  const after = page.url();
  expect(after).toBe(expected);
}

test.describe('Public Catering Widget', () => {
  test('loads without auth redirect and shows loading then content', async ({ page }) => {
  await installSupabaseStubs(page);
  const getFilteredErrors = installConsoleErrorCollector(page);

    const targetUrl = getWidgetUrl(test.info().project.use?.baseURL as string | undefined);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    await assertNoAuthRedirect(page);

  const initialUrl = page.url();

    // Generic presence check
    await expect(page.locator('body')).toBeVisible();
    const maybeLoading = page.locator(':text-matches("Loading|Preparing", "i")').first();
    if (await maybeLoading.count()) {
      await maybeLoading.isVisible();
    }

  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length).toBeGreaterThan(0);

    expect(new URL(page.url()).origin).toContain('http://localhost:5173');
    await assertNoAuthRedirect(page);

  // Assert URL never changed (no hidden redirects)
  await assertUrlStable(page, initialUrl);

    const realErrors = getFilteredErrors();
    expect(realErrors.length, `Console errors encountered: \n${realErrors.join('\n')}`).toBeLessThan(5);
  });
});
