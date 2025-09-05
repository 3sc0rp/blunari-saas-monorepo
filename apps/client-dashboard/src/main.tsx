// Load React polyfill FIRST before anything else
import "./polyfills/react-global.ts";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initializePerformance } from "./utils/performance.ts";
import "./index.css";
import "./App.css";

// Ensure React is available globally for better compatibility
window.React = React;

// Additional polyfill for React context to ensure it's always available
if (!window.React || !window.React.createContext) {
  console.error('React.createContext is not available, forcing reload...');
  window.location.reload();
}

// Polyfill React in global scope for vendor libraries
globalThis.React = React;

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('=== Global Error Details ===');
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno);
  console.error('Column:', event.colno);
  console.error('Error object:', event.error);
  console.error('Stack trace:', event.error?.stack);
  console.error('=== End Error Details ===');
  
  // Don't prevent default to allow Vite's error overlay in development
  if (import.meta.env.PROD) {
    event.preventDefault();
  }
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('=== Unhandled Promise Rejection ===');
  console.error('Reason:', event.reason);
  console.error('Promise:', event.promise);
  if (event.reason?.stack) {
    console.error('Stack trace:', event.reason.stack);
  }
  console.error('=== End Promise Rejection ===');
  
  // Don't prevent default to allow Vite's error overlay in development
  if (import.meta.env.PROD) {
    event.preventDefault();
  }
});

// Initialize performance optimizations
try {
  initializePerformance();
  console.log('✅ Performance initialization successful');
} catch (error) {
  console.warn('⚠️ Performance initialization failed:', error);
}

const root = createRoot(document.getElementById("root")!);

try {
  root.render(<App />);
  console.log('✅ App rendering successful');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Fallback rendering
  root.render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>⚠️ App Rendering Error</h1>
      <p>The application failed to render properly.</p>
      <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {error.message}
      </pre>
    </div>
  );
}
