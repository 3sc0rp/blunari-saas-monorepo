import './sandboxStorageShim';
import './locksShim';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchPublicBranding } from './public-branding';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import CateringWidget from '@/components/catering/CateringWidget';
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

  // Apply theme and color overrides from query params (driven by Widget Management)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme');
    const primary = params.get('primaryColor');
    const secondary = params.get('secondaryColor');
    const bg = params.get('backgroundColor');
    const text = params.get('textColor');

    const root = document.documentElement;

    // Apply theme
    if (theme === 'light' || theme === 'dark' || theme === 'auto') {
      const effective = theme === 'auto' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
      root.setAttribute('data-theme', effective);
      if (effective === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    }

    function hexToHslTriplet(hex?: string | null): string | null {
      if (!hex) return null;
      let c = hex.trim();
      if (c.startsWith('#')) c = c.slice(1);
      if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
      if (c.length !== 6) return null;
      const r = parseInt(c.slice(0, 2), 16) / 255;
      const g = parseInt(c.slice(2, 4), 16) / 255;
      const b = parseInt(c.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      const hh = Math.round(h * 360);
      const ss = Math.round(s * 100);
      const ll = Math.round(l * 100);
      return `${hh} ${ss}% ${ll}%`;
    }

    const brandHsl = hexToHslTriplet(primary);
    if (brandHsl) root.style.setProperty('--brand', brandHsl);
    const accentHsl = hexToHslTriplet(secondary);
    if (accentHsl) root.style.setProperty('--accent', accentHsl);
    const bgHsl = hexToHslTriplet(bg);
    if (bgHsl) root.style.setProperty('--surface', bgHsl);
    const textHsl = hexToHslTriplet(text);
    if (textHsl) root.style.setProperty('--text', textHsl);
  }, []);

  // Parent postMessage handshake + resize events
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParent = params.get('parent_origin') || '';
    let parentOrigin = '';
    try { if (rawParent) parentOrigin = new URL(rawParent).origin; } catch {}
    // Fallback to document.referrer origin if provided and valid (safer than '*')
    if (!parentOrigin && document.referrer) {
      try { parentOrigin = new URL(document.referrer).origin; } catch {}
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
          // Send to parent (embed case)
          try { window.parent && window.parent.postMessage(payload, parentOrigin || '*'); } catch {}
          // Also send to self (test/top-level case)
          try { window.postMessage(payload, parentOrigin || '*'); } catch {}
        } catch {}
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
          window.parent && window.parent.postMessage({ type: 'widget_resize', widgetId: widgetIdRef.current, height: h, correlationId }, parentOrigin || '*');
        }
      } catch {}
    };

    const ro = (window as any).ResizeObserver ? new ResizeObserver(sendResize) : null;
    if (ro) {
      try { ro.observe(document.documentElement); } catch {}
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
      setTimeout(() => { try { window.postMessage(payload, '*'); } catch {} }, 120);
    } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/public-widget/book/:slug" element={<BookingPage />} />
              <Route path="/public-widget/catering/:slug" element={<CateringWidgetRoute />} />
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

function CateringWidgetRoute() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '';
  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">Missing restaurant identifier.</div>
      </div>
    );
  }
  return <CateringWidget slug={slug} />;
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
