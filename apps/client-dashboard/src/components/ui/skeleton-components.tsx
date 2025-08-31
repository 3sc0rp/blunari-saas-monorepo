import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Basic skeleton building blocks with reduced motion support
export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse motion-reduce:animate-none bg-surface-2 rounded-md ${className}`} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <SkeletonBox 
        key={i} 
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
      />
    ))}
  </div>
);

// Card skeleton
export const SkeletonCard: React.FC<{ 
  showHeader?: boolean;
  headerHeight?: string;
  contentLines?: number;
  className?: string;
}> = ({ 
  showHeader = true, 
  headerHeight = 'h-6', 
  contentLines = 3,
  className = ''
}) => (
  <Card className={className}>
    {showHeader && (
      <CardHeader className="space-y-2">
        <SkeletonBox className={`w-2/3 ${headerHeight}`} />
        <SkeletonBox className="w-1/2 h-4" />
      </CardHeader>
    )}
    <CardContent className="space-y-4">
      <SkeletonText lines={contentLines} />
    </CardContent>
  </Card>
);

// Table skeleton
export const SkeletonTable: React.FC<{ 
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}> = ({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className = ''
}) => (
  <Card className={className}>
    <CardContent className="p-0">
      <div className="overflow-hidden">
        {/* Table header */}
        {showHeader && (
          <div className="border-b border-border px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }, (_, i) => (
                <SkeletonBox key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        )}
        
        {/* Table rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }, (_, colIndex) => (
                  <SkeletonBox 
                    key={colIndex} 
                    className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-24'}`} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Chart skeleton
export const SkeletonChart: React.FC<{ 
  height?: string;
  showLegend?: boolean;
  className?: string;
}> = ({ 
  height = 'h-64', 
  showLegend = true,
  className = ''
}) => (
  <Card className={className}>
    <CardHeader className="space-y-2">
      <SkeletonBox className="w-1/3 h-6" />
      <SkeletonBox className="w-1/2 h-4" />
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Chart area */}
      <div className={`relative ${height} bg-surface-2 rounded-lg animate-pulse motion-reduce:animate-none`}>
        {/* Mock chart elements */}
        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-surface-3 rounded-t-lg" />
        <div className="absolute bottom-0 left-1/4 right-3/4 h-1/2 bg-brand/20 rounded-t-sm" />
        <div className="absolute bottom-0 left-1/2 right-1/4 h-2/3 bg-brand/30 rounded-t-sm" />
        <div className="absolute bottom-0 left-3/4 right-0 h-1/3 bg-brand/40 rounded-t-sm" />
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBox className="w-3 h-3 rounded-full" />
              <SkeletonBox className="w-16 h-4" />
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// Metrics card skeleton
export const SkeletonMetricsCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <SkeletonBox className="w-24 h-4" />
      <SkeletonBox className="w-10 h-10 rounded-lg" />
    </CardHeader>
    <CardContent className="space-y-2">
      <SkeletonBox className="w-20 h-8" />
      <SkeletonBox className="w-32 h-3" />
      <div className="flex items-center gap-2">
        <SkeletonBox className="w-12 h-5 rounded-full" />
        <SkeletonBox className="w-16 h-3" />
      </div>
    </CardContent>
  </Card>
);

// List skeleton
export const SkeletonList: React.FC<{ 
  items?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ 
  items = 5, 
  showAvatar = true,
  className = ''
}) => (
  <Card className={className}>
    <CardContent className="p-0">
      <div className="divide-y divide-border">
        {Array.from({ length: items }, (_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            {showAvatar && (
              <SkeletonBox className="w-10 h-10 rounded-full flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <SkeletonBox className="w-1/3 h-4" />
              <SkeletonBox className="w-2/3 h-3" />
            </div>
            <SkeletonBox className="w-16 h-8 rounded-md" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Page skeleton (combines multiple elements)
export const SkeletonPage: React.FC = () => (
  <div className="space-y-6">
    {/* Page header skeleton */}
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <SkeletonBox className="w-64 h-8" />
        <SkeletonBox className="w-96 h-4" />
      </div>
      <SkeletonBox className="w-32 h-10 rounded-md" />
    </div>
    
    {/* Metrics cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonMetricsCard key={i} />
      ))}
    </div>
    
    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonChart height="h-80" />
      </div>
      <div>
        <SkeletonList />
      </div>
    </div>
  </div>
);