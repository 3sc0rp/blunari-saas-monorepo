/**
 * Performance Monitor Component
 * Shows performance metrics in development mode
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, HardDrive } from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
  loadTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    bundleSize: 0,
    loadTime: 0
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') return;

    // Show/hide with Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      const memory = (performance as any).memory;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      setMetrics({
        memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
        renderTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        bundleSize: 0, // Would need webpack-bundle-analyzer for real data
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
      });
    }, 2000);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-black/90 text-white border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Monitor
            <Badge variant="outline" className="text-xs">DEV</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              Memory
            </span>
            <Badge variant={metrics.memoryUsage > 100 ? "destructive" : "secondary"}>
              {metrics.memoryUsage.toFixed(1)} MB
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Load Time
            </span>
            <Badge variant={metrics.loadTime > 3000 ? "destructive" : "secondary"}>
              {(metrics.loadTime / 1000).toFixed(1)}s
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Status
            </span>
            <Badge variant="default">
              Optimized
            </Badge>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            Press Ctrl+Shift+P to toggle
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;
