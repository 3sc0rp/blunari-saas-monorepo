/**
 * Optimized Loading Fallback Component
 * Lightweight fallback for lazy-loaded components to reduce initial render time
 */
import React, { memo } from 'react';

interface LazyLoadingFallbackProps {
  component?: string;
  height?: string;
}

// Memoized loading component to prevent unnecessary re-renders
      const LazyLoadingFallback: React.FC<LazyLoadingFallbackProps> = memo(({ 
  component = 'Page', 
  height = '400px' 
}) => {
  return (
    <div 
      className="flex items-center justify-center w-full"
      style={{ height, minHeight: '200px' }}
      role="status"
      aria-label={`Loading ${component}`}
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Optimized loading spinner - CSS only, no JavaScript animations */}
        <div className="relative">
          <div className="w-8 h-8 border-2 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-sm text-gray-500 font-medium">
          Loading {component}...
        </div>
        
        {/* Progress skeleton for better perceived performance */}
        <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
});

LazyLoadingFallback.displayName = 'LazyLoadingFallback';

// Specialized fallbacks for different component types
export const TableLoadingFallback = memo(() => (
  <LazyLoadingFallback component="Data Table" height="600px" />
));

export const AnalyticsLoadingFallback = memo(() => (
  <LazyLoadingFallback component="Analytics" height="500px" />
));

export const ChartLoadingFallback = memo(() => (
  <LazyLoadingFallback component="Charts" height="400px" />
));

export const DashboardLoadingFallback = memo(() => (
  <LazyLoadingFallback component="Dashboard" height="300px" />
));

export default LazyLoadingFallback;

