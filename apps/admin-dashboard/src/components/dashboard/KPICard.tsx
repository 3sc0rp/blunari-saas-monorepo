import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  loading?: boolean;
  className?: string;
  format?: 'number' | 'currency' | 'percentage';
  accessibilityLabel?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading = false,
  className,
  format = 'number',
  accessibilityLabel
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-success bg-success/10 border-success/20';
      case 'down':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      default:
        return 'text-muted-foreground bg-muted/50 border-muted/20';
    }
  };

  if (loading) {
    return (
      <Card className={className} role="status" aria-label="Loading metric data">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn('transition-all hover:shadow-md', className)}
      role="article"
      aria-label={accessibilityLabel || `${title}: ${formatValue(value)}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon 
          className="h-4 w-4 text-muted-foreground" 
          aria-hidden="true"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold" aria-live="polite">
            {formatValue(value)}
          </div>
          
          <div className="flex items-center justify-between">
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            
            {trend && (
              <Badge 
                variant="outline" 
                className={cn('text-xs', getTrendColor())}
                aria-label={`Trend: ${trend.direction} ${trend.value}% ${trend.label}`}
              >
                {getTrendIcon()}
                <span className="ml-1">
                  {trend.direction !== 'neutral' && (trend.direction === 'up' ? '+' : '-')}
                  {Math.abs(trend.value)}% {trend.label}
                </span>
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};