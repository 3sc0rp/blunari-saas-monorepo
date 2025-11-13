import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Web Vitals metrics tracking
 * Monitors Core Web Vitals: CLS, LCP, INP, TTFB, FCP
 * 
 * Thresholds (Google recommendations):
 * - LCP (Largest Contentful Paint): Good < 2.5s, Poor > 4s
 * - CLS (Cumulative Layout Shift): Good < 0.1, Poor > 0.25
 * - INP (Interaction to Next Paint): Good < 200ms, Poor > 500ms
 * - TTFB (Time to First Byte): Good < 800ms, Poor > 1800ms
 * - FCP (First Contentful Paint): Good < 1.8s, Poor > 3s
 * 
 * Note: FID (First Input Delay) deprecated in web-vitals v4, replaced by INP
 */

export interface WebVitalsMetric {
  name: 'CLS' | 'LCP' | 'TTFB' | 'INP' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

interface WebVitalsOptions {
  enabled?: boolean;
  debug?: boolean;
  reportToConsole?: boolean;
  reportToAnalytics?: boolean;
  sampleRate?: number; // 0-1, percentage of sessions to track
}

const DEFAULT_OPTIONS: WebVitalsOptions = {
  enabled: true,
  debug: false,
  reportToConsole: import.meta.env.DEV,
  reportToAnalytics: import.meta.env.PROD,
  sampleRate: 1.0, // Track 100% in production
};

/**
 * Get rating based on metric thresholds
 */
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  switch (name) {
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    default:
      return 'needs-improvement';
  }
};

/**
 * Format metric value for display
 */
const formatValue = (name: string, value: number): string => {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
};

/**
 * Send metric to analytics/logging service
 */
const sendToAnalytics = async (metric: WebVitalsMetric, route: string) => {
  try {
    // In production, send to your analytics service
    // For now, we'll use console in dev mode
    if (import.meta.env.DEV) {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: formatValue(metric.name, metric.value),
        rating: metric.rating,
        route,
        navigationType: metric.navigationType,
      });
    }

    // In production, you could send to Supabase or another service:
    /*
    await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...metric, route }),
    });
    */
  } catch (error) {
    console.error('[Web Vitals] Failed to send metric:', error);
  }
};

/**
 * Hook to track Web Vitals metrics
 */
export const useWebVitals = (options: WebVitalsOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const location = useLocation();
  const metricsRef = useRef<Map<string, WebVitalsMetric>>(new Map());
  const hasTrackedRef = useRef(false);

  const handleMetric = useCallback(
    (metric: WebVitalsMetric) => {
      // Sample rate check
      if (Math.random() > opts.sampleRate!) return;

      metricsRef.current.set(metric.name, metric);

      if (opts.reportToConsole) {
        console.log(
          `[Web Vitals] ${metric.name}: ${formatValue(metric.name, metric.value)} (${metric.rating})`,
          metric
        );
      }

      if (opts.reportToAnalytics) {
        sendToAnalytics(metric, location.pathname);
      }
    },
    [opts.reportToConsole, opts.reportToAnalytics, opts.sampleRate, location.pathname]
  );

  useEffect(() => {
    if (!opts.enabled || hasTrackedRef.current) return;

    // Dynamically import web-vitals library
    import('web-vitals').then((webVitalsModule) => {
      const { onCLS, onLCP, onTTFB, onINP, onFCP } = webVitalsModule;
      
      // Track all Core Web Vitals (FID removed in web-vitals v4, replaced by INP)
      onCLS((metric: any) => handleMetric(metric as WebVitalsMetric));
      onLCP((metric: any) => handleMetric(metric as WebVitalsMetric));
      onTTFB((metric: any) => handleMetric(metric as WebVitalsMetric));
      onINP((metric: any) => handleMetric(metric as WebVitalsMetric));
      onFCP((metric: any) => handleMetric(metric as WebVitalsMetric));

      hasTrackedRef.current = true;

      if (opts.debug) {
        console.log('[Web Vitals] Tracking initialized for:', location.pathname);
      }
    }).catch((error) => {
      console.error('[Web Vitals] Failed to load web-vitals library:', error);
    });
  }, [opts.enabled, opts.debug, location.pathname, handleMetric]);

  return {
    metrics: metricsRef.current,
    getMetric: (name: string) => metricsRef.current.get(name),
    getAllMetrics: () => Array.from(metricsRef.current.values()),
  };
};

/**
 * Get Web Vitals summary for current page
 */
export const getWebVitalsSummary = (metrics: Map<string, WebVitalsMetric>) => {
  const summary = {
    overall: 'good' as 'good' | 'needs-improvement' | 'poor',
    metrics: {} as Record<string, { value: string; rating: string }>,
    score: 0,
  };

  let goodCount = 0;
  let poorCount = 0;
  const totalMetrics = metrics.size;

  metrics.forEach((metric) => {
    summary.metrics[metric.name] = {
      value: formatValue(metric.name, metric.value),
      rating: metric.rating,
    };

    if (metric.rating === 'good') goodCount++;
    if (metric.rating === 'poor') poorCount++;
  });

  // Calculate overall score (0-100)
  if (totalMetrics > 0) {
    summary.score = Math.round((goodCount / totalMetrics) * 100);
    
    if (poorCount > 0) {
      summary.overall = 'poor';
    } else if (goodCount === totalMetrics) {
      summary.overall = 'good';
    } else {
      summary.overall = 'needs-improvement';
    }
  }

  return summary;
};
