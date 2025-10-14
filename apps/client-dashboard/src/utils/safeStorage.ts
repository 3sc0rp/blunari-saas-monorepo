/**
 * safeStorage: abstraction over localStorage that degrades gracefully when
 * sandboxed (no allow-same-origin) or when access throws SecurityError.
 */
export interface SafeStorageLike {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  /** true if backed by real persistent storage */
  persistent: boolean;
}

let cached: SafeStorageLike | null = null;

function createInMemory(): SafeStorageLike {
  const mem = new Map<string, string>();
  return {
    get: k => mem.get(k) ?? null,
    set: (k, v) => { mem.set(k, v); },
    remove: k => { mem.delete(k); },
    clear: () => { mem.clear(); },
    persistent: false
  };
}

export const safeStorage: SafeStorageLike = (() => {
  if (cached) return cached;
  // Heuristic:
      if (inside sandboxed iframe (cross-origin), localStorage may throw
  let isSandboxed = false;
  try {
    // Accessing top may throw in sandbox; treat that as sandboxed indicator
    // eslint-disable-next-line no-self-compare
      if (window.top !== window.self) {
      // Try simple read test
      const testKey = '__ss_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      cached = {
        get: k => window.localStorage.getItem(k),
        set: (k, v) => window.localStorage.setItem(k, v),
        remove: k => window.localStorage.removeItem(k),
        clear: () => window.localStorage.clear(),
        persistent: true
      };
      return cached;
    }
  } catch {
    isSandboxed = true;
  }

  if (isSandboxed) {
    cached = createInMemory();
    return cached;
  }

  // Non-iframe or same-origin allowed: still probe safely
  try {
    const testKey = '__ss_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    cached = {
      get: k => window.localStorage.getItem(k),
      set: (k, v) => window.localStorage.setItem(k, v),
      remove: k => window.localStorage.removeItem(k),
      clear: () => window.localStorage.clear(),
      persistent: true
    };
  } catch {
    cached = createInMemory();
  }
  return cached!;
})();

export const inSandboxedIframe = (() => {
  try {
    if (window.top === window.self) return false;
  } catch { return true; }
  // Additional hint: preview or embed query parameter
      return /[?&](preview|embed)=1/.test(window.location.search);
})();


