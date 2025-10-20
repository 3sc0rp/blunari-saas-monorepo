import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  variant?: 'positive' | 'negative' | 'neutral' | 'auto';
  className?: string;
}

/**
 * TrendIndicator Component
 * 
 * Displays trend data with appropriate icon and color coding.
 * Used in metric cards to show performance changes.
 * 
 * @example
 * <TrendIndicator value={12} suffix="%" variant="auto" />
 * // Renders: ↑ 12% (green)
 * 
 * <TrendIndicator value={-5} suffix="%" variant="auto" />
 * // Renders: ↓ 5% (red)
 */
export function TrendIndicator({ 
  value, 
  suffix = '%', 
  variant = 'auto',
  className 
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  // Auto-determine variant based on value
  const effectiveVariant = variant === 'auto' 
    ? (isPositive ? 'positive' : isNeutral ? 'neutral' : 'negative')
    : variant;
  
  const variantStyles = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };
  
  const Icon = isPositive ? ArrowUp : value < 0 ? ArrowDown : Minus;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        variantStyles[effectiveVariant],
        className
      )}
      title={`${isPositive ? 'Increased' : value < 0 ? 'Decreased' : 'No change'} by ${Math.abs(value)}${suffix}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{Math.abs(value)}{suffix}</span>
    </span>
  );
}

/**
 * TrendBadge - Pill-style trend indicator
 */
interface TrendBadgeProps extends TrendIndicatorProps {
  label?: string;
}

export function TrendBadge({ label, value, suffix = '%', variant = 'auto', className }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const effectiveVariant = variant === 'auto' 
    ? (isPositive ? 'positive' : isNeutral ? 'neutral' : 'negative')
    : variant;
  
  const variantStyles = {
    positive: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    negative: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  };
  
  const Icon = isPositive ? ArrowUp : value < 0 ? ArrowDown : Minus;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
        variantStyles[effectiveVariant],
        className
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label && <span className="mr-1">{label}:</span>}
      <span>{Math.abs(value)}{suffix}</span>
    </span>
  );
}
