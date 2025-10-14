/**
 * Locks API Shim for Sandboxed Contexts
 * 
 * Prevents SecurityError when Supabase tries to use navigator.locks in restricted contexts.
 * Must be imported first in main.tsx before any Supabase initialization.
 */

// Check if we're in a context where Locks API is unavailable or will fail
const isLocksAPIUnavailable = (() => {
  try {
    // Test if we're in a sandboxed iframe
    if (window.self !== window.top) {
      return true;
    }
    
    // Test if Locks API is available and accessible
    if (typeof navigator === 'undefined' || !navigator.locks) {
      return true;
    }
    
    // Try a minimal test to see if we can actually use it
    // Some browsers report it exists but throw SecurityError on use
    return false;
  } catch (e) {
    return true;
  }
})();

if (isLocksAPIUnavailable) {
  // Completely disable Locks API to prevent Supabase from trying to use it
  if (typeof navigator !== 'undefined') {
    Object.defineProperty(navigator, 'locks', {
      get: () => undefined,
      configurable: true,
      enumerable: false
    });
  }
  
  console.info('[Blunari] Locks API disabled - running in restricted context');
}

export {};
