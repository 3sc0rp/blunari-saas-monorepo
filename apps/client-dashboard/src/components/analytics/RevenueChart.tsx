import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { RevenueAnalytics } from '@/types/analytics';

interface RevenueChartProps {
  data: RevenueAnalytics;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const chartData = data[period] || [];
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-card-foreground">{label}</p>
          <p className="text-success">
            Revenue: {formatCurrency(payload[0]?.value || 0)}
          </p>
          <p className="text-muted-foreground">
            Covers: {payload[1]?.value || 0}
          </p>
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

  const { trend, isPositive } = getGrowthTrend();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Revenue Analytics
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(data.totalRevenue)}
              </div>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={period === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('daily')}
            >
              Daily
            </Button>
            <Button
              variant={period === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </Button>
            <Button
              variant={period === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{data.totalCovers}</div>
            <div className="text-sm text-muted-foreground">Total Covers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {formatCurrency(data.averageSpendPerCover)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Spend/Cover</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-success">{data.revenueGrowth}%</div>
            <div className="text-sm text-muted-foreground">Growth Rate</div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
              <Line
                type="monotone"
                dataKey="covers"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 0, r: 4 }}
                yAxisId="covers"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;