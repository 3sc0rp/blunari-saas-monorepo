// Locks API shim for sandboxed iframe contexts
// If navigator.locks.request throws a SecurityError, replace it with a no-op
// that immediately executes the callback. This prevents third-party libs from
// crashing in environments where the Web Locks API is unavailable or denied.
(function applyLocksShim() {
  try {
    const nav: any = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (!nav || !nav.locks) return;
    if ((window as any).__locksShimApplied__) return;
    const original = nav.locks.request?.bind(nav.locks);
    // Replace request with safe fallback that never throws
    nav.locks.request = function(requestName: any, optionsOrCallback?: any, maybeCallback?: any) {
      try {
        if (original) {
          // Attempt the real call; if the UA denies, it will throw/reject
          const p = original(requestName as any, optionsOrCallback as any, maybeCallback as any);
          // Guard rejections to avoid unhandled promise rejection noise
          return Promise.resolve(p).catch(() => {
            const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
            if (typeof cb === 'function') {
              return cb({ name: typeof requestName === 'string' ? requestName : 'shim', mode: 'exclusive', released: false, release: () => {} });
            }
            return undefined;
          });
        }
      } catch {
        // fall through to shim
      }
      const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
      if (typeof cb === 'function') {
        return Promise.resolve(cb({ name: typeof requestName === 'string' ? requestName : 'shim', mode: 'exclusive', released: false, release: () => {} }));
      }
      return Promise.resolve(undefined);
    };
    (window as any).__locksShimApplied__ = true;
  } catch {
    // ignore
  }
})();


