import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart } from 'recharts';
import { Clock, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { BookingPatterns } from '@/types/analytics';

interface BookingPatternsChartProps {
  data: BookingPatterns;
}

const BookingPatternsChart: React.FC<BookingPatternsChartProps> = ({ data }) => {
  const [activeChart, setActiveChart] = useState<'hours' | 'days' | 'sources'>('hours');

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Design system colors for charts
  const CHART_COLORS = {
    primary: 'hsl(var(--brand))',
    secondary: 'hsl(var(--accent))',
    tertiary: 'hsl(var(--secondary))',
    quaternary: 'hsl(var(--success))',
    quinary: 'hsl(var(--warning))',
  };

  const PIE_COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.tertiary,
    CHART_COLORS.quaternary,
    CHART_COLORS.quinary,
  ];

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
              <span className="text-text-muted">
                {entry.dataKey === 'utilization' 
                  ? 'Utilization:'
                  : entry.dataKey === 'revenue'
                  ? 'Revenue:'
                  : 'Bookings:'
                }
              </span>
              <span className="font-medium text-text font-tabular">
                {entry.dataKey === 'utilization' 
                  ? `${entry.value}%`
                  : entry.dataKey === 'revenue'
                  ? `$${entry.value.toLocaleString()}`
                  : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'hours':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.peakHours}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--surface-3))" 
                strokeOpacity={0.6}
              />
              <XAxis 
                dataKey="hour" 
                tickFormatter={formatHour}
                stroke="hsl(var(--text-muted))"
                fontSize={12}
                fontFamily="var(--font-sans)"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="hsl(var(--text-muted))"
                fontSize={12}
                fontFamily="var(--font-sans)"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--text-muted))"
                fontSize={12}
                fontFamily="var(--font-sans)"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="bookings" 
                fill={CHART_COLORS.primary} 
                radius={[4, 4, 0, 0]}
                yAxisId="left"
              />
              <Line 
                dataKey="utilization" 
                stroke={CHART_COLORS.secondary} 
                strokeWidth={3}
                yAxisId="right"
                type="monotone"
                dot={{ fill: CHART_COLORS.secondary, strokeWidth: 0, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'days':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dayOfWeek}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--surface-3))" 
                strokeOpacity={0.6}
              />
              <XAxis 
                dataKey="day" 
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="bookings" 
                fill={CHART_COLORS.primary} 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="revenue" 
                fill={CHART_COLORS.secondary} 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'sources':
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="50%" height={300}>
              <PieChart>
                <Pie
                  data={data.sourcePerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="bookings"
                >
                  {data.sourcePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-50% pl-8">
              <div className="space-y-3">
                {data.sourcePerformance.map((source, index) => (
                  <div key={source.source} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="text-body-sm font-medium text-text capitalize">{source.source}</div>
                      <div className="text-xs text-text-muted">
                        {source.bookings} bookings • ${source.revenue.toLocaleString()} revenue
                      </div>
                      <div className="text-xs text-success font-tabular">
                        {source.conversionRate}% conversion
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getChartStats = () => {
    switch (activeChart) {
      case 'hours': {
        const peakHour = data.peakHours.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.peakHours[0] || { hour: 0, bookings: 0 });
        return {
          title: "Peak Hour",
          value: formatHour(peakHour?.hour || 0),
          subtitle: `${peakHour?.bookings || 0} bookings`
        };
      }

      case 'days': {
        const peakDay = data.dayOfWeek.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.dayOfWeek[0] || { day: 'Monday', bookings: 0 });
        return {
          title: "Busiest Day",
          value: peakDay?.day || 'Monday',
          subtitle: `${peakDay?.bookings || 0} bookings`
        };
      }

      case 'sources': {
        const topSource = data.sourcePerformance.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.sourcePerformance[0] || { source: 'website', bookings: 0 });
        return {
          title: "Top Source",
          value: topSource?.source?.charAt(0).toUpperCase() + topSource?.source?.slice(1) || 'Website',
          subtitle: `${topSource?.bookings || 0} bookings`
        };
      }

      default:
        return { title: "", value: "", subtitle: "" };
    }
  };

  const stats = getChartStats();

  const chartTabs = [
    { key: 'hours', label: 'Hours', icon: Clock },
    { key: 'days', label: 'Days', icon: Calendar },
    { key: 'sources', label: 'Sources', icon: TrendingUp }
  ];

  return (
    <Card className="bg-surface border-surface-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-h3">
              <BarChart3 className="h-5 w-5 text-brand" />
              Booking Patterns
            </CardTitle>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-h2 font-bold text-text font-tabular">{stats.value}</div>
                <div className="text-body-sm text-text-muted">{stats.title}</div>
              </div>
              <div className="text-body-sm text-text-muted">{stats.subtitle}</div>
            </div>
          </div>
          
          <div className="flex rounded-md bg-surface-2 border border-surface-3">
            {chartTabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeChart === tab.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveChart(tab.key as 'hours' | 'days' | 'sources')}
                className={`rounded-none border-0 text-xs ${
                  activeChart === tab.key 
                    ? 'bg-brand text-brand-foreground' 
                    : 'hover:bg-surface-3 text-text-muted'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {renderChart()}
        
        {/* Legend positioned below chart, aligned left */}
        <div className="flex justify-start gap-6 mt-4 text-sm">
          {activeChart === 'hours' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand rounded-full" />
                <span className="text-text-muted">Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded-full" />
                <span className="text-text-muted">Utilization %</span>
              </div>
            </>
          )}
          {activeChart === 'days' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand rounded-full" />
                <span className="text-text-muted">Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded-full" />
                <span className="text-text-muted">Revenue</span>
              </div>
            </>
          )}
          {activeChart === 'sources' && (
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Distribution by booking source</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingPatternsChart;