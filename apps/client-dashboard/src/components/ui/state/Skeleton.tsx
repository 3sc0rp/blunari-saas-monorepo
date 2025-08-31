import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SkeletonProps {
  className?: string;
}

interface SkeletonLineProps {
  width?: string;
  className?: string;
}

interface SkeletonCircleProps {
  size?: string;
  className?: string;
}

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

interface SkeletonChartProps {
  height?: string;
  showLegend?: boolean;
  className?: string;
}

interface SkeletonFormProps {
  fields?: number;
  showButtons?: boolean;
  className?: string;
}

// Base skeleton component
const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div className={`animate-pulse bg-surface-2 rounded ${className}`} />
);

// Skeleton line component
const SkeletonLine: React.FC<SkeletonLineProps> = ({ width = "100%", className = "" }) => (
  <div className={`animate-pulse bg-surface-2 rounded h-4 ${className}`} style={{ width }} />
);

// Skeleton circle component
const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size = "h-10 w-10", className = "" }) => (
  <Skeleton className={`${size} rounded-full ${className}`} />
);

// Skeleton card component
const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  lines = 3, 
  showAvatar = false, 
  showActions = false,
  className = ""
}) => (
  <Card className={`${className}`}>
    <CardHeader className="space-y-3">
      <div className="flex items-center space-x-3">
        {showAvatar && <SkeletonCircle size="h-12 w-12" />}
        <div className="space-y-2 flex-1">
          <SkeletonLine width="60%" />
          <SkeletonLine width="40%" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine 
          key={i} 
          width={i === lines - 1 ? "70%" : "100%"}
        />
      ))}
      {showActions && (
        <div className="flex space-x-2 pt-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </CardContent>
  </Card>
);

// Skeleton table component
const SkeletonTable: React.FC<SkeletonTableProps> = ({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className = ""
}) => (
  <Card className={className}>
    <CardContent className="p-0">
      <div className="w-full">
        {showHeader && (
          <div className="border-b border-border p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, i) => (
                <SkeletonLine key={i} width="80%" />
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <SkeletonLine 
                    key={colIndex} 
                    width={colIndex === 0 ? "90%" : `${60 + Math.random() * 30}%`}
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

// Skeleton chart component
const SkeletonChart: React.FC<SkeletonChartProps> = ({ 
  height = "h-64", 
  showLegend = true,
  className = ""
}) => (
  <Card className={className}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine width="40%" />
          <SkeletonLine width="60%" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className={`w-full ${height} rounded-lg mb-4`} />
      {showLegend && (
        <div className="flex justify-center space-x-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <SkeletonLine width="60px" />
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// Skeleton form component
const SkeletonForm: React.FC<SkeletonFormProps> = ({ 
  fields = 4, 
  showButtons = true,
  className = ""
}) => (
  <Card className={className}>
    <CardHeader>
      <SkeletonLine width="50%" />
      <SkeletonLine width="70%" />
    </CardHeader>
    <CardContent className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine width="30%" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      {showButtons && (
        <div className="flex space-x-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      )}
    </CardContent>
  </Card>
);

// Skeleton list component
const SkeletonList: React.FC<{ items?: number; showAvatars?: boolean; className?: string }> = ({ 
  items = 6, 
  showAvatars = false,
  className = ""
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
        {showAvatars && <SkeletonCircle size="h-10 w-10" />}
        <div className="space-y-2 flex-1">
          <SkeletonLine width="60%" />
          <SkeletonLine width="40%" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

// Skeleton metrics component
const SkeletonMetrics: React.FC<{ count?: number; className?: string }> = ({ 
  count = 4,
  className = ""
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonLine width="60%" />
              <Skeleton className="h-8 w-16" />
            </div>
            <SkeletonCircle size="h-8 w-8" />
          </div>
          <div className="mt-4">
            <SkeletonLine width="40%" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export {
  Skeleton,
  SkeletonLine,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonForm,
  SkeletonList,
  SkeletonMetrics
};