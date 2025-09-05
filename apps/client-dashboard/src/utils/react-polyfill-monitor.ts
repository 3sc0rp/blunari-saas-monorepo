/**
 * 🔍 React Polyfill Health Monitor
 * Advanced monitoring system for polyfill effectiveness and error tracking
 */

interface HealthCheck {
  name: string;
  check: () => { passed: boolean; details: any };
}

interface ErrorData {
  type: string;
  message?: string;
  timestamp: string;
  [key: string]: any;
}

interface PerformanceMetric {
  value: number;
  timestamp: number;
}

declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters: any) => void;
    ReactPolyfillMonitor?: ReactPolyfillMonitor;
    debugReactPolyfill?: () => any;
    debugReactErrors?: () => void;
    debugReactPerf?: () => void;
  }
}

class ReactPolyfillMonitor {
  private healthChecks: HealthCheck[] = [];
  private errorLog: ErrorData[] = [];
  private performanceMetrics: { [key: string]: PerformanceMetric[] } = {};
  private isInitialized = false;
  private startTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('🔍 React Polyfill Health Monitor starting...');
    
    this.setupGlobalErrorHandling();
    this.setupReactHealthChecks();
    this.setupPerformanceMonitoring();
    this.startContinuousMonitoring();
    
    this.isInitialized = true;
    console.log('✅ React Polyfill Health Monitor active');
  }

  setupGlobalErrorHandling() {
    // Catch all unhandled errors
    window.addEventListener('error', (event) => {
      if (this.isReactRelatedError(event.error)) {
        this.logReactError({
          type: 'runtime-error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isReactRelatedError(event.reason)) {
        this.logReactError({
          type: 'promise-rejection',
          reason: event.reason,
          promise: event.promise,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  setupReactHealthChecks() {
    // Check React availability
    this.addHealthCheck('react-availability', () => {
      const hasReact = typeof window.React !== 'undefined';
      const hasCreateContext = typeof window.React?.createContext === 'function';
      const hasUseLayoutEffect = typeof window.React?.useLayoutEffect === 'function';
      
      return {
        passed: hasReact && hasCreateContext && hasUseLayoutEffect,
        details: {
          hasReact,
          hasCreateContext,
          hasUseLayoutEffect,
          reactVersion: window.React?.version || 'unknown'
        }
      };
    });

    // Check vendor chunk loading
    this.addHealthCheck('vendor-chunks-loaded', () => {
      const vendorChunks = [
        'vendor-react-all',
        'vendor-safe',
        'vendor-supabase',
        'vendor-utils'
      ];
      
      const loadedChunks = vendorChunks.filter(chunk => 
        document.querySelector(`script[src*="${chunk}"]`)
      );
      
      return {
        passed: loadedChunks.length === vendorChunks.length,
        details: {
          expected: vendorChunks.length,
          loaded: loadedChunks.length,
          missing: vendorChunks.filter(chunk => !loadedChunks.includes(chunk))
        }
      };
    });

    // Check polyfill effectiveness
    this.addHealthCheck('polyfill-effectiveness', () => {
      let testsPassed = 0;
      const totalTests = 5;

      try {
        // Test createContext
        const testContext = window.React.createContext('test');
        if (testContext && testContext.Provider) testsPassed++;

        // Test useState
        const [state] = window.React.useState('test');
        if (state === 'test') testsPassed++;

        // Test useLayoutEffect
        window.React.useLayoutEffect(() => {}, []);
        testsPassed++;

        // Test Fragment
        const fragment = window.React.Fragment;
        if (fragment) testsPassed++;

        // Test createElement
        const element = window.React.createElement('div', { id: 'test' });
        if (element && element.type === 'div') testsPassed++;

      } catch (error) {
        this.logReactError({
          type: 'polyfill-test-error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      return {
        passed: testsPassed === totalTests,
        details: {
          testsPassed,
          totalTests,
          successRate: `${Math.round((testsPassed / totalTests) * 100)}%`
        }
      };
    });
  }

  setupPerformanceMonitoring() {
    // Monitor React rendering performance
    if (window.performance && window.performance.measure) {
      const originalCreateElement = window.React?.createElement;
      if (originalCreateElement) {
        window.React.createElement = (...args) => {
          const start = performance.now();
          const result = originalCreateElement.apply(this, args);
          const end = performance.now();
          
          this.recordPerformanceMetric('createElement', end - start);
          return result;
        };
      }
    }

    // Monitor bundle loading times
    window.addEventListener('load', () => {
      const timing = window.performance.timing;
      const bundleMetrics = {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        fullyLoaded: timing.loadEventEnd - timing.navigationStart,
        timestamp: new Date().toISOString()
      };
      
      this.recordPerformanceMetric('bundleLoadTime', bundleMetrics.fullyLoaded);
      this.recordPerformanceMetric('domContentLoaded', bundleMetrics.domContentLoaded);
    });
  }

  startContinuousMonitoring() {
    // Run health checks every 30 seconds
    setInterval(() => {
      this.runAllHealthChecks();
    }, 30000);

    // Initial health check
    setTimeout(() => {
      this.runAllHealthChecks();
    }, 1000);
  }

  addHealthCheck(name, checkFunction) {
    this.healthChecks.push({ name, check: checkFunction });
  }

  runAllHealthChecks() {
    const results = {};
    let allPassed = true;

    for (const { name, check } of this.healthChecks) {
      try {
        const result = check();
        results[name] = result;
        
        if (!result.passed) {
          allPassed = false;
          console.warn(`❌ Health check failed: ${name}`, result.details);
        }
      } catch (error) {
        allPassed = false;
        results[name] = { 
          passed: false, 
          error: error.message,
          details: null 
        };
        console.error(`💥 Health check error: ${name}`, error);
      }
    }

    // Log overall health status
    if (allPassed) {
      console.log('✅ All React polyfill health checks passed');
    } else {
      console.warn('⚠️ Some React polyfill health checks failed', results);
    }

    return results;
  }

  isReactRelatedError(error) {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const reactKeywords = [
      'createcontext',
      'uselayouteffect',
      'useeffect',
      'usestate',
      'react',
      'vendor-',
      'chunk',
      'undefined reading'
    ];

    return reactKeywords.some(keyword => errorString.includes(keyword));
  }

  logReactError(errorData) {
    this.errorLog.push(errorData);
    
    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }

    console.error('🚨 React-related error detected:', errorData);

    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'react_polyfill_error', {
        event_category: 'Error',
        event_label: errorData.type,
        value: 1
      });
    }
  }

  recordPerformanceMetric(name, value) {
    if (!this.performanceMetrics[name]) {
      this.performanceMetrics[name] = [];
    }
    
    this.performanceMetrics[name].push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 100 measurements
    if (this.performanceMetrics[name].length > 100) {
      this.performanceMetrics[name].shift();
    }
  }

  getHealthReport() {
    return {
      healthChecks: this.runAllHealthChecks(),
      errorLog: this.errorLog,
      performanceMetrics: this.performanceMetrics,
      uptime: Date.now() - (this.startTime || Date.now()),
      timestamp: new Date().toISOString()
    };
  }

  // Debug methods for development
  debugDumpErrors() {
    console.table(this.errorLog);
  }

  debugDumpPerformance() {
    console.table(this.performanceMetrics);
  }

  debugForceError() {
    // Simulate React error for testing
    try {
      (window.React as any).undefinedProperty.undefinedFunction();
    } catch (error) {
      console.log('🧪 Debug error simulation triggered');
    }
  }
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  window.ReactPolyfillMonitor = new ReactPolyfillMonitor();
  
  // Auto-start monitoring after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ReactPolyfillMonitor.init();
    });
  } else {
    window.ReactPolyfillMonitor.init();
  }

  // Expose debug methods globally in development
  if (process.env.NODE_ENV === 'development') {
    window.debugReactPolyfill = () => window.ReactPolyfillMonitor.getHealthReport();
    window.debugReactErrors = () => window.ReactPolyfillMonitor.debugDumpErrors();
    window.debugReactPerf = () => window.ReactPolyfillMonitor.debugDumpPerformance();
  }
}

export default ReactPolyfillMonitor;
