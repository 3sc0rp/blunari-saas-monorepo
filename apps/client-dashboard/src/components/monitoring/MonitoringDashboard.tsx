import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { cacheManager } from '@/utils/cacheManager';
import { logger } from '@/utils/logger';

interface MonitoringData {
  performance: any;
  cache: any;
  logs: any[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    uptime: number;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<MonitoringData>({
    performance: null,
    cache: null,
    logs: [],
    systemHealth: {
      status: 'healthy',
      issues: [],
      uptime: 0
    }
  });

  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'performance' | 'cache' | 'logs' | 'health'>('performance');

  useEffect(() => {
    const updateData = () => {
      try {
        const performance = performanceMonitor.getInsights();
        const cache = cacheManager.getMetrics();
        const logs = logger.getRecentLogs(20);
        
        // Calculate system health
      const issues: string[] = [];
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';

        // Check performance issues
      if (performance.webVitals.lcp > 2500) {
          issues.push('Poor LCP performance');
          status = 'warning';
        }
        if (performance.apiPerformance.errorRate > 10) {
          issues.push('High API error rate');
          status = 'critical';
        }

        // Check cache issues
      if (cache.hitRate < 50) {
          issues.push('Low cache hit rate');
          status = status === 'critical' ? 'critical' : 'warning';
        }

        // Check recent errors
      const recentErrors = logs.filter(log => log.level === 'error' && 
          Date.now() - log.timestamp.getTime() < 5 * 60 * 1000);
        if (recentErrors.length > 5) {
          issues.push('High error frequency');
          status = 'critical';
        }

        setData({
          performance,
          cache,
          logs,
          systemHealth: {
            status,
            issues,
            uptime: Date.now() - (window as any).__appStartTime || 0
          }
        });
      } catch (error) {
        console.error('Failed to update monitoring data:', error);
      }
    };

    // Update immediately and then every 5 seconds
    updateData();
    const interval = setInterval(updateData, 5000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+M)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-lg cursor-pointer shadow-lg"
        onClick={() => setIsVisible(true)}
        title="Open Monitoring Dashboard (Ctrl+Shift+M)"
      >
        📊 Monitor
      </div>
    );
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const renderPerformanceTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-300">LCP</div>
          <div className={`text-lg font-semibold ${data.performance?.webVitals.lcp > 2500 ? 'text-red-400' : 'text-green-400'}`}>
            {Math.round(data.performance?.webVitals.lcp || 0)}ms
          </div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-300">FID</div>
          <div className={`text-lg font-semibold ${data.performance?.webVitals.fid > 100 ? 'text-red-400' : 'text-green-400'}`}>
            {Math.round(data.performance?.webVitals.fid || 0)}ms
          </div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-300">CLS</div>
          <div className={`text-lg font-semibold ${data.performance?.webVitals.cls > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
            {(data.performance?.webVitals.cls || 0).toFixed(3)}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 p-3 rounded">
        <div className="text-sm text-gray-300 mb-2">API Performance</div>
        <div className="space-y-1">
          <div>Avg Response Time: <span className="font-semibold">{Math.round(data.performance?.apiPerformance.averageResponseTime || 0)}ms</span></div>
          <div>Error Rate: <span className={`font-semibold ${data.performance?.apiPerformance.errorRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
            {(data.performance?.apiPerformance.errorRate || 0).toFixed(1)}%
          </span></div>
          <div>Slow Calls: <span className="font-semibold">{data.performance?.apiPerformance.slowCallsCount || 0}</span></div>
        </div>
      </div>

      {data.performance?.recommendations && data.performance.recommendations.length > 0 && (
        <div className="bg-yellow-900 p-3 rounded">
          <div className="text-sm text-yellow-300 mb-2">Recommendations</div>
          <div className="space-y-1">
            {data.performance.recommendations.map((rec: string, index: number) => (
              <div key={index} className="text-sm text-yellow-200">• {rec}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCacheTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-300">Hit Rate</div>
          <div className={`text-lg font-semibold ${data.cache?.hitRate < 50 ? 'text-red-400' : 'text-green-400'}`}>
            {(data.cache?.hitRate || 0).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-300">Cache Size</div>
          <div className="text-lg font-semibold text-blue-400">
            {data.cache?.cacheSize || 0} items
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 p-3 rounded">
        <div className="text-sm text-gray-300 mb-2">Cache Statistics</div>
        <div className="space-y-1 text-sm">
          <div>Hits: <span className="font-semibold text-green-400">{data.cache?.hits || 0}</span></div>
          <div>Misses: <span className="font-semibold text-red-400">{data.cache?.misses || 0}</span></div>
          <div>Evictions: <span className="font-semibold text-yellow-400">{data.cache?.evictions || 0}</span></div>
          <div>Memory: <span className="font-semibold text-blue-400">{data.cache?.memoryUsageFormatted || '0 Bytes'}</span></div>
          <div>Avg Access Time: <span className="font-semibold">{(data.cache?.averageAccessTime || 0).toFixed(2)}ms</span></div>
        </div>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="space-y-2">
      <div className="text-sm text-gray-300 mb-2">Recent Logs ({data.logs.length})</div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {data.logs.map((log, index) => (
          <div key={index} className={`text-xs p-2 rounded ${
            log.level === 'error' ? 'bg-red-900 text-red-200' :
            log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
            log.level === 'info' ? 'bg-blue-900 text-blue-200' :
            'bg-gray-700 text-gray-300'
          }`}>
            <div className="font-semibold">{log.timestamp.toLocaleTimeString()} - {log.level.toUpperCase()}</div>
            <div>{log.message}</div>
            {log.context && (
              <div className="mt-1 opacity-75">
                {JSON.stringify(log.context, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHealthTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-700 p-3 rounded">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-300">System Status</div>
          <div className={`font-semibold ${getStatusColor(data.systemHealth.status)}`}>
            {data.systemHealth.status.toUpperCase()}
          </div>
        </div>
        <div className="text-sm">
          Uptime: <span className="font-semibold">{formatUptime(data.systemHealth.uptime)}</span>
        </div>
      </div>

      {data.systemHealth.issues.length > 0 && (
        <div className="bg-red-900 p-3 rounded">
          <div className="text-sm text-red-300 mb-2">Issues ({data.systemHealth.issues.length})</div>
          <div className="space-y-1">
            {data.systemHealth.issues.map((issue, index) => (
              <div key={index} className="text-sm text-red-200">⚠️ {issue}</div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-700 p-3 rounded">
        <div className="text-sm text-gray-300 mb-2">Quick Actions</div>
        <div className="space-y-2">
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm"
            onClick={() => {
              cacheManager.clear();
              logger.clearLogs();
            }}
          >
            Clear Cache & Logs
          </button>
          <button 
            className="w-full bg-green-600 hover:bg-green-700 p-2 rounded text-sm"
            onClick={() => {
              const insights = performanceMonitor.getInsights();
              console.group('📊 Performance Report');              console.groupEnd();
            }}
          >
            Export Performance Report
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-gray-800 text-white rounded-lg shadow-xl border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <div className="font-semibold">System Monitor</div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            data.systemHealth.status === 'healthy' ? 'bg-green-400' :
            data.systemHealth.status === 'warning' ? 'bg-yellow-400' :
            'bg-red-400'
          }`} />
          <button 
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-600">
        {(['performance', 'cache', 'logs', 'health'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`flex-1 p-2 text-sm capitalize ${
              selectedTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {selectedTab === 'performance' && renderPerformanceTab()}
        {selectedTab === 'cache' && renderCacheTab()}
        {selectedTab === 'logs' && renderLogsTab()}
        {selectedTab === 'health' && renderHealthTab()}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-600 text-xs text-gray-400 text-center">
        Press Ctrl+Shift+M to toggle | Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MonitoringDashboard;


