import { describe, it, expect, beforeEach } from 'vitest';

// This test simulates a sandboxed iframe environment where accessing
// window.localStorage throws a SecurityError. We then dynamically import
// modules that rely on safeStorage to ensure they operate without throwing.

// Helper to override global localStorage with a throwing proxy
function mockThrowingLocalStorage() {
  const throwing: Storage = new Proxy({} as Storage, {
    get() { throw new Error('SecurityError: blocked'); }
  });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { return throwing; }
  });
}

describe('widget config storage (sandboxed fallback)', () => {
  beforeEach(() => {
    mockThrowingLocalStorage();
    // Reset cached safeStorage singleton by deleting module from import cache if possible
    // (In Vitest ESM, re-importing after deletion triggers fresh evaluation.)
    // @ts-expect-error - checking for Vitest SSR import function
    if (typeof __vite_ssr_import__ === 'function') {
      // nothing special; vitest handles fresh modules in isolation per test file
    }
  });

  it('safeStorage falls back to in-memory and widgetConfig hook loads without throwing', async () => {
    const mod = await import('../src/utils/safeStorage');
    const { safeStorage } = mod;
    expect(safeStorage.persistent).toBe(false);
    safeStorage.set('alpha', '1');
    expect(safeStorage.get('alpha')).toBe('1');

    // Dynamically import the widget config hook (should not attempt raw localStorage directly)
    const hookMod = await import('../src/widgets/management/useWidgetConfig');
    expect(typeof hookMod.useWidgetConfig).toBe('function');
  });

  it('no uncaught errors when performing basic safeStorage operations', async () => {
    const errors: any[] = [];
    const origConsoleError = console.error;
    console.error = (...args: any[]) => { errors.push(args); };
    try {
      const { safeStorage } = await import('../src/utils/safeStorage');
      safeStorage.set('k','v');
      expect(safeStorage.get('k')).toBe('v');
      safeStorage.remove('k');
      expect(safeStorage.get('k')).toBeNull();
      safeStorage.clear();
    } finally {
      console.error = origConsoleError;
    }
    // Allow other non-storage errors but ensure no SecurityError surfaced
    const storageErr = errors.find(e => /SecurityError/i.test(e.join(' ')));
    expect(storageErr).toBeUndefined();
  });
});
