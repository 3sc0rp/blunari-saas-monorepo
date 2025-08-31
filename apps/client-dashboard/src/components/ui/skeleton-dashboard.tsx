import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const SkeletonMetricsCard: React.FC = () => {
  return (
    <Card className="bg-surface border-surface-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <div className="h-px bg-surface-3 mx-6"></div>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
      <div className="h-1 bg-surface-3"></div>
    </Card>
  );
};

export const SkeletonDashboardChart: React.FC<{ height?: string }> = ({ 
  height = "h-96" 
}) => {
  return (
    <Card className={`${height} bg-surface border-surface-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {/* Chart area */}
          <div className="h-60 flex items-end justify-between gap-2">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton 
                  className="w-full" 
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SkeletonBookingsList: React.FC = () => {
  return (
    <Card className="h-96 bg-surface border-surface-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const SkeletonWelcomeSection: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface-2 to-surface-3 rounded-2xl p-8 shadow-elev-2">
      <div className="relative z-10">
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-surface-3 rounded-full blur-2xl opacity-50"></div>
      <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-surface-3 rounded-full blur-xl opacity-30"></div>
    </div>
  );
};

export const SkeletonAnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Time Picker */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      
      {/* Main Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonDashboardChart height="h-80" />
        <SkeletonDashboardChart height="h-80" />
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonMetricsCard key={i} />
        ))}
      </div>
    </div>
  );
};

export const SkeletonMessagesDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Messages View */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${i % 2 === 0 ? 'bg-surface-2' : 'bg-brand/10'}`}>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};