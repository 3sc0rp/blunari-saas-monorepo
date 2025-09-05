// ULTRA-AGGRESSIVE React Polyfill - Injected before ALL other modules
// This MUST run before any vendor chunks to prevent ALL React undefined errors

(function() {
  'use strict';
  
  // ULTRA-COMPREHENSIVE React polyfill if React is not available
  if (typeof window !== 'undefined' && !window.React) {
    console.warn('🔥 ULTRA-AGGRESSIVE React polyfill activating...');
    
    // COMPLETE React mock to prevent ALL crashes
    window.React = window.React || {
      createContext: function(defaultValue) {
        console.warn('🔧 Emergency createContext polyfill called');
        return {
          Provider: function({ children, value }) { return children; },
          Consumer: function({ children }) { return children(defaultValue); },
          _currentValue: defaultValue,
          _defaultValue: defaultValue
        };
      },
      useState: function(initial) { return [initial, function() {}]; },
      useEffect: function() {},
      useLayoutEffect: function() {}, // CRITICAL: Was missing - causing vendor-safe errors
      useContext: function(context) { return context ? context._currentValue : null; },
      useCallback: function(fn) { return fn || function() {}; },
      useMemo: function(fn) { return fn ? fn() : null; },
      useRef: function(initial) { return { current: initial }; },
      useReducer: function(reducer, initial) { return [initial, function() {}]; },
      useImperativeHandle: function() {},
      useDebugValue: function() {},
      useDeferredValue: function(value) { return value; },
      useTransition: function() { return [false, function() {}]; },
      useId: function() { return 'emergency-id-' + Math.random().toString(36); },
      useSyncExternalStore: function(subscribe, getSnapshot) { return getSnapshot ? getSnapshot() : null; },
      useInsertionEffect: function() {},
      forwardRef: function(fn) { return fn || function() {}; },
      Fragment: function({ children }) { return children; },
      Component: function() {},
      PureComponent: function() {},
      memo: function(component) { return component || function() {}; },
      createElement: function(type, props, ...children) {
        return { type, props: props || {}, children };
      },
      cloneElement: function(element) { return element || {}; },
      isValidElement: function() { return true; },
      Children: {
        map: function(children, fn) { return children ? [].concat(children).map(fn || function(x) { return x; }) : []; },
        forEach: function(children, fn) { if (children && fn) [].concat(children).forEach(fn); },
        count: function(children) { return children ? [].concat(children).length : 0; },
        only: function(child) { return child; },
        toArray: function(children) { return children ? [].concat(children) : []; }
      },
      version: '18.0.0-ultra-emergency-polyfill'
    };
    
    // FORCE React on ALL possible global scopes
    globalThis.React = window.React;
    
    // Additional global assignments for maximum compatibility
    if (typeof global !== 'undefined') global.React = window.React;
    if (typeof self !== 'undefined') self.React = window.React;
    
    console.log('� ULTRA-AGGRESSIVE React polyfill activated - ALL vendor chunks protected');
  }
})();
