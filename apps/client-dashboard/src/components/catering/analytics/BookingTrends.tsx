/**
 * Booking Trends Component
 * 
 * Displays booking patterns by time, day of week, and event type
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import {
  useHourlyPatterns,
  useDayOfWeekPatterns,
  useEventTypeAnalysis,
  formatCurrency,
} from '@/hooks/useAdvancedAnalytics';

interface BookingTrendsProps {
  tenantId: string;
}

export default function BookingTrends({ tenantId }: BookingTrendsProps) {
  const { data: hourlyData, isLoading: hourlyLoading } = useHourlyPatterns(tenantId);
  const { data: dowData, isLoading: dowLoading } = useDayOfWeekPatterns(tenantId);
  const { data: eventData, isLoading: eventLoading } = useEventTypeAnalysis(tenantId);

  if (hourlyLoading || dowLoading || eventLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  // Calculate peak booking time
  const peakHour = hourlyData?.reduce((prev, current) => 
    prev.booking_count > current.booking_count ? prev : current
  );

  // Calculate peak day
  const peakDay = dowData?.reduce((prev, current) => 
    prev.booking_count > current.booking_count ? prev : current
  );

  // Top event type
  const topEvent = eventData?.[0];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Peak Booking Hour
            </CardTitle>
            <div className="text-2xl font-bold">
              {peakHour ? `${peakHour.hour_of_day}:00` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">
              {peakHour ? `${peakHour.booking_count} bookings` : ''}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Peak Booking Day
            </CardTitle>
            <div className="text-2xl font-bold">
              {peakDay ? peakDay.day_name.trim() : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">
              {peakDay ? `${peakDay.booking_count} bookings` : ''}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Top Event Type
            </CardTitle>
            <div className="text-lg font-bold truncate">
              {topEvent ? topEvent.event_type : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">
              {topEvent ? formatCurrency(topEvent.total_revenue) : ''}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Hourly Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Booking Patterns</CardTitle>
          <CardDescription>Bookings by hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour_of_day" 
                tickFormatter={(value) => `${value}:00`}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `${value}:00`}
                formatter={(value: number, name: string) => [
                  name === 'avg_order_value' ? formatCurrency(value) : value,
                  name === 'avg_order_value' ? 'Avg Order Value' : 'Bookings'
                ]}
              />
              <Legend />
              <Bar dataKey="booking_count" fill="#8b5cf6" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Day of Week Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Day of Week Patterns</CardTitle>
          <CardDescription>Bookings and revenue by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day_name" 
                tickFormatter={(value) => value.trim().substring(0, 3)}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'total_revenue' ? formatCurrency(value) : value,
                  name === 'total_revenue' ? 'Revenue' : 'Bookings'
                ]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="booking_count" fill="#8b5cf6" name="Bookings" />
              <Bar yAxisId="right" dataKey="total_revenue" fill="#3b82f6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Event Type Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type Performance</CardTitle>
          <CardDescription>Revenue and metrics by event type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={eventData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis dataKey="event_type" type="category" width={120} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="total_revenue" fill="#8b5cf6" name="Revenue" />
              <Bar dataKey="avg_order_value" fill="#3b82f6" name="Avg Order Value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Event Type Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type Comparison</CardTitle>
          <CardDescription>Multi-dimensional view of event performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={eventData?.slice(0, 6)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="event_type" />
              <PolarRadiusAxis />
              <Radar 
                name="Order Count" 
                dataKey="order_count" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Avg Guest Count" 
                dataKey="avg_guest_count" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3} 
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
