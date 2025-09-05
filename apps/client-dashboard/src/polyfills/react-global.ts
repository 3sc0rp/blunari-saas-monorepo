// React Global Polyfill - Load before everything else
// This ensures React is available globally before any vendor chunks load

import React from 'react';

// Make React available globally immediately
window.React = React;
globalThis.React = React;

// Polyfill commonly accessed React methods
window.React.createContext = React.createContext;
window.React.useState = React.useState;
window.React.useEffect = React.useEffect;
window.React.useLayoutEffect = React.useLayoutEffect; // CRITICAL: Missing hook
window.React.useContext = React.useContext;
window.React.useCallback = React.useCallback;
window.React.useMemo = React.useMemo;
window.React.useRef = React.useRef;
window.React.useReducer = React.useReducer;
window.React.forwardRef = React.forwardRef;

// Ensure React is always available for dynamic imports
if (typeof globalThis.React === 'undefined') {
  globalThis.React = React;
}

// Mark polyfill as loaded
window.__REACT_POLYFILL_LOADED__ = true;

export default React;
