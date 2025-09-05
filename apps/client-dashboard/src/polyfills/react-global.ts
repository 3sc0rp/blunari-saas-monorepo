// React Global Polyfill - Load before everything else
// This ensures React is available globally before any vendor chunks load

import React from 'react';

// Production-safe React global assignment
const setupReactGlobally = () => {
  // Ensure we don't override an existing React instance
  if (typeof window !== 'undefined') {
    const w = window as unknown as { React?: typeof React };
    if (!w.React) {
      w.React = React;
    }
  }
  
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as unknown as { React?: typeof React };
    if (!g.React) {
      g.React = React;
    }
  }

  // Always ensure the current React instance is available
  const reactInstance = (
    typeof window !== 'undefined' && (window as unknown as { React?: typeof React }).React
  ) || (
    typeof globalThis !== 'undefined' && (globalThis as unknown as { React?: typeof React }).React
  ) || React;

  // Polyfill commonly accessed React methods with safety checks
  if (reactInstance && typeof reactInstance.createContext !== 'function') {
    reactInstance.createContext = React.createContext;
  }
  if (reactInstance && typeof reactInstance.useState !== 'function') {
    reactInstance.useState = React.useState;
  }
  if (reactInstance && typeof reactInstance.useEffect !== 'function') {
    reactInstance.useEffect = React.useEffect;
  }
  if (reactInstance && typeof reactInstance.useLayoutEffect !== 'function') {
    reactInstance.useLayoutEffect = React.useLayoutEffect;
  }
  if (reactInstance && typeof reactInstance.useContext !== 'function') {
    reactInstance.useContext = React.useContext;
  }
  if (reactInstance && typeof reactInstance.useCallback !== 'function') {
    reactInstance.useCallback = React.useCallback;
  }
  if (reactInstance && typeof reactInstance.useMemo !== 'function') {
    reactInstance.useMemo = React.useMemo;
  }
  if (reactInstance && typeof reactInstance.useRef !== 'function') {
    reactInstance.useRef = React.useRef;
  }
  if (reactInstance && typeof reactInstance.useReducer !== 'function') {
    reactInstance.useReducer = React.useReducer;
  }
  if (reactInstance && typeof reactInstance.forwardRef !== 'function') {
    reactInstance.forwardRef = React.forwardRef;
  }

  // Final safety assignment
  if (typeof window !== 'undefined') {
    (window as unknown as { React?: typeof React }).React = reactInstance;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as unknown as { React?: typeof React }).React = reactInstance;
  }
  
  return reactInstance;
};

// Execute immediately
const reactGlobal = setupReactGlobally();

// Mark polyfill as loaded
if (typeof window !== 'undefined') {
  window.__REACT_POLYFILL_LOADED__ = true;
}

export default reactGlobal;
