/**
 * @fileoverview Performance Monitoring Dashboard
 * @description Real-time performance monitoring and optimization insights
 * @version 1.0.0
 * @author Blunari Development Team
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PerformanceCollector } from '../../utils/performance';
import { logger } from '../../utils/logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  timestamp: string;
}

interface PerformanceStats {
  averageRenderTime: number;
  slowestOperation: PerformanceMetric | null;
  totalMeasurements: number;
  performanceScore: number;
  memoryUsage: number;
  recommendations: string[];
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Collect performance data
      const collectMetrics = useCallback(() => {
    const performanceData = PerformanceCollector.getMetrics();
    const metricsArray: PerformanceMetric[] = [];

    performanceData.forEach((data, name) => {
      if (data.duration) {
        metricsArray.push({
          name,
          duration: data.duration,
          startTime: data.startTime,
          endTime: data.endTime,
          timestamp: new Date().toISOString()
        });
      }
    });

    setMetrics(prev => [...prev, ...metricsArray].slice(-100)); // Keep last 100 metrics
    logger.debug('Performance metrics collected', { count: metricsArray.length });
  }, []);

  // Calculate performance statistics
      const performanceStats = useMemo((): PerformanceStats => {
    if (metrics.length === 0) {
      return {
        averageRenderTime: 0,
        slowestOperation: null,
        totalMeasurements: 0,
        performanceScore: 100,
        memoryUsage: 0,
        recommendations: []
      };
    }

    const totalDuration = metrics.reduce((acc, metric) => acc + metric.duration, 0);
    const averageRenderTime = totalDuration / metrics.length;
    
    const slowestOperation = metrics.reduce((slowest, current) => 
      current.duration > (slowest?.duration || 0) ? current : slowest
    );

    // Calculate performance score (0-100)
      const baseScore = 100;
    const renderPenalty = Math.max(0, (averageRenderTime - 16) * 2); // Penalty for >16ms renders
      const slowOpPenalty = Math.max(0, (slowestOperation.duration - 50) * 0.5); // Penalty for >50ms ops
      const performanceScore = Math.max(0, baseScore - renderPenalty - slowOpPenalty);

    // Memory usage simulation (in a real app, this would come from performance.memory)
      const memoryUsage = typeof window !== 'undefined' && 'memory' in performance 
      ? (performance as any).memory?.usedJSHeapSize || 0
      : Math.random() * 50000000; // Mock value

    // Generate recommendations
      const recommendations: string[] = [];
    if (averageRenderTime > 16) {
      recommendations.push('Consider implementing React.memo for frequently re-rendering components');
    }
    if (slowestOperation.duration > 100) {
      recommendations.push('Optimize heavy computations with useMemo or web workers');
    }
    if (memoryUsage > 100000000) { // 100MB
      recommendations.push('Monitor for memory leaks in component cleanup');
    }
    if (metrics.filter(m => m.duration > 50).length > metrics.length * 0.2) {
      recommendations.push('20% of operations are slow - review component architecture');
    }

    return {
      averageRenderTime,
      slowestOperation,
      totalMeasurements: metrics.length,
      performanceScore,
      memoryUsage,
      recommendations
    };
  }, [metrics]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(collectMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, refreshInterval, collectMetrics]);

  // Format duration for display
      const formatDuration = useCallback((duration: number): string => {
    if (duration < 1) return `${(duration * 1000).toFixed(2)}μs`;
    if (duration < 1000) return `${duration.toFixed(2)}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  }, []);

  // Format bytes for display
      const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get performance score color
      const getScoreColor = useCallback((score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  // Clear metrics
      const clearMetrics = useCallback(() => {
    setMetrics([]);
    PerformanceCollector.clearMetrics();
    logger.info('Performance metrics cleared');
  }, []);

  // Export performance report
      const exportReport = useCallback(() => {
    const report = PerformanceCollector.generateReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('Performance report exported');
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              isMonitoring 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={clearMetrics}
            className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700"
          >
            Clear
          </button>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Export
          </button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Performance Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(performanceStats.performanceScore)}`}>
                {performanceStats.performanceScore.toFixed(1)}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Avg Render Time</p>
              <p className="text-2xl font-bold text-green-900">
                {formatDuration(performanceStats.averageRenderTime)}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Memory Usage</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatBytes(performanceStats.memoryUsage)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Measurements</p>
              <p className="text-2xl font-bold text-orange-900">
                {performanceStats.totalMeasurements}
              </p>
            </div>
            <div className="text-orange-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Performance Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.slice(-10).reverse().map((metric, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      metric.duration < 16 
                        ? 'bg-green-100 text-green-800'
                        : metric.duration < 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {formatDuration(metric.duration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {metric.duration < 16 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Excellent
                      </span>
                    ) : metric.duration < 50 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Good
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Needs Optimization
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Recommendations */}
      {performanceStats.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-lg font-medium text-yellow-800 mb-2">Performance Recommendations</h4>
          <ul className="space-y-2">
            {performanceStats.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm text-yellow-700">{recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Monitoring Status */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          {isMonitoring ? 'Monitoring active' : 'Monitoring inactive'}
        </div>
        <div>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
