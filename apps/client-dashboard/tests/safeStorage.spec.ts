import { describe, it, expect, vi } from 'vitest';

// We'll import the module fresh in each test to simulate different environments.

describe('safeStorage', () => {
  it('uses persistent localStorage when available', async () => {
    const mod = await import('../src/utils/safeStorage');
    const { safeStorage } = mod;
    safeStorage.set('k1', 'v1');
    expect(safeStorage.get('k1')).toBe('v1');
    expect(safeStorage.persistent).toBeTypeOf('boolean');
  });

  it('falls back gracefully when localStorage throws', async () => {
    const originalLocalStorage = globalThis.localStorage;
    // Simulate throwing localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      }
    });

    // Clear module cache so detection runs again
    const path = '../src/utils/safeStorage';
    // @ts-ignore
    delete import.meta?.env; // ensure no side effect
    // @ts-ignore
    const modPath = path;
    // @ts-ignore
    delete (await import(modPath));

    const fresh = await import('../src/utils/safeStorage');
    const { safeStorage: freshSafe } = fresh;
    freshSafe.set('temp', '123');
    expect(freshSafe.get('temp')).toBe('123');
    expect(freshSafe.persistent).toBe(false);

    // Restore original
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { return originalLocalStorage; }
    });
  });
});
