import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  format?: 'currency' | 'percentage' | 'number';
  subtitle?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color,
  bgColor,
  format = 'number',
  subtitle
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
        color: 'text-muted-foreground',
        text: 'No change',
        bgColor: 'bg-muted/20'
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

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {formatValue(value)}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${trendInfo.bgColor} ${trendInfo.color} border-0`}
            >
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{trendInfo.text}</span>
            </Badge>
            <span className="text-xs text-muted-foreground">vs yesterday</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;