import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: 'number' | 'currency' | 'percent';
  separator?: boolean;
}

/**
 * AnimatedCounter Component
 * 
 * Smoothly animates number changes using spring physics.
 * Creates engaging visual feedback when metrics update.
 * 
 * Features:
 * - Spring-based animation (natural feel)
 * - Format support (number, currency, percent)
 * - Thousand separators
 * - Configurable decimals
 * - Custom prefix/suffix
 * 
 * @example
 * <AnimatedCounter 
 *   value={1234.56} 
 *   format="currency"
 *   duration={1000}
 * />
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  format = 'number',
  separator = true,
}: AnimatedCounterProps) {
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration,
  });

  const prevValue = useRef(0);

  useEffect(() => {
    springValue.set(value);
    prevValue.current = value;
  }, [value, springValue]);

  const display = useTransform(springValue, (latest) => {
    // Format the number based on type
    let formatted: string;

    switch (format) {
      case 'currency':
        formatted = formatCurrency(latest, decimals, separator);
        break;
      case 'percent':
        formatted = formatPercent(latest, decimals);
        break;
      default:
        formatted = formatNumber(latest, decimals, separator);
    }

    return `${prefix}${formatted}${suffix}`;
  });

  return (
    <motion.span 
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

/**
 * StatCard Component with Animated Counter
 * 
 * Pre-built card component with animated counter, label, and optional trend.
 */
interface StatCardProps {
  label: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <motion.div
      className={cn(
        "p-6 rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <AnimatedCounter
          value={value}
          format={format}
          className="text-2xl font-bold"
          decimals={format === 'currency' ? 2 : 0}
        />
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend.isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
          )}>
            <span>{trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%</span>
            {trend.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Helper formatting functions

function formatNumber(value: number, decimals: number, separator: boolean): string {
  const fixed = value.toFixed(decimals);
  
  if (!separator) return fixed;
  
  const [integer, decimal] = fixed.split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return decimals > 0 ? `${formatted}.${decimal}` : formatted;
}

function formatCurrency(value: number, decimals: number, separator: boolean): string {
  const formatted = formatNumber(Math.abs(value), decimals, separator);
  return `$${formatted}`;
}

function formatPercent(value: number, decimals: number): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * AnimatedMetricChange Component
 * 
 * Shows the delta between old and new values with smooth animation.
 */
interface AnimatedMetricChangeProps {
  oldValue: number;
  newValue: number;
  format?: 'number' | 'currency' | 'percent';
  className?: string;
}

export function AnimatedMetricChange({
  oldValue,
  newValue,
  format = 'number',
  className,
}: AnimatedMetricChangeProps) {
  const change = newValue - oldValue;
  const percentChange = oldValue !== 0 ? (change / oldValue) * 100 : 0;
  const isPositive = change >= 0;

  if (change === 0) return null;

  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500",
        className
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <span>{isPositive ? '↑' : '↓'}</span>
      <AnimatedCounter
        value={Math.abs(change)}
        format={format}
        decimals={format === 'currency' ? 2 : 0}
      />
      <span className="text-xs text-muted-foreground">
        ({isPositive ? '+' : ''}{percentChange.toFixed(1)}%)
      </span>
    </motion.div>
  );
}
