import './sandboxStorageShim'; // must be first to patch storage in sandbox
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '@/monitoring/sentry';
// Optional: configure custom error analytics endpoint (no-op if unset)
;(window as any).__ERROR_ANALYTICS_ENDPOINT__ = import.meta.env.VITE_ERROR_ANALYTICS_ENDPOINT || '';
import './index.css';
import { registerServiceWorker } from '@/utils/serviceWorkerRegistration';

// Temporary runtime instrumentation for diagnosing generic errors
if (typeof window !== 'undefined') {
  // Avoid duplicate registration (HMR)
  if (!(window as any).__GLOBAL_ERROR_PATCHED__) {
    (window as any).__GLOBAL_ERROR_PATCHED__ = true;
    window.addEventListener('error', (e) => {
      const msg = e.message || '';
      // Suppress noisy sandboxed localStorage SecurityErrors (expected when iframe lacks allow-same-origin)
      if (/Failed to read the 'localStorage' property/.test(msg)) {
        const g = (window as any).__blunariMetrics = (window as any).__blunariMetrics || { suppressedStorageErrors: 0 };
        g.suppressedStorageErrors++;
        if (import.meta.env.VITE_ANALYTICS_DEBUG === '1') {
          // eslint-disable-next-line no-console
          console.warn('[Suppressed Sandbox Storage Error]', msg, 'count=', g.suppressedStorageErrors);
        }
        return; // swallow
      }
      // eslint-disable-next-line no-console
      console.error('[GlobalError]', {
        message: msg,
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

// Register service worker for offline support and caching
if (import.meta.env.PROD) {
  registerServiceWorker().catch((error) => {
    console.warn('Service worker registration failed:', error);
  });
}
