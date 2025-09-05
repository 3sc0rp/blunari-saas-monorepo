import React from 'react';

declare global {
  interface Window {
    React: typeof React;
    __REACT_POLYFILL_LOADED__: boolean;
  }
}

export {};
