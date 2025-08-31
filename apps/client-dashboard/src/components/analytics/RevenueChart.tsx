import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { RevenueAnalytics } from '@/types/analytics';

interface RevenueChartProps {
  data: RevenueAnalytics;
  comparisonData?: RevenueAnalytics;
  showComparison?: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  comparisonData,
  showComparison = false 
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const chartData = data[period] || [];
  const comparisonChartData = comparisonData?.[period] || [];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
      dataKey?: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface p-3 rounded-md shadow-elev-2 border border-surface-2">
          <p className="text-body-sm font-medium text-text mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-body-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-text-muted">{entry.dataKey}:</span>
              <span className="font-medium text-text">
                {entry.dataKey === 'revenue' || entry.dataKey === 'comparisonRevenue'
                  ? formatCurrency(entry.value || 0)
                  : entry.value?.toLocaleString() || 0
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getGrowthTrend = () => {
    if (chartData.length < 2) return { trend: 0, isPositive: true };
    
    const latest = chartData[chartData.length - 1]?.revenue || 0;
    const previous = chartData[chartData.length - 2]?.revenue || 0;
    
    if (previous === 0) return { trend: 0, isPositive: true };
    
    const trend = ((latest - previous) / previous) * 100;
    return { trend: Math.abs(trend), isPositive: trend >= 0 };
  };

  const getComparisonGrowth = () => {
    if (!showComparison || !comparisonData) return null;
    
    const currentTotal = data.totalRevenue;
    const previousTotal = comparisonData.totalRevenue;
    
    if (previousTotal === 0) return null;
    
    const growth = ((currentTotal - previousTotal) / previousTotal) * 100;
    return { growth: Math.abs(growth), isPositive: growth >= 0 };
  };

  const { trend, isPositive } = getGrowthTrend();
  const comparisonGrowth = getComparisonGrowth();

  // Combine current and comparison data for chart
  const combinedData = chartData.map((item, index) => ({
    ...item,
    comparisonRevenue: comparisonChartData[index]?.revenue || 0,
    comparisonCovers: comparisonChartData[index]?.covers || 0
  }));

  const periodLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };

  return (
    <Card className="bg-surface border-surface-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-h3">
              <DollarSign className="h-5 w-5 text-brand" />
              Revenue Analytics
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-h1 font-bold text-text font-tabular">
                {formatCurrency(data.totalRevenue)}
              </div>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger" />
                )}
                <span className={`text-body-sm font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {trend.toFixed(1)}%
                </span>
              </div>
              {comparisonGrowth && (
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  vs previous:
                  <span className={`font-medium ${comparisonGrowth.isPositive ? 'text-success' : 'text-danger'}`}>
                    {comparisonGrowth.isPositive ? '+' : '-'}{comparisonGrowth.growth.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex rounded-md bg-surface-2 border border-surface-3">
            {Object.entries(periodLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={period === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(key as 'daily' | 'weekly' | 'monthly')}
                className={`rounded-none border-0 text-xs ${
                  period === key 
                    ? 'bg-brand text-brand-foreground' 
                    : 'hover:bg-surface-3 text-text-muted'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-md bg-surface-2">
            <div className="text-h3 font-semibold text-text font-tabular">{data.totalCovers}</div>
            <div className="text-body-sm text-text-muted">Total Covers</div>
          </div>
          <div className="text-center p-3 rounded-md bg-surface-2">
            <div className="text-h3 font-semibold text-text font-tabular">
              {formatCurrency(data.averageSpendPerCover)}
            </div>
            <div className="text-body-sm text-text-muted">Avg Spend/Cover</div>
          </div>
          <div className="text-center p-3 rounded-md bg-surface-2">
            <div className="text-h3 font-semibold text-success font-tabular">{data.revenueGrowth}%</div>
            <div className="text-body-sm text-text-muted">Growth Rate</div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0}/>
                </linearGradient>
                {showComparison && (
                  <linearGradient id="comparisonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--text-muted))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--text-muted))" stopOpacity={0}/>
                  </linearGradient>
                )}
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--surface-3))" 
                strokeOpacity={0.6}
              />
              
              <XAxis 
                dataKey={period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'}
                stroke="hsl(var(--text-muted))"
                fontSize={12}
                fontFamily="var(--font-sans)"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              
              <YAxis 
                stroke="hsl(var(--text-muted))"
                fontSize={12}
                fontFamily="var(--font-sans)"
                tick={{ fill: 'hsl(var(--text-muted))' }}
                tickFormatter={formatCurrency}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {showComparison && (
                <Area
                  type="monotone"
                  dataKey="comparisonRevenue"
                  stroke="hsl(var(--text-muted))"
                  strokeWidth={1}
                  fill="url(#comparisonGradient)"
                  strokeDasharray="5 5"
                />
              )}
              
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--brand))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend positioned below chart, aligned left */}
        <div className="flex justify-start gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand rounded-full" />
            <span className="text-text-muted">Revenue</span>
          </div>
          {showComparison && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-text-muted rounded-full" />
              <span className="text-text-muted">Previous Period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;