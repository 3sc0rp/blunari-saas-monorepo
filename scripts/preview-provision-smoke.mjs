import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';

const ADMIN_DIR = path.resolve('apps/admin-dashboard');
const PORT = Number(process.env.ADMIN_PREVIEW_PORT || 4180);
const BASE = (process.env.ADMIN_PREVIEW_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@blunari.ai';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const out = (obj) => console.log(JSON.stringify(obj, null, 2));

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
}

(async () => {
  let previewProc;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const start = Date.now();
  const now = Date.now();
  const name = `Preview Smoke Resto ${now}`;
  const slug = `preview-smoke-${now}`;
  const ownerEmail = `owner+${now}@example.com`;

  let status = 'unknown';
  let details = '';

  try {
    // 0) Build admin (fast if cached)
    await new Promise((resolve, reject) => {
      const p = spawn('npm', ['run', 'build', '--silent'], {
        cwd: ADMIN_DIR,
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key',
        },
      });
      p.on('exit', (code) => (code === 0 ? resolve(null) : reject(new Error(`build exit ${code}`))));
      p.on('error', reject);
    });

    // 1) Launch preview on PORT
    previewProc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host'], {
      cwd: ADMIN_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key',
      },
    });

    // 2) Wait for server
    await waitForServer(`${BASE}/`);

  // 3) Visit provisioning with bypass flag preset and clear any drafts
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ADMIN_TEST_BYPASS', '1');
        window.localStorage.removeItem('admin:tenant-provisioning-draft-v1');
      } catch {}
    });
  await page.goto(`${BASE}/admin/tenants/provision?__bypass=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}

  // 4) Step 1: Basics
    await page.waitForSelector('[data-testid="prov-page"]', { timeout: 20000 });
    const nameInput = page.locator('[data-testid="prov-name"]');
    const slugInput = page.locator('[data-testid="prov-slug"]');
    await nameInput.waitFor({ state: 'visible', timeout: 20000 });
    await nameInput.fill(name);
    await slugInput.fill(slug);
    const nextBtn = page.locator('[data-testid="prov-next"]');
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expectEnabled(nextBtn);
    await nextBtn.click();

  // 5) Step 2: Contact & Address (skip)
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expectEnabled(nextBtn);
    await nextBtn.click();

  // 6) Step 3: Owner
    const ownerEmailInput = page.locator('[data-testid="prov-owner-email"]');
    await ownerEmailInput.waitFor({ state: 'visible', timeout: 10000 });
    await ownerEmailInput.fill(ownerEmail);
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expectEnabled(nextBtn);
    await nextBtn.click();

  // 7) Step 4: Config
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expectEnabled(nextBtn);
    await nextBtn.click();

  // 8) Step 5: Billing & SMS
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expectEnabled(nextBtn);
    await nextBtn.click();

  // 9) Step 6: Review & Submit (or success may already be visible if auto-fast)
  const successCard = page.locator('[data-testid="prov-success"]');
    try {
      await Promise.race([
        page.locator('[data-testid="prov-review"]').waitFor({ state: 'visible', timeout: 20000 }),
        successCard.waitFor({ state: 'visible', timeout: 20000 })
      ]);
    } catch (_) {
      // ignore, we'll check success below
    }

    // If success already visible, skip submit
    if (!(await successCard.isVisible())) {
      const submit = page.locator('[data-testid="prov-submit"]');
      await submit.waitFor({ state: 'visible', timeout: 20000 });
      await expectEnabled(submit);
      await submit.click();
    }

  // 10) Wait for success UI and finish
  await successCard.waitFor({ state: 'visible', timeout: 120000 });
  status = 'success';
  } catch (e) {
    status = 'failed';
    details = e?.message || String(e);
    try {
      const outDir = path.resolve('test-results');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      await page.screenshot({ path: path.join(outDir, 'preview-provision-smoke-failure.png'), fullPage: true });
      const html = await page.content();
      await (await import('node:fs/promises')).writeFile(path.join(outDir, 'preview-provision-smoke-failure.html'), html, 'utf8');
    } catch {}
  } finally {
    out({ status, details, base: BASE, ms: Date.now() - start, ts: new Date().toISOString() });
    try { await browser.close(); } catch {}
    if (previewProc && !previewProc.killed) {
      try { previewProc.kill('SIGINT'); } catch {}
    }
  }
})();

// helpers
async function expectEnabled(locator, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const disabled = await locator.isDisabled();
      if (!disabled) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Locator did not become enabled in time');
}
