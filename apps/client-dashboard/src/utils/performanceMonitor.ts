/**
 * Enterprise Performance Monitoring System
 * Tracks key metrics, API performance, and user experience indicators
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface APIPerformanceData {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  tenantId?: string;
}

interface UserExperienceMetric {
  event: 'page_load' | 'api_call' | 'error' | 'user_action';
  duration?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: APIPerformanceData[] = [];
  private uxMetrics: UserExperienceMetric[] = [];
  private readonly maxBufferSize = 1000;
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.startPeriodicReporting();
    }
  }

  /**
   * Track Core Web Vitals for Google PageSpeed insights
   */
  private initializeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('lcp', entry.startTime, {
          url: window.location.pathname
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('fid', (entry as any).processingStart - entry.startTime, {
          url: window.location.pathname
        });
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordMetric('cls', clsValue, {
        url: window.location.pathname
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);
    this.trimBuffer(this.metrics);

    // Log critical performance issues
    if (this.isCriticalMetric(name, value)) {
      console.warn(`🚨 Critical performance issue: ${name} = ${value}ms`, tags);
    }
  }

  /**
   * Track API call performance
   */
  recordAPICall(data: APIPerformanceData) {
    this.apiCalls.push(data);
    this.trimBuffer(this.apiCalls);

    // Alert on slow API calls
    if (data.duration > 5000) {
      console.warn(`🐌 Slow API call: ${data.method} ${data.endpoint} took ${data.duration}ms`);
    }
  }

  /**
   * Track user experience events
   */
  recordUXEvent(event: UserExperienceMetric['event'], duration?: number, metadata?: Record<string, unknown>) {
    const uxMetric: UserExperienceMetric = {
      event,
      duration,
      metadata,
      timestamp: Date.now()
    };

    this.uxMetrics.push(uxMetric);
    this.trimBuffer(this.uxMetrics);
  }

  /**
   * Get performance insights
   */
  getInsights() {
    const now = Date.now();
    const last5Minutes = now - (5 * 60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp > last5Minutes);
    const recentAPICalls = this.apiCalls.filter(a => a.timestamp > last5Minutes);

    return {
      webVitals: {
        lcp: this.getAverageMetric(recentMetrics, 'lcp'),
        fid: this.getAverageMetric(recentMetrics, 'fid'),
        cls: this.getAverageMetric(recentMetrics, 'cls')
      },
      apiPerformance: {
        averageResponseTime: this.getAverageAPIResponseTime(recentAPICalls),
        errorRate: this.getAPIErrorRate(recentAPICalls),
        slowCallsCount: recentAPICalls.filter(call => call.duration > 3000).length
      },
      recommendations: this.generateRecommendations(recentMetrics, recentAPICalls)
    };
  }

  private isCriticalMetric(name: string, value: number): boolean {
    const thresholds = {
      'lcp': 2500, // LCP should be under 2.5s
      'fid': 100,  // FID should be under 100ms
      'cls': 0.1,  // CLS should be under 0.1
      'page_load': 3000 // Page load should be under 3s
    };

    return value > (thresholds[name] || Infinity);
  }

  private getAverageMetric(metrics: PerformanceMetric[], name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }

  private getAverageAPIResponseTime(calls: APIPerformanceData[]): number {
    if (calls.length === 0) return 0;
    return calls.reduce((sum, call) => sum + call.duration, 0) / calls.length;
  }

  private getAPIErrorRate(calls: APIPerformanceData[]): number {
    if (calls.length === 0) return 0;
    const errorCalls = calls.filter(call => call.status >= 400);
    return (errorCalls.length / calls.length) * 100;
  }

  private generateRecommendations(metrics: PerformanceMetric[], apiCalls: APIPerformanceData[]): string[] {
    const recommendations: string[] = [];

    const avgLCP = this.getAverageMetric(metrics, 'lcp');
    if (avgLCP > 2500) {
      recommendations.push('Consider optimizing images and reducing bundle size to improve LCP');
    }

    const avgAPITime = this.getAverageAPIResponseTime(apiCalls);
    if (avgAPITime > 1000) {
      recommendations.push('API calls are slow - consider caching or optimizing database queries');
    }

    const errorRate = this.getAPIErrorRate(apiCalls);
    if (errorRate > 5) {
      recommendations.push('High API error rate detected - check server health and error handling');
    }

    return recommendations;
  }

  private trimBuffer<T>(buffer: T[]) {
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }
  }

  private startPeriodicReporting() {
    this.reportingInterval = setInterval(() => {
      const insights = this.getInsights();
      
      // Only log if there are significant insights
      if (insights.recommendations.length > 0) {
        console.group('📊 Performance Insights');        console.groupEnd();
      }
    }, 5 * 60 * 1000); // Report every 5 minutes
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for easy integration
export const trackAPICall = (endpoint: string, method: string, startTime: number, status: number, tenantId?: string) => {
  performanceMonitor.recordAPICall({
    endpoint,
    method,
    duration: Date.now() - startTime,
    status,
    timestamp: Date.now(),
    tenantId
  });
};

export const trackPageLoad = (startTime: number) => {
  performanceMonitor.recordMetric('page_load', Date.now() - startTime, {
    url: window.location.pathname
  });
};

export const trackUserAction = (action: string, metadata?: Record<string, unknown>) => {
  performanceMonitor.recordUXEvent('user_action', undefined, { action, ...metadata });
};

export default performanceMonitor;

