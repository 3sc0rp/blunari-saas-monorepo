import { useEffect } from 'react';
import { useWebVitals } from '@/hooks/useWebVitals';

/**
 * WebVitalsMonitor Component
 * 
 * Automatically tracks Core Web Vitals metrics across the application.
 * Place this component at the root level (App.tsx) to enable monitoring.
 * 
 * Features:
 * - Tracks CLS, LCP, FID, TTFB, INP, FCP
 * - Console logging in development
 * - Analytics reporting in production
 * - Configurable sample rate
 * 
 * Usage:
 * ```tsx
 * <WebVitalsMonitor enabled={true} debug={false} />
 * ```
 */

interface WebVitalsMonitorProps {
  /** Enable/disable monitoring (default: true) */
  enabled?: boolean;
  /** Show debug logs in console (default: false) */
  debug?: boolean;
  /** Report to console (default: true in dev) */
  reportToConsole?: boolean;
  /** Report to analytics (default: true in prod) */
  reportToAnalytics?: boolean;
  /** Sample rate 0-1 (default: 1.0 = 100%) */
  sampleRate?: number;
}

export const WebVitalsMonitor = ({
  enabled = true,
  debug = false,
  reportToConsole = import.meta.env.DEV,
  reportToAnalytics = import.meta.env.PROD,
  sampleRate = 1.0,
}: WebVitalsMonitorProps) => {
  const { metrics, getAllMetrics } = useWebVitals({
    enabled,
    debug,
    reportToConsole,
    reportToAnalytics,
    sampleRate,
  });

  useEffect(() => {
    if (!enabled || !debug) return;

    // Log summary when page is about to unload
    const handleBeforeUnload = () => {
      const allMetrics = getAllMetrics();
      if (allMetrics.length > 0) {
        console.log('[Web Vitals] Session Summary:', {
          metricsCollected: allMetrics.length,
          metrics: Object.fromEntries(
            allMetrics.map((m) => [
              m.name,
              {
                value: m.name === 'CLS' ? m.value.toFixed(3) : `${Math.round(m.value)}ms`,
                rating: m.rating,
              },
            ])
          ),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, debug, getAllMetrics]);

  // This component doesn't render anything - it's just for monitoring
  return null;
};

/**
 * Web Vitals Dashboard Component
 * Optional: Display real-time Web Vitals metrics in a floating panel
 * Useful for development and debugging
 */
interface WebVitalsDashboardProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
}

export const WebVitalsDashboard = ({ 
  position = 'bottom-right',
  compact = false,
}: WebVitalsDashboardProps) => {
  const { getAllMetrics } = useWebVitals({ enabled: true, debug: true });
  const allMetrics = getAllMetrics();

  if (allMetrics.length === 0) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 ${
        compact ? 'p-2' : 'p-4'
      } bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
          Web Vitals
        </h3>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            allMetrics.filter((m) => m.rating === 'good').length === allMetrics.length
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {Math.round(
            (allMetrics.filter((m) => m.rating === 'good').length / allMetrics.length) * 100
          )}
          %
        </span>
      </div>

      <div className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {allMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded border ${getRatingColor(
              metric.rating
            )}`}
          >
            <span className="font-medium">{metric.name}</span>
            <span className="text-xs">
              {metric.name === 'CLS'
                ? metric.value.toFixed(3)
                : `${Math.round(metric.value)}ms`}
            </span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex gap-2">
            <span className="inline-flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
              Good
            </span>
            <span className="inline-flex items-center">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
              Needs work
            </span>
            <span className="inline-flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
              Poor
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
