import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
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

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(var(--success))',
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-card-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'utilization' 
                ? `Utilization: ${entry.value}%`
                : entry.dataKey === 'revenue'
                ? `Revenue: $${entry.value.toLocaleString()}`
                : `Bookings: ${entry.value}`
              }
            </p>
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
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={formatHour}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line 
                dataKey="utilization" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                yAxisId="right"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'days':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-50% pl-8">
              <div className="space-y-3">
                {data.sourcePerformance.map((source, index) => (
                  <div key={source.source} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="font-medium capitalize">{source.source}</div>
                      <div className="text-sm text-muted-foreground">
                        {source.bookings} bookings • ${source.revenue.toLocaleString()} revenue
                      </div>
                      <div className="text-xs text-success">
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
      case 'hours':
        const peakHour = data.peakHours.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.peakHours[0] || { hour: 0, bookings: 0 });
        return {
          title: "Peak Hour",
          value: formatHour(peakHour?.hour || 0),
          subtitle: `${peakHour?.bookings || 0} bookings`
        };

      case 'days':
        const peakDay = data.dayOfWeek.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.dayOfWeek[0] || { day: 'Monday', bookings: 0 });
        return {
          title: "Busiest Day",
          value: peakDay?.day || 'Monday',
          subtitle: `${peakDay?.bookings || 0} bookings`
        };

      case 'sources':
        const topSource = data.sourcePerformance.reduce((max, current) => 
          current.bookings > max.bookings ? current : max, data.sourcePerformance[0] || { source: 'website', bookings: 0 });
        return {
          title: "Top Source",
          value: topSource?.source?.charAt(0).toUpperCase() + topSource?.source?.slice(1) || 'Website',
          subtitle: `${topSource?.bookings || 0} bookings`
        };

      default:
        return { title: "", value: "", subtitle: "" };
    }
  };

  const stats = getChartStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Booking Patterns
            </CardTitle>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xl font-bold text-foreground">{stats.value}</div>
                <div className="text-sm text-muted-foreground">{stats.title}</div>
              </div>
              <div className="text-sm text-muted-foreground">{stats.subtitle}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeChart === 'hours' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('hours')}
            >
              <Clock className="h-4 w-4 mr-1" />
              Hours
            </Button>
            <Button
              variant={activeChart === 'days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('days')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Days
            </Button>
            <Button
              variant={activeChart === 'sources' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('sources')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Sources
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default BookingPatternsChart;