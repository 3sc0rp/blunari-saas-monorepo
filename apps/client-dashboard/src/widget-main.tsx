import './sandboxStorageShim';
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
