import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface SparklineDataPoint {
  value: number;
  label?: string;
}

interface SparklineProps {
  data: SparklineDataPoint[];
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
  height?: number;
  width?: string | number;
  className?: string;
  showTooltip?: boolean;
  strokeWidth?: number;
}

/**
 * Sparkline Component
 * 
 * Minimal line chart for displaying trends in compact spaces.
 * Perfect for metric cards, tables, or dashboards.
 * 
 * Features:
 * - Ultra-compact design (no axes, minimal chrome)
 * - Color variants matching design system
 * - Optional tooltips
 * - Smooth animations
 * - Responsive sizing
 * 
 * @example
 * <Sparkline 
 *   data={last30DaysData} 
 *   color="success"
 *   height={40}
 *   showTooltip={true}
 * />
 */
export function Sparkline({
  data,
  color = 'primary',
  height = 40,
  width = '100%',
  className,
  showTooltip = true,
  strokeWidth = 2,
}: SparklineProps) {
  // Color mapping
  const colorMap = {
    primary: 'hsl(var(--primary))',
    success: 'hsl(142 76% 36%)', // Green
    warning: 'hsl(38 92% 50%)', // Orange
    destructive: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))',
  };

  const strokeColor = colorMap[color];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded px-2 py-1 text-xs font-medium shadow-md">
        {data.label || data.value.toLocaleString()}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div 
        className={cn("bg-muted/20 rounded", className)} 
        style={{ height, width }}
      />
    );
  }

  return (
    <ResponsiveContainer width={width} height={height} className={className}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        {showTooltip && <Tooltip content={<CustomTooltip />} cursor={false} />}
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dot={false}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * SparklineBar Component
 * 
 * Minimal bar chart variant for categorical data.
 * Useful for showing distribution or composition.
 */
interface SparklineBarProps extends Omit<SparklineProps, 'strokeWidth'> {
  barColor?: string;
}

export function SparklineBar({
  data,
  color = 'primary',
  height = 40,
  width = '100%',
  className,
}: SparklineBarProps) {
  const colorMap = {
    primary: 'hsl(var(--primary))',
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    destructive: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))',
  };

  const barColor = colorMap[color];

  if (!data || data.length === 0) {
    return (
      <div 
        className={cn("bg-muted/20 rounded", className)} 
        style={{ height, width }}
      />
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div 
      className={cn("flex items-end gap-0.5", className)} 
      style={{ height, width }}
    >
      {data.map((point, index) => {
        const barHeight = (point.value / maxValue) * 100;
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${barHeight}%`,
              backgroundColor: barColor,
              minHeight: '2px',
            }}
            title={point.label || point.value.toString()}
          />
        );
      })}
    </div>
  );
}

/**
 * Generate sparkline data from an array of numbers
 */
export function generateSparklineData(
  values: number[], 
  labels?: string[]
): SparklineDataPoint[] {
  return values.map((value, index) => ({
    value,
    label: labels?.[index],
  }));
}

/**
 * Generate trend data for last N days
 * Useful for mock data and testing
 */
export function generateTrendData(
  days: number = 30,
  baseValue: number = 100,
  volatility: number = 0.2
): SparklineDataPoint[] {
  const data: SparklineDataPoint[] = [];
  let currentValue = baseValue;

  for (let i = 0; i < days; i++) {
    // Add random walk with drift
    const change = (Math.random() - 0.45) * baseValue * volatility;
    currentValue = Math.max(0, currentValue + change);
    
    data.push({
      value: Math.round(currentValue),
      label: `Day ${i + 1}`,
    });
  }

  return data;
}
