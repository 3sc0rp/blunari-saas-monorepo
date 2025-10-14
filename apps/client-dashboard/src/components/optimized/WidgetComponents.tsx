/**
 * @fileoverview Optimized Widget Components
 * @description Performance-optimized widget components using world-class techniques
 * @version 1.0.0
 * @author Blunari Development Team
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { 
  usePerformanceMonitor,
  useDebounceCallback,
  useThrottleCallback,
  useHeavyComputation,
  useIntersectionObserver,
  useVirtualScrolling,
  withPerformanceOptimization,
  PerformanceCollector
} from '../../utils/performance';
import { logger } from '../../utils/logger';

/**
 * Optimized Widget Card Component
 */
interface WidgetCardProps {
  id: string;
  title: string;
  description: string;
  analytics: {
    views: number;
    clicks: number;
    conversion_rate: number;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAnalytics: (id: string) => void;
}

const WidgetCard = memo<WidgetCardProps>(({
  id,
  title,
  description,
  analytics,
  onEdit,
  onDelete,
  onAnalytics
}) => {
  usePerformanceMonitor('WidgetCard');
  const cardRef = useRef<HTMLDivElement>(null);
  const { isIntersecting } = useIntersectionObserver(cardRef);

  // Memoized handlers to prevent unnecessary re-renders
      const handleEdit = useCallback(() => onEdit(id), [id, onEdit]);
  const handleDelete = useCallback(() => onDelete(id), [id, onDelete]);
  const handleAnalytics = useCallback(() => onAnalytics(id), [id, onAnalytics]);

  // Debounced analytics tracking
      const debouncedAnalyticsTrack = useDebounceCallback((action: string) => {
    logger.debug('Widget interaction tracked', { widgetId: id, action });
  }, 300);

  // Memoized computed values
      const conversionDisplay = useMemo(() => {
    return `${(analytics.conversion_rate * 100).toFixed(2)}%`;
  }, [analytics.conversion_rate]);

  const performanceScore = useMemo(() => {
    const score = (analytics.clicks / Math.max(analytics.views, 1)) * 100;
    return Math.min(100, Math.max(0, score)).toFixed(1);
  }, [analytics.clicks, analytics.views]);

  return (
    <div 
      ref={cardRef}
      className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
      onMouseEnter={() => debouncedAnalyticsTrack('hover')}
    >
      {/* Only render content when visible for performance */}
      {isIntersecting && (
        <>
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleEdit}
                className="text-blue-600 hover:text-blue-800 text-sm"
                aria-label={`Edit ${title}`}
              >
                Edit
              </button>
              <button
                onClick={handleAnalytics}
                className="text-green-600 hover:text-green-800 text-sm"
                aria-label={`View analytics for ${title}`}
              >
                Analytics
              </button>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 text-sm"
                aria-label={`Delete ${title}`}
              >
                Delete
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
          
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-blue-50 rounded p-2">
              <div className="font-semibold text-blue-900">{analytics.views.toLocaleString()}</div>
              <div className="text-blue-600">Views</div>
            </div>
            <div className="bg-green-50 rounded p-2">
              <div className="font-semibold text-green-900">{analytics.clicks.toLocaleString()}</div>
              <div className="text-green-600">Clicks</div>
            </div>
            <div className="bg-purple-50 rounded p-2">
              <div className="font-semibold text-purple-900">{conversionDisplay}</div>
              <div className="text-purple-600">Conversion</div>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Performance Score</span>
            <span className="text-xs font-medium">{performanceScore}/100</span>
          </div>
        </>
      )}
      
      {/* Placeholder when not visible */}
      {!isIntersecting && (
        <div className="h-32 bg-gray-100 animate-pulse rounded"></div>
      )}
    </div>
  );
});

WidgetCard.displayName = 'WidgetCard';

/**
 * Optimized Widget List with Virtual Scrolling
 */
interface WidgetListProps {
  widgets: WidgetCardProps[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAnalytics: (id: string) => void;
}

const WidgetList = memo<WidgetListProps>(({
  widgets,
  onEdit,
  onDelete,
  onAnalytics
}) => {
  usePerformanceMonitor('WidgetList');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight] = useState(600);
  const itemHeight = 200;

  // Virtual scrolling for performance with large lists
      const {
    visibleItems,
    totalHeight,
    handleScroll
  } = useVirtualScrolling({
    totalItems: widgets.length,
    itemHeight,
    containerHeight
  });

  // Memoized filtered widgets for visible items only
      const visibleWidgets = useMemo(() => {
    return visibleItems.map(item => ({
      ...item,
      widget: widgets[item.index]
    }));
  }, [visibleItems, widgets]);

  // Heavy computation for analytics aggregation
      const aggregatedAnalytics = useHeavyComputation(() => {
    PerformanceCollector.startMeasurement('widget-analytics-aggregation');
    
    const totals = widgets.reduce(
      (acc, widget) => ({
        totalViews: acc.totalViews + widget.analytics.views,
        totalClicks: acc.totalClicks + widget.analytics.clicks,
        totalWidgets: acc.totalWidgets + 1
      }),
      { totalViews: 0, totalClicks: 0, totalWidgets: 0 }
    );

    const averageConversion = widgets.reduce(
      (acc, widget) => acc + widget.analytics.conversion_rate,
      0
    ) / Math.max(widgets.length, 1);

    PerformanceCollector.endMeasurement('widget-analytics-aggregation');
    
    return {
      ...totals,
      averageConversion,
      overallClickRate: totals.totalClicks / Math.max(totals.totalViews, 1)
    };
  }, [widgets], 'Widget Analytics Aggregation');

  return (
    <div className="space-y-4">
      {/* Performance Analytics Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Performance Overview</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {aggregatedAnalytics.totalWidgets}
            </div>
            <div className="text-sm text-gray-600">Total Widgets</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {aggregatedAnalytics.totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {aggregatedAnalytics.totalClicks.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Clicks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {(aggregatedAnalytics.averageConversion * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Conversion</div>
          </div>
        </div>
      </div>

      {/* Virtual Scrolled Widget List */}
      <div 
        ref={containerRef}
        className="relative overflow-auto border rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleWidgets.map(({ widget, style }) => (
            <div key={widget.id} style={style}>
              <div className="p-2">
                <WidgetCard
                  {...widget}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAnalytics={onAnalytics}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics Display */}
      <div className="text-xs text-gray-500 mt-2">
        Showing {visibleItems.length} of {widgets.length} widgets
      </div>
    </div>
  );
});

WidgetList.displayName = 'WidgetList';

/**
 * Optimized Widget Search with Debouncing
 */
interface WidgetSearchProps {
  onSearch: (query: string) => void;
  onFilter: (filters: { type?: string; status?: string }) => void;
  placeholder?: string;
}

const WidgetSearch = memo<WidgetSearchProps>(({
  onSearch,
  onFilter,
  placeholder = "Search widgets..."
}) => {
  usePerformanceMonitor('WidgetSearch');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ type?: string; status?: string }>({});

  // Debounced search to prevent excessive API calls
      const debouncedSearch = useDebounceCallback((query: string) => {
    onSearch(query);
    logger.debug('Widget search executed', { query, length: query.length });
  }, 300);

  // Throttled filter updates
      const throttledFilter = useThrottleCallback((newFilters: typeof filters) => {
    onFilter(newFilters);
    logger.debug('Widget filters applied', newFilters);
  }, 500);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    throttledFilter(newFilters);
  }, [filters, throttledFilter]);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="button">Button</option>
            <option value="form">Form</option>
            <option value="banner">Banner</option>
            <option value="popup">Popup</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || Object.values(filters).some(Boolean)) && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Search: "{searchQuery}"
            </span>
          )}
          {filters.type && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Type: {filters.type}
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Status: {filters.status}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

WidgetSearch.displayName = 'WidgetSearch';

/**
 * HOC-enhanced components with performance optimization
 */
const OptimizedWidgetCard = withPerformanceOptimization(WidgetCard, {
  memoize: true,
  displayName: 'OptimizedWidgetCard',
  debugRenders: process.env.NODE_ENV === 'development'
});

const OptimizedWidgetList = withPerformanceOptimization(WidgetList, {
  memoize: true,
  displayName: 'OptimizedWidgetList',
  debugRenders: process.env.NODE_ENV === 'development'
});

const OptimizedWidgetSearch = withPerformanceOptimization(WidgetSearch, {
  memoize: true,
  displayName: 'OptimizedWidgetSearch',
  debugRenders: process.env.NODE_ENV === 'development'
});

// Export optimized components
export {
  OptimizedWidgetCard as WidgetCard,
  OptimizedWidgetList as WidgetList,
  OptimizedWidgetSearch as WidgetSearch,
  PerformanceCollector
};

// Export types
export type {
  WidgetCardProps,
  WidgetListProps,
  WidgetSearchProps
};
