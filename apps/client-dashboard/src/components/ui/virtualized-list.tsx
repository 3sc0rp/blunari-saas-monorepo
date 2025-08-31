import React, { memo, useMemo } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  keyExtractor,
  className,
  overscan = 5,
}: VirtualizedListProps<T>) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualization(items, {
    itemHeight,
    containerHeight: height,
    overscan,
  });

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={keyExtractor(item, index)}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoized list item component for better performance
export const MemoizedListItem = memo<{
  children: React.ReactNode;
  className?: string;
}>(({ children, className }) => (
  <div className={className}>
    {children}
  </div>
));

MemoizedListItem.displayName = 'MemoizedListItem';

// Grid virtualization for table-like data
interface VirtualizedGridProps<T> {
  items: T[];
  rowHeight: number;
  height: number;
  columns: {
    key: string;
    width: number;
    render: (item: T, index: number) => React.ReactNode;
  }[];
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  headerHeight?: number;
  overscan?: number;
}

export function VirtualizedGrid<T>({
  items,
  rowHeight,
  height,
  columns,
  keyExtractor,
  className,
  headerHeight = 40,
  overscan = 5,
}: VirtualizedGridProps<T>) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualization(items, {
    itemHeight: rowHeight,
    containerHeight: height - headerHeight,
    overscan,
  });

  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0),
    [columns]
  );

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className="bg-muted/50 border-b flex"
        style={{ height: headerHeight, width: totalWidth }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 font-medium text-sm flex items-center border-r last:border-r-0"
            style={{ width: column.width }}
          >
            {column.key}
          </div>
        ))}
      </div>

      {/* Virtual content */}
      <div
        className="overflow-auto"
        style={{ height: height - headerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={keyExtractor(item, index)}
                className="flex border-b hover:bg-muted/30 transition-colors"
                style={{ height: rowHeight, width: totalWidth }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="px-4 py-2 flex items-center border-r last:border-r-0"
                    style={{ width: column.width }}
                  >
                    {column.render(item, index)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}