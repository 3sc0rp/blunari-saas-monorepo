import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '@/monitoring/sentry';
import './index.css';

// Temporary runtime instrumentation for diagnosing generic errors
if (typeof window !== 'undefined') {
  // Avoid duplicate registration (HMR)
  if (!(window as any).__GLOBAL_ERROR_PATCHED__) {
    (window as any).__GLOBAL_ERROR_PATCHED__ = true;
    window.addEventListener('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('[GlobalError]', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.stack || e.error
      });
    });
    window.addEventListener('unhandledrejection', (e) => {
      // eslint-disable-next-line no-console
      console.error('[UnhandledRejection]', {
        reason: (e as any).reason?.stack || (e as any).reason
      });
    });
  }
}

// Lazy load the main App component for better initial bundle size
const App = React.lazy(() => import('./App'));

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);
