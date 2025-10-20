import './locksApiShim'; // must be absolutely first - disables Locks API in sandboxed contexts
import './sandboxStorageShim';
import './locksShim'; // fallback shim for any remaining locks usage
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchPublicBranding } from './public-branding';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import PerformanceMonitor from '@/components/PerformanceMonitor';

// Minimal, auth-free widget runtime. Only public booking/catering widgets.
// Routes: /public-widget/book/:slug and /public-widget/catering/:slug
// This entry excludes AuthProvider, TenantBrandingProvider, NavigationProvider to avoid login UI or tenant resolution overhead.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, retry: 1, refetchOnWindowFocus: false }
  }
});

function WidgetApp() {
  // Apply basic branding (primary/accent) as CSS vars when slug present
  React.useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/public-widget\/(?:book|catering)\/([^/]+)/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    let cancelled = false;
    fetchPublicBranding(slug).then(branding => {
      if (cancelled) return;
      const root = document.documentElement;
      if (branding.primaryColor) root.style.setProperty('--brand', branding.primaryColor);
      if (branding.accentColor) root.style.setProperty('--accent', branding.accentColor);
      if (branding.logoUrl) root.style.setProperty('--brand-logo-url', `url(${branding.logoUrl})`);
    });
    return () => { cancelled = true; };
  }, []);

  // Parent postMessage handshake + resize events
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-empty
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParent = params.get('parent_origin') || '';
    let parentOrigin = '';
    // Intentional empty catch for cross-origin URL parsing failures
    try { if (rawParent) parentOrigin = new URL(rawParent).origin; } catch { /* cross-origin safe */ }
    // Fallback to document.referrer origin if provided and valid (safer than '*')
    if (!parentOrigin && document.referrer) {
      try { parentOrigin = new URL(document.referrer).origin; } catch { /* cross-origin safe */ }
    }
    const correlationId = params.get('cid') || '';
    const widgetIdRef = { current: '' } as { current: string };

    function handleMessage(e: MessageEvent) {
      const sameWindow = e.source === window;
      const originOk = !parentOrigin
        || e.origin === parentOrigin
        || e.origin === window.location.origin
        || e.origin === 'null'
        || sameWindow;
      if (!originOk) return;
      const d = e.data as any;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'parent_ready') {
        widgetIdRef.current = d.widgetId || widgetIdRef.current;
        const cid = d.correlationId || correlationId;
        try {
          const payload = { type: 'widget_loaded', widgetId: widgetIdRef.current, correlationId: cid } as any;
          // Send to parent (embed case) - intentional empty catches for cross-origin postMessage
          try { 
            if (window.parent) {
              window.parent.postMessage(payload, parentOrigin || '*');
            }
          } catch { /* cross-origin safe */ }
          // Also send to self (test/top-level case)
          try { window.postMessage(payload, parentOrigin || '*'); } catch { /* cross-origin safe */ }
        } catch { /* cross-origin safe */ }
      }
    }

    window.addEventListener('message', handleMessage, false);

    // ResizeObserver to notify parent about height changes
    let lastHeight = -1;
    const sendResize = () => {
      try {
        const body = document.body;
        const doc = document.documentElement;
        const h = Math.max(body ? body.scrollHeight : 0, doc ? doc.scrollHeight : 0);
        if (h && h !== lastHeight) {
          lastHeight = h;
          if (window.parent) {
            window.parent.postMessage({ type: 'widget_resize', widgetId: widgetIdRef.current, height: h, correlationId }, parentOrigin || '*');
          }
        }
      } catch { /* cross-origin safe */ }
    };

    const ro = (window as any).ResizeObserver ? new ResizeObserver(sendResize) : null;
    if (ro) {
      try { ro.observe(document.documentElement); } catch { /* DOM safe */ }
    }
    const interval = window.setInterval(sendResize, 1000);
    window.addEventListener('load', sendResize);
    // Initial notify
    sendResize();

    return () => {
      window.removeEventListener('message', handleMessage, false);
      if (ro) ro.disconnect();
      window.clearInterval(interval);
      window.removeEventListener('load', sendResize);
    };
  }, []);

  // In embedded/test contexts, proactively emit a widget_loaded after mount so tests and
  // simple embeds can detect readiness even if parent_ready arrives late.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const correlationId = params.get('cid') || '';
      const payload = { type: 'widget_loaded', widgetId: '', correlationId } as any;
      setTimeout(() => { try { window.postMessage(payload, '*'); } catch { /* cross-origin safe */ } }, 120);
    } catch { /* cross-origin safe */ }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/public-widget/book/:slug" element={<BookingPage />} />
              <Route path="/public-widget/catering/:slug" element={<BookingPage />} />
            </Routes>
            <Toaster />
            <Sonner />
            <PerformanceMonitor />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const rootEl = document.getElementById('widget-root') || (() => {
  const el = document.createElement('div');
  el.id = 'widget-root';
  document.body.appendChild(el);
  return el;
})();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <WidgetApp />
  </React.StrictMode>
);
