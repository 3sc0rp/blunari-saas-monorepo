// Critical React Polyfill - Injected before ALL other modules
// This MUST run before any vendor chunks to prevent createContext errors

(function() {
  'use strict';
  
  // Emergency React polyfill if React is not available
  if (typeof window !== 'undefined' && !window.React) {
    console.warn('⚠️ Emergency React polyfill activating...');
    
    // Minimal React mock to prevent crashes
    window.React = window.React || {
      createContext: function(defaultValue) {
        console.warn('🔧 Emergency createContext polyfill called');
        return {
          Provider: function({ children }) { return children; },
          Consumer: function({ children }) { return children(); },
          _currentValue: defaultValue,
          _defaultValue: defaultValue
        };
      },
      useState: function(initial) { return [initial, function() {}]; },
      useEffect: function() {},
      useLayoutEffect: function() {}, // CRITICAL: Missing hook causing vendor-safe error
      useContext: function(context) { return context._currentValue; },
      useCallback: function(fn) { return fn; },
      useMemo: function(fn) { return fn(); },
      useRef: function(initial) { return { current: initial }; },
      useReducer: function(reducer, initial) { return [initial, function() {}]; },
      useImperativeHandle: function() {},
      useDebugValue: function() {},
      useDeferredValue: function(value) { return value; },
      useTransition: function() { return [false, function() {}]; },
      useId: function() { return 'emergency-id-' + Math.random(); },
      forwardRef: function(fn) { return fn; },
      Fragment: function({ children }) { return children; },
      Component: function() {},
      PureComponent: function() {},
      memo: function(component) { return component; },
      createElement: function(type, props, ...children) {
        return { type, props: props || {}, children };
      },
      cloneElement: function(element) { return element; },
      version: '18.0.0-polyfill'
    };
    
    // Also set globally
    globalThis.React = window.React;
    
    console.log('🚨 Emergency React polyfill activated - real React should load soon');
  }
})();
