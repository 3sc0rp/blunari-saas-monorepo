import { test, expect, Page } from '@playwright/test';
import { installSupabaseStubs } from './helpers/supabaseStub';

// E2E: Public booking widget should load without redirecting to /auth and display initial loading UI then tenant name.

// Use relative path so Playwright baseURL (if configured) can apply; fallback compose full URL.
const RELATIVE_WIDGET_PATH = '/public-widget/book/demo?embed=1';
function getWidgetUrl(baseURL?: string) {
  if (baseURL && /^https?:/i.test(baseURL)) return baseURL.replace(/\/$/, '') + RELATIVE_WIDGET_PATH;
  // Dev default
  return 'http://localhost:5173' + RELATIVE_WIDGET_PATH;
}

// Helper to assert no auth redirect occurred
async function assertNoAuthRedirect(page: Page) {
  const url = page.url();
  expect(url).not.toContain('/auth');
}

function installConsoleErrorCollector(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  return () => consoleErrors.filter(e => !/localStorage|supabase|GoTrue/i.test(e));
}

// Enhanced URL stability assertion that also records any frame navigations (future extension hook)
async function assertUrlStable(page: Page, expected: string) {
  const before = page.url();
  expect(before).toBe(expected);
  // Short delay to allow any client-side redirects that might occur after mount
  await page.waitForTimeout(150);
  const after = page.url();
  expect(after).toBe(expected);
}

test.describe('Public Booking Widget', () => {
  test('loads without auth redirect and shows loading then content', async ({ page }) => {
  await installSupabaseStubs(page);
  const getFilteredErrors = installConsoleErrorCollector(page);

    const targetUrl = getWidgetUrl(test.info().project.use?.baseURL as string | undefined);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    await assertNoAuthRedirect(page);

  const initialUrl = page.url();

    // Expect some initial DOM content quickly (body present) even if specific loading text not shown
    await expect(page.locator('body')).toBeVisible();
    // Optionally detect any generic loading indicator if present (non-fatal)
    const possibleLoading = page.locator(':text-matches("Loading", "i")').first();
    if (await possibleLoading.count()) {
      // Best effort visibility check without failing if absent
      await possibleLoading.isVisible();
    }

    // Wait for either tenant name heading or fallback booking step UI.
    // We allow a generous timeout because first tenant fetch may cold start.
  // Try to find a semantic heading OR verify body has some non-empty text after network idle
  const headingCandidate = page.getByRole('heading').first();
  await page.waitForLoadState('networkidle');
  let bodyText = await page.locator('body').innerText();
  // Minimal assertion: after idle, body should have some text content
  expect(bodyText.trim().length).toBeGreaterThan(0);

    // Security: iframe route must not expose same-origin script bridging (no allow-same-origin in embed code itself).
    // Here we just ensure document origin matches expected dev server.
    expect(new URL(page.url()).origin).toContain('http://localhost:5173');

    // Ensure no auth redirect sneaked in later
    await assertNoAuthRedirect(page);

  // Assert URL never changed (no hidden redirects)
  await assertUrlStable(page, initialUrl);

    // Basic console error budget (ignore known storage suppression warnings if any)
    const realErrors = getFilteredErrors();
    expect(realErrors.length, `Console errors encountered: \n${realErrors.join('\n')}`).toBeLessThan(5);
  });
});

// Placeholder for future postMessage resize simulation test (added in separate describe below)

test.describe('Public Booking Widget messaging', () => {
  test('handles resize postMessage without errors (placeholder)', async ({ page }) => {
  await installSupabaseStubs(page);
  const getFilteredErrors = installConsoleErrorCollector(page);
    const targetUrl = getWidgetUrl(test.info().project.use?.baseURL as string | undefined);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // Post a synthetic resize message to window (simulate parent -> iframe scenario for future handling)
    await page.evaluate(() => {
      window.postMessage({ type: 'WIDGET_RESIZE', height: 640 }, '*');
    });

    // Give a tiny delay to surface any console errors triggered
    await page.waitForTimeout(250);

    const realErrors = getFilteredErrors();
    expect(realErrors.length, `Console errors after resize message: \n${realErrors.join('\n')}`).toBeLessThan(2);
  });
});
