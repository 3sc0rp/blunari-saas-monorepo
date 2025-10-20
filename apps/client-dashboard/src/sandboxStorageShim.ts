// sandboxStorageShim.ts
// Purpose: Prevent uncaught SecurityErrors when a sandboxed iframe without allow-same-origin
// executes third-party (or early) code that touches window.localStorage before our safeStorage
// abstraction initializes. We detect inaccessible localStorage and replace global getters with
// an in-memory implementation that matches the Storage interface minimally.

(function initSandboxStorageShim(){
  if (typeof window === 'undefined') return;
  try {
    // Probe: some browsers throw synchronously when reading localStorage in sandbox.
    const testKey = '__blunari_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    // Accessible: nothing to do.
    return;
  } catch (e) {
    // Only patch once
    if ((window as any).__BLUNARI_STORAGE_SHIM__) return;
    (window as any).__BLUNARI_STORAGE_SHIM__ = true;
    const mem = new Map<string,string>();
    const memoryStorage: Storage = {
      get length(){ return mem.size; },
      clear(){ mem.clear(); },
      key(i:number){ return Array.from(mem.keys())[i] ?? null; },
      getItem(k:string){ return mem.has(k) ? mem.get(k)! : null; },
      setItem(k:string,v:string){ mem.set(k,String(v)); },
      removeItem(k:string){ mem.delete(k); }
    } as Storage;

    try {
      Object.defineProperty(window, 'localStorage', { configurable:true, get(){ return memoryStorage; }});
      Object.defineProperty(window, 'sessionStorage', { configurable:true, get(){ return memoryStorage; }});
      // Log only in explicit debug modes to avoid noisy console in production embeds
      try {
        const showDebug = /\b(debug|console)=verbose\b/i.test(window.location.search) || (window as any).__BLUNARI_DEBUG__ === true;
        if (showDebug && typeof console !== 'undefined') {
           
          console.debug('[Blunari sandboxStorageShim] Applied in-memory storage fallback (sandboxed iframe).');
        }
      } catch {
        // Intentional: Silently ignore debug logging failures in restricted environments
      }
    } catch (patchErr) {
      try {
        const showDebug = /\b(debug|console)=verbose\b/i.test(window.location.search) || (window as any).__BLUNARI_DEBUG__ === true;
        if (showDebug && typeof console !== 'undefined') {
           
          console.debug('[Blunari sandboxStorageShim] Failed to redefine storages:', patchErr);
        }
      } catch {
        // Intentional: Silently ignore debug logging failures in restricted environments
      }
    }
  }
})();
