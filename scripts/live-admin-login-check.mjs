import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.ADMIN_URL || 'https://admin.blunari.ai').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@blunari.ai';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const out = (obj) => console.log(JSON.stringify(obj));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  });
  const page = await context.newPage();
  const logs = [];
  const net = [];
  page.on('console', (msg) => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('response', (resp) => {
    try {
      const url = resp.url();
      if (/supabase\.co|supabase\.in|supabase\.com/.test(url) || /auth|token|login/i.test(url)) {
        net.push({ url, status: resp.status() });
      }
    } catch {}
  });
  const start = Date.now();
  let status = 'unknown';
  let signal = 'none';
  const resultsDir = path.resolve('test-results');
  try { fs.mkdirSync(resultsDir, { recursive: true }); } catch {}
  const screenshot = path.join(resultsDir, `admin-live-login-${Date.now()}.png`);
  try {
  // Go to the root auth page (router mounts Auth at '/')
  const target = new URL('/', BASE_URL).toString();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}

    // Save initial HTML for diagnostics
    try {
      const html = await page.content();
      await fs.promises.writeFile(path.join(resultsDir, `admin-live-login-${Date.now()}.html`), html, 'utf8');
    } catch {}

    // Prefer stable IDs from the app
    const emailSelector = '#signin-email, input[type="email"], input[name="email"], input[placeholder*="Email" i]';
    const passSelector = '#signin-password, input[type="password"], input[name="password"], input[placeholder*="Password" i]';
    // Wait for either form inputs or visible "Admin Login" heading
    const formReady = Promise.all([
      page.waitForSelector(emailSelector, { timeout: 30000 }),
      page.waitForSelector(passSelector, { timeout: 30000 }),
    ]).then(() => true).catch(() => false);
    const headingReady = page.locator('text=Admin Login').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    const ready = await Promise.race([formReady, headingReady]);
    if (!ready) {
      throw new Error('Auth form not detected');
    }
    // Ensure inputs exist (in case heading triggered readiness)
    await page.waitForSelector(emailSelector, { timeout: 15000 });
    await page.waitForSelector(passSelector, { timeout: 15000 });

    await page.fill(emailSelector, EMAIL);
    await page.fill(passSelector, PASSWORD);

  // Prefer submitting the visible signin form's submit button
  const form = page.locator('form').first();
  const submitBtn = form.locator('button[type="submit"]');
  await submitBtn.click({ timeout: 15000 });

    // Wait for outcome: dashboard URL or known header, or an auth error message
    const headerHint = page.locator('h1:has-text("Platform Administration")');
    const dashboardHint = page.locator('text=/Tenants|System Health|Observability|Platform Administration/i');
  const errorHint = page.locator('text=/invalid|error|incorrect password|try again|authentication failed/i');
  const successToast = page.locator('text=/Successfully signed in to your admin dashboard/i');
  const urlPromise = page.waitForURL(/\/admin(\/|$)/, { timeout: 45000 }).then(() => 'url_admin').catch(() => null);
  const headerPromise = headerHint.first().waitFor({ state: 'visible', timeout: 45000 }).then(() => 'header').catch(() => null);
  const listPromise = dashboardHint.first().waitFor({ state: 'visible', timeout: 45000 }).then(() => 'list').catch(() => null);
  const toastPromise = successToast.first().waitFor({ state: 'visible', timeout: 45000 }).then(() => 'toast').catch(() => null);
  const errorPromise = errorHint.first().waitFor({ state: 'visible', timeout: 45000 }).then(() => 'error').catch(() => null);

  const winner = await Promise.race([urlPromise, headerPromise, listPromise, toastPromise, errorPromise]);

  if (winner === 'url_admin' || winner === 'header' || winner === 'list' || winner === 'toast') {
      status = 'success';
      signal = winner;
    } else if (winner === 'error') {
      status = 'auth_error';
      signal = 'error_text';
    } else {
      status = 'timeout';
    }
  } catch (e) {
    status = 'exception';
    signal = e?.message || String(e);
  } finally {
    try { await page.screenshot({ path: screenshot, fullPage: true }); } catch {}
    const result = {
      status,
      signal,
      url: page.url(),
      ms: Date.now() - start,
      screenshot,
      ts: new Date().toISOString(),
      logs: logs.slice(-10),
      net,
    };
    out(result);
    await browser.close();
  }
})();
