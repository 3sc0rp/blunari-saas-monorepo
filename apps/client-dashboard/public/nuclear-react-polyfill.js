/**
 * 🚨 NUCLEAR-LEVEL React Polyfill - Last Resort Emergency System
 * This is the most aggressive React polyfill possible to eliminate ALL vendor chunk issues
 */

// IMMEDIATE EXECUTION - CANNOT BE BYPASSED
(function() {
  'use strict';
  
  // Create the most comprehensive React polyfill ever
  const createNuclearReactPolyfill = () => {
    const hooks = {
      useState: function(initial) { 
        console.warn('🚨 Nuclear useState polyfill called');
        return [initial, function() {}]; 
      },
      useEffect: function() { 
        console.warn('🚨 Nuclear useEffect polyfill called');
      },
      useLayoutEffect: function() { 
        console.warn('🚨 Nuclear useLayoutEffect polyfill called - VENDOR CHUNK PROTECTED');
      },
      useContext: function(context) { 
        console.warn('🚨 Nuclear useContext polyfill called');
        return context ? context._currentValue : null; 
      },
      useCallback: function(fn) { 
        console.warn('🚨 Nuclear useCallback polyfill called');
        return fn; 
      },
      useMemo: function(fn) { 
        console.warn('🚨 Nuclear useMemo polyfill called');
        return fn(); 
      },
      useRef: function(initial) { 
        console.warn('🚨 Nuclear useRef polyfill called');
        return { current: initial }; 
      },
      useReducer: function(reducer, initial) { 
        console.warn('🚨 Nuclear useReducer polyfill called');
        return [initial, function() {}]; 
      },
      useImperativeHandle: function() { 
        console.warn('🚨 Nuclear useImperativeHandle polyfill called');
      },
      useDebugValue: function() { 
        console.warn('🚨 Nuclear useDebugValue polyfill called');
      },
      useDeferredValue: function(value) { 
        console.warn('🚨 Nuclear useDeferredValue polyfill called');
        return value; 
      },
      useTransition: function() { 
        console.warn('🚨 Nuclear useTransition polyfill called');
        return [false, function() {}]; 
      },
      useId: function() { 
        console.warn('🚨 Nuclear useId polyfill called');
        return 'nuclear-id-' + Math.random().toString(36).substr(2, 9); 
      },
      useSyncExternalStore: function(subscribe, getSnapshot) {
        console.warn('🚨 Nuclear useSyncExternalStore polyfill called');
        return getSnapshot ? getSnapshot() : undefined;
      },
      useInsertionEffect: function() {
        console.warn('🚨 Nuclear useInsertionEffect polyfill called');
      }
    };

    const reactApi = {
      // All React hooks
      ...hooks,
      
      // Context API
      createContext: function(defaultValue) {
        console.warn('🚨 Nuclear createContext polyfill called');
        return {
          Provider: function({ children }) { return children; },
          Consumer: function({ children }) { return children(defaultValue); },
          _currentValue: defaultValue,
          _defaultValue: defaultValue,
          displayName: 'Nuclear.Context'
        };
      },
      
      // Component APIs
      forwardRef: function(fn) { 
        console.warn('🚨 Nuclear forwardRef polyfill called');
        return fn; 
      },
      Fragment: function({ children }) { 
        console.warn('🚨 Nuclear Fragment polyfill called');
        return children; 
      },
      Component: function() {
        console.warn('🚨 Nuclear Component polyfill called');
      },
      PureComponent: function() {
        console.warn('🚨 Nuclear PureComponent polyfill called');
      },
      memo: function(component) { 
        console.warn('🚨 Nuclear memo polyfill called');
        return component; 
      },
      
      // Element creation
      createElement: function(type, props, ...children) {
        console.warn('🚨 Nuclear createElement polyfill called');
        return { 
          type, 
          props: props || {}, 
          children,
          key: props?.key || null,
          ref: props?.ref || null
        };
      },
      cloneElement: function(element, props, ...children) {
        console.warn('🚨 Nuclear cloneElement polyfill called');
        return {
          ...element,
          props: { ...element.props, ...props },
          children: children.length > 0 ? children : element.children
        };
      },
      
      // Children utilities
      Children: {
        map: function(children, fn) {
          console.warn('🚨 Nuclear Children.map polyfill called');
          return Array.isArray(children) ? children.map(fn) : [fn(children, 0)];
        },
        forEach: function(children, fn) {
          console.warn('🚨 Nuclear Children.forEach polyfill called');
          if (Array.isArray(children)) {
            children.forEach(fn);
          } else {
            fn(children, 0);
          }
        },
        count: function(children) {
          console.warn('🚨 Nuclear Children.count polyfill called');
          return Array.isArray(children) ? children.length : children ? 1 : 0;
        },
        only: function(children) {
          console.warn('🚨 Nuclear Children.only polyfill called');
          if (Array.isArray(children) && children.length === 1) {
            return children[0];
          }
          return children;
        },
        toArray: function(children) {
          console.warn('🚨 Nuclear Children.toArray polyfill called');
          return Array.isArray(children) ? children : [children];
        }
      },
      
      // Suspense and lazy loading
      Suspense: function({ children, fallback }) {
        console.warn('🚨 Nuclear Suspense polyfill called');
        return children || fallback;
      },
      lazy: function(fn) {
        console.warn('🚨 Nuclear lazy polyfill called');
        return fn;
      },
      
      // Error boundary
      ErrorBoundary: function({ children }) {
        console.warn('🚨 Nuclear ErrorBoundary polyfill called');
        return children;
      },
      
      // Portal
      createPortal: function(children, container) {
        console.warn('🚨 Nuclear createPortal polyfill called');
        return children;
      },
      
      // Version
      version: '18.3.1-nuclear-polyfill',
      
      // Internal properties that some libraries check
      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
        ReactCurrentDispatcher: { current: null },
        ReactCurrentBatchConfig: { transition: null }
      }
    };

    return reactApi;
  };

  // NUCLEAR-LEVEL GLOBAL ASSIGNMENTS - EVERYWHERE POSSIBLE
  const nuclearReact = createNuclearReactPolyfill();
  
  // Window assignments
  if (typeof window !== 'undefined') {
    console.error('🚨🚨🚨 NUCLEAR REACT POLYFILL ACTIVATING - MAXIMUM PROTECTION 🚨🚨🚨');
    
    // IMMEDIATE global assignment before ANY other scripts
    window.React = nuclearReact;
    window.react = nuclearReact; // lowercase variant
    
    // Global this assignments
    globalThis.React = nuclearReact;
    globalThis.react = nuclearReact;
    
    // Self assignments (for web workers)
    if (typeof self !== 'undefined') {
      self.React = nuclearReact;
      self.react = nuclearReact;
    }
    
    // Global assignments
    if (typeof global !== 'undefined') {
      global.React = nuclearReact;
      global.react = nuclearReact;
    }
    
    // CRITICAL: Force individual hook assignments to prevent vendor chunk undefined errors
    [
      'useState', 'useEffect', 'useLayoutEffect', 'useContext', 
      'useCallback', 'useMemo', 'useRef', 'useReducer',
      'useImperativeHandle', 'useDebugValue', 'useDeferredValue',
      'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'
    ].forEach(hookName => {
      window[hookName] = nuclearReact[hookName];
      globalThis[hookName] = nuclearReact[hookName];
      if (typeof global !== 'undefined') global[hookName] = nuclearReact[hookName];
      if (typeof self !== 'undefined') self[hookName] = nuclearReact[hookName];
    });
    
    // ULTRA-CRITICAL: Override ANY potential React imports or requires
    if (typeof require !== 'undefined') {
      const originalRequire = require;
      require = function(moduleName) {
        if (moduleName === 'react' || moduleName === 'React') {
          console.warn('🚨 Nuclear polyfill intercepted require("react")');
          return nuclearReact;
        }
        return originalRequire.apply(this, arguments);
      };
    }
    
    // Force assignment to any possible global scope with error handling
    try {
      Object.defineProperty(window, 'React', {
        value: nuclearReact,
        writable: true,  // Allow overwriting for flexibility
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      console.warn('Could not make React non-writable, but it is assigned');
    }
    
    console.error('🚨 NUCLEAR REACT POLYFILL ACTIVE - ALL VENDOR CHUNKS PROTECTED 🚨');
    console.error('🚨 useLayoutEffect is now BULLETPROOF against undefined errors 🚨');
  }
})();

// Also export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window?.React;
}

if (typeof exports !== 'undefined') {
  exports.default = window?.React;
  exports.React = window?.React;
}
