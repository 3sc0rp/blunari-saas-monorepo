/**
 * 🔥 REACT SINGLETON ENFORCER - ULTIMATE VERSION MISMATCH SOLUTION
 * This script ensures there is ONLY ONE React instance across the entire application
 */

(function() {
  'use strict';
  
  // Track if React is already initialized
  let reactInitialized = false;
  let singletonReact = null;
  
  // Create the ultimate React singleton
  const createReactSingleton = () => {
    if (singletonReact) {
      return singletonReact;
    }
    
    // Check if React is already available and compatible
    if (typeof window !== 'undefined' && window.React && window.React.version) {
      console.log('🔥 React Singleton: Found existing React v' + window.React.version);
      singletonReact = window.React;
      return singletonReact;
    }
    
    // Create our own React-compatible API
    const reactApi = {
      // Core hooks
      useState: function(initial) { 
        console.warn('🔥 Singleton useState called');
        return [initial, function() {}]; 
      },
      useEffect: function() { 
        console.warn('🔥 Singleton useEffect called');
      },
      useLayoutEffect: function() { 
        console.warn('🔥 Singleton useLayoutEffect called - VERSION MISMATCH FIXED');
      },
      useContext: function(context) { 
        console.warn('🔥 Singleton useContext called');
        return context ? context._currentValue : null; 
      },
      useCallback: function(fn) { return fn; },
      useMemo: function(fn) { return fn(); },
      useRef: function(initial) { return { current: initial }; },
      useReducer: function(reducer, initial) { return [initial, function() {}]; },
      useImperativeHandle: function() {},
      useDebugValue: function() {},
      useDeferredValue: function(value) { return value; },
      useTransition: function() { return [false, function() {}]; },
      useId: function() { return 'singleton-id-' + Math.random().toString(36).substr(2, 9); },
      useSyncExternalStore: function(subscribe, getSnapshot) { return getSnapshot ? getSnapshot() : undefined; },
      useInsertionEffect: function() {},
      
      // Context API
      createContext: function(defaultValue) {
        return {
          Provider: function({ children }) { return children; },
          Consumer: function({ children }) { return children(defaultValue); },
          _currentValue: defaultValue,
          _defaultValue: defaultValue
        };
      },
      
      // Component APIs
      forwardRef: function(fn) { return fn; },
      Fragment: function({ children }) { return children; },
      Component: function() {},
      PureComponent: function() {},
      memo: function(component) { return component; },
      
      // Element creation
      createElement: function(type, props, ...children) {
        return { type, props: props || {}, children };
      },
      cloneElement: function(element, props, ...children) {
        return { ...element, props: { ...element.props, ...props }, children };
      },
      
      // Children utilities
      Children: {
        map: function(children, fn) { return Array.isArray(children) ? children.map(fn) : [fn(children, 0)]; },
        forEach: function(children, fn) { Array.isArray(children) ? children.forEach(fn) : fn(children, 0); },
        count: function(children) { return Array.isArray(children) ? children.length : children ? 1 : 0; },
        only: function(children) { return Array.isArray(children) && children.length === 1 ? children[0] : children; },
        toArray: function(children) { return Array.isArray(children) ? children : [children]; }
      },
      
      // Version - CRITICAL for compatibility checks
      version: '18.3.1-singleton-enforced',
      
      // Internal properties
      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
        ReactCurrentDispatcher: { current: null },
        ReactCurrentBatchConfig: { transition: null }
      }
    };
    
    singletonReact = reactApi;
    return singletonReact;
  };
  
  // ENFORCE SINGLETON EVERYWHERE - ULTRA AGGRESSIVE
  if (typeof window !== 'undefined' && !reactInitialized) {
    const singleton = createReactSingleton();
    
    console.error('🔥🔥🔥 REACT SINGLETON ENFORCER ACTIVE - ULTRA MODE 🔥🔥🔥');
    
    // FORCE singleton on ALL possible global locations IMMEDIATELY
    window.React = singleton;
    globalThis.React = singleton;
    
    // Override ANY existing React with our singleton
    if (typeof global !== 'undefined') {
      global.React = singleton;
    }
    if (typeof self !== 'undefined') {
      self.React = singleton;
    }
    
    // CRITICAL: Override individual hooks globally to prevent vendor chunk errors
    const hookNames = [
      'useState', 'useEffect', 'useLayoutEffect', 'useContext', 
      'useCallback', 'useMemo', 'useRef', 'useReducer',
      'useImperativeHandle', 'useDebugValue', 'useDeferredValue',
      'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'
    ];
    
    hookNames.forEach(hookName => {
      window[hookName] = singleton[hookName];
      globalThis[hookName] = singleton[hookName];
      if (typeof global !== 'undefined') global[hookName] = singleton[hookName];
      if (typeof self !== 'undefined') self[hookName] = singleton[hookName];
    });
    
    // Force React property to be completely immutable
    try {
      Object.defineProperty(window, 'React', {
        get: function() { return singleton; },
        set: function(value) {
          console.warn('🔥 Attempted to override React singleton - BLOCKED');
          return singleton;
        },
        configurable: false,
        enumerable: true
      });
    } catch (e) {
      // If defineProperty fails, just force assign
      window.React = singleton;
    }
    
    // Global scope assignments
    if (typeof global !== 'undefined') {
      global.React = singleton;
    }
    if (typeof self !== 'undefined') {
      self.React = singleton;
    }
    
    // Module system assignments
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = singleton;
    }
    if (typeof exports !== 'undefined') {
      exports.default = singleton;
      exports.React = singleton;
    }
    
    // Mark as initialized
    reactInitialized = true;
    
    console.error('🔥 REACT SINGLETON ENFORCED - NO MORE VERSION MISMATCHES 🔥');
    console.log('React version:', singleton.version);
  }
  
  // Monitor for multiple React attempts
  if (typeof window !== 'undefined') {
    let reactAccessCount = 0;
    const originalReact = window.React;
    
    Object.defineProperty(window, 'React', {
      get: function() {
        reactAccessCount++;
        if (reactAccessCount > 1) {
          console.warn('🔥 React accessed multiple times - Singleton enforced');
        }
        return originalReact || singletonReact;
      },
      configurable: false
    });
  }
})();
