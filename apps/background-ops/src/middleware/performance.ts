import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metrics';

interface RequestMetrics {
  startTime: number;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
}

// Store active requests
const activeRequests = new Map<string, RequestMetrics>();

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Store request metrics
  activeRequests.set(requestId, {
    startTime,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  // Store request ID for cleanup
  (req as any).requestId = requestId;
  
  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Record metrics asynchronously to not block response
    setImmediate(() => {
      recordRequestMetrics(req, res, duration);
      activeRequests.delete(requestId);
    });
    
    // Call original end and return the result
    return originalEnd(chunk, encoding, cb);
  } as any;
  
  next();
}

async function recordRequestMetrics(req: Request, res: Response, duration: number) {
  try {
    const path = sanitizePath(req.path);
    const status = res.statusCode;
    const method = req.method;
    
    // Record response time metric
    await metricsService.recordMetric({
      name: 'http_request_duration_ms',
      value: duration,
      unit: 'milliseconds',
      tags: {
        method,
        path,
        status: status.toString(),
        status_class: getStatusClass(status)
      }
    });
    
    // Record request count
    await metricsService.recordMetric({
      name: 'http_requests_total',
      value: 1,
      unit: 'count',
      tags: {
        method,
        path,
        status: status.toString(),
        status_class: getStatusClass(status)
      }
    });
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        path,
        duration,
        status,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Log errors
    if (status >= 400) {
      logger.warn('HTTP error response', {
        method,
        path,
        duration,
        status,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
  } catch (error) {
    logger.error('Error recording request metrics:', error);
  }
}

function sanitizePath(path: string): string {
  // Replace UUIDs and numbers with placeholders for better grouping
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/gi, '/:id'); // MongoDB ObjectIds
}

function getStatusClass(status: number): string {
  if (status < 200) return '1xx';
  if (status < 300) return '2xx';
  if (status < 400) return '3xx';
  if (status < 500) return '4xx';
  return '5xx';
}

export function getActiveRequestsCount(): number {
  return activeRequests.size;
}

export function getActiveRequests(): Array<RequestMetrics & { id: string; duration: number }> {
  const now = Date.now();
  return Array.from(activeRequests.entries()).map(([id, metrics]) => ({
    id,
    ...metrics,
    duration: now - metrics.startTime
  }));
}

// Middleware to add performance headers
export function performanceHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Request-ID', (req as any).requestId || 'unknown');
  });
  
  next();
}

// Performance monitoring route handler
export async function getPerformanceMetrics(req: Request, res: Response) {
  try {
    const { timeRange = '1h' } = req.query;
    
    // Get performance metrics from the metrics service
    const [responseTimeMetrics, requestCountMetrics, errorRateMetrics] = await Promise.all([
      metricsService.getAggregatedMetrics('http_request_duration_ms', timeRange as string),
      metricsService.getAggregatedMetrics('http_requests_total', timeRange as string),
      getErrorRateMetrics(timeRange as string)
    ]);
    
    const activeRequests = getActiveRequests();
    
    res.json({
      timeRange,
      responseTime: responseTimeMetrics,
      requestCount: requestCountMetrics,
      errorRate: errorRateMetrics,
      activeRequests: {
        count: activeRequests.length,
        requests: activeRequests.slice(0, 10) // Limit to 10 most recent
      },
      summary: {
        totalRequests: requestCountMetrics.aggregations.reduce((sum, agg) => sum + agg.sample_count, 0),
        avgResponseTime: responseTimeMetrics.aggregations.length > 0 
          ? responseTimeMetrics.aggregations.reduce((sum, agg) => sum + agg.avg_value, 0) / responseTimeMetrics.aggregations.length
          : 0,
        slowRequests: activeRequests.filter(req => req.duration > 1000).length
      }
    });
    
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
}

async function getErrorRateMetrics(timeRange: string) {
  try {
    // Calculate error rate from request metrics
    const errorMetrics = await metricsService.getMetricsByTags({ status_class: '4xx' });
    const allMetrics = await metricsService.getAggregatedMetrics('http_requests_total', timeRange);
    
    return {
      metric_name: 'error_rate',
      time_range: timeRange,
      aggregations: allMetrics.aggregations.map(agg => ({
        ...agg,
        error_rate: (agg.sample_count > 0 ? (errorMetrics.length / agg.sample_count) * 100 : 0)
      }))
    };
  } catch (error) {
    logger.error('Error calculating error rate:', error);
    return {
      metric_name: 'error_rate',
      time_range: timeRange,
      aggregations: []
    };
  }
}
