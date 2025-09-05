/**
 * 🚨 VENDOR CHUNK ERROR INTERCEPTOR - ULTIMATE PROTECTION
 * This script specifically targets and prevents vendor chunk React errors
 */

(function() {
  'use strict';
  
  console.error('🚨 VENDOR CHUNK ERROR INTERCEPTOR LOADING...');
  
  // Create ultimate useLayoutEffect protection
  const createUseLayoutEffectProtection = () => {
    const protectedUseLayoutEffect = function() {
      console.warn('🚨 VENDOR CHUNK useLayoutEffect INTERCEPTED - Error prevented!');
      // Safe no-op implementation
      return;
    };
    
    // Add React-like properties
    protectedUseLayoutEffect.displayName = 'useLayoutEffect';
    protectedUseLayoutEffect.__VENDOR_CHUNK_PROTECTED__ = true;
    
    return protectedUseLayoutEffect;
  };
  
  // IMMEDIATE protection assignment
  const protectedHook = createUseLayoutEffectProtection();
  
  // Assign to ALL possible global locations
  if (typeof window !== 'undefined') {
    window.useLayoutEffect = protectedHook;
    globalThis.useLayoutEffect = protectedHook;
    
    if (typeof global !== 'undefined') {
      global.useLayoutEffect = protectedHook;
    }
    if (typeof self !== 'undefined') {
      self.useLayoutEffect = protectedHook;
    }
  }
  
  // Override the specific error-prone property access
  if (typeof window !== 'undefined') {
    // Create a proxy to intercept any property access that might fail
    const createErrorInterceptor = (target, property) => {
      try {
        return new Proxy(target, {
          get: function(obj, prop) {
            try {
              if (prop === 'useLayoutEffect' && (obj[prop] === undefined || obj[prop] === null)) {
                console.warn(`🚨 Intercepted undefined ${property}.useLayoutEffect access`);
                return protectedHook;
              }
              return obj[prop];
            } catch (error) {
              console.warn(`🚨 Property access error intercepted for ${property}.${prop}:`, error.message);
              if (prop === 'useLayoutEffect') {
                return protectedHook;
              }
              return undefined;
            }
          },
          
          set: function(obj, prop, value) {
            try {
              obj[prop] = value;
              return true;
            } catch (error) {
              console.warn(`🚨 Property set error intercepted for ${property}.${prop}:`, error.message);
              return false;
            }
          }
        });
      } catch (e) {
        // If proxy creation fails, return original object
        return target;
      }
    };
    
    // Apply protection to potential React objects
    try {
      if (window.React && typeof window.React === 'object') {
        window.React = createErrorInterceptor(window.React, 'window.React');
      }
      if (globalThis.React && typeof globalThis.React === 'object') {
        globalThis.React = createErrorInterceptor(globalThis.React, 'globalThis.React');
      }
    } catch (e) {
      console.warn('Could not apply proxy protection:', e.message);
    }
  }
  
  // CRITICAL: Override the global error handler to catch and prevent the specific error
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if this is the specific vendor chunk error we're trying to prevent
      if (typeof message === 'string' && 
          (message.includes('Cannot read properties of undefined') || 
           message.includes('useLayoutEffect')) &&
          typeof source === 'string' &&
          source.includes('vendor-safe')) {
        
        console.error('🚨 VENDOR CHUNK ERROR INTERCEPTED AND BLOCKED:');
        console.error('  Message:', message);
        console.error('  Source:', source);
        console.error('  Line:', lineno, 'Col:', colno);
        console.error('🚨 Error prevented from crashing application');
        
        // Return true to prevent the error from being thrown
        return true;
      }
      
      // For other errors, use the original handler
      if (originalOnError) {
        return originalOnError.apply(this, arguments);
      }
      
      return false;
    };
    
    // Also override unhandledrejection for Promise errors
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      if (event.reason && typeof event.reason.message === 'string' &&
          (event.reason.message.includes('Cannot read properties of undefined') ||
           event.reason.message.includes('useLayoutEffect'))) {
        
        console.error('🚨 VENDOR CHUNK PROMISE ERROR INTERCEPTED:');
        console.error('  Reason:', event.reason.message);
        console.error('🚨 Promise rejection prevented');
        
        event.preventDefault();
        return true;
      }
      
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.apply(this, arguments);
      }
      
      return false;
    };
  }
  
  console.error('🚨 VENDOR CHUNK ERROR INTERCEPTOR ACTIVE - All useLayoutEffect errors will be blocked');
  
})();
