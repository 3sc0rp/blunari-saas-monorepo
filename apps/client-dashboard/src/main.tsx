import './locksApiShim'; // must be absolutely first to disable Locks API in sandboxed contexts
import './sandboxStorageShim'; // must be first to patch storage in sandbox
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '@/monitoring/sentry';
// Optional: configure custom error analytics endpoint (no-op if unset)
;(window as any).__ERROR_ANALYTICS_ENDPOINT__ = import.meta.env.VITE_ERROR_ANALYTICS_ENDPOINT || '';
import './index.css';
import { registerServiceWorker } from '@/utils/serviceWorkerRegistration';
import { initializePerformanceOptimizations } from '@/utils/performanceOptimizations';

// Initialize performance optimizations immediately
initializePerformanceOptimizations();

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
           
          console.warn('[Suppressed Sandbox Storage Error]', msg, 'count=', g.suppressedStorageErrors);
        }
        return; // swallow
      }
       
      console.error('[GlobalError]', {
        message: msg,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.stack || e.error
      });
    });
    window.addEventListener('unhandledrejection', (e) => {
       
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

// Optimized loading fallback
const AppLoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '64px',
        height: '64px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }} />
      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
        Loading Blunari...
      </div>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

root.render(
  <React.StrictMode>
    <Suspense fallback={<AppLoadingFallback />}>
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
