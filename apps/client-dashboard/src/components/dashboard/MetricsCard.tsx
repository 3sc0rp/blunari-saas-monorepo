import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  format?: 'currency' | 'percentage' | 'number';
  subtitle?: string;
  tooltip?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color,
  bgColor,
  format = 'number',
  subtitle,
  tooltip
}) => {
  const formatValue = (val: string | number) => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return `$${numVal.toLocaleString()}`;
      case 'percentage':
        return `${numVal.toFixed(1)}%`;
      default:
        return numVal.toLocaleString();
    }
  };

  const getTrendInfo = () => {
    if (trend === 0) {
      return {
        icon: Minus,
        color: 'text-text-muted',
        text: 'No change',
        bgColor: 'bg-surface-3'
      };
    }
    
    const isPositive = trend > 0;
    return {
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-success' : 'text-destructive',
      text: `${isPositive ? '+' : ''}${trend > 1 ? trend.toFixed(0) : trend.toFixed(1)}${format === 'percentage' ? 'pp' : ''}`,
      bgColor: isPositive ? 'bg-success/10' : 'bg-destructive/10'
    };
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  // Generate tooltip text based on metric type
  const getDefaultTooltip = () => {
    switch (format) {
      case 'currency':
        return `Revenue generated ${subtitle?.includes('month') ? 'this month' : 'today'}. Trend shows change compared to previous period.`;
      case 'percentage':
        if (title.toLowerCase().includes('utilization')) {
          return 'Percentage of tables currently occupied. Higher utilization indicates better efficiency.';
        }
        if (title.toLowerCase().includes('no-show')) {
          return 'Percentage of bookings where customers did not show up. Lower rates are better.';
        }
        return 'Percentage-based metric showing current performance level.';
      default:
        if (title.toLowerCase().includes('booking')) {
          return 'Number of confirmed reservations. Includes walk-ins and advance bookings.';
        }
        return 'Numerical metric tracking key performance indicator.';
    }
  };

  const tooltipText = tooltip || getDefaultTooltip();

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden bg-surface border-surface-2 hover:shadow-elev-2 transition-all duration-300 group hover:scale-[1.02] hover:border-brand/20">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-transparent to-surface-2 opacity-50"></div>
        
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-body-sm font-medium text-text-muted">
              {title}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Info className="h-3 w-3 text-text-subtle hover:text-text-muted" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-60">
                <p className="text-xs">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </CardHeader>
        
        {/* Separator line */}
        <div className="h-px bg-gradient-to-r from-transparent via-surface-3 to-transparent mx-6"></div>
        
        <CardContent className="relative pt-4">
          <div className="space-y-3">
            <div className="text-h2 font-bold text-text font-tabular tracking-tight">
              {formatValue(value)}
            </div>
            {subtitle && (
              <p className="text-xs text-text-muted">{subtitle}</p>
            )}
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${trendInfo.bgColor} ${trendInfo.color} border-0 text-xs font-medium`}
              >
                <TrendIcon className="h-3 w-3" />
                <span className="font-tabular">{trendInfo.text}</span>
              </Badge>
              <span className="text-xs text-text-subtle">vs yesterday</span>
            </div>
          </div>
        </CardContent>
        
        {/* Bottom accent border */}
        <div className={`h-1 ${bgColor} opacity-60`}></div>
      </Card>
    </TooltipProvider>
  );
};

export default MetricsCard;