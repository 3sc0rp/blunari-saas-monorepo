import { Page } from '@playwright/test';

/**
 * Stubs common Supabase network endpoints to minimize noise and flakiness in public widget tests.
 * Returns a teardown function if future cleanup is required (currently no-op).
 */
export async function installSupabaseStubs(page: Page) {
  // Auth endpoints
  await page.route(/.*supabase\.co\/auth\/v1\/user.*/i, async route => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null }) });
  });

  await page.route(/.*supabase\.co\/auth\/v1\/token.*/i, async route => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  // Realtime or other channels (bypass quickly)
  await page.route(/.*supabase\.co\/realtime.*/i, async route => {
    return route.fulfill({ status: 101, body: '' }).catch(() => route.abort());
  });

  // Generic table fetches we don't need in public widget tests
  await page.route(/.*supabase\.co\/rest\/v1\/profiles.*/i, async route => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  return () => {};
}
