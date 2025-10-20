/**
 * Advanced Analytics Dashboard
 * 
 * Comprehensive analytics view with:
 * - Revenue forecasting with trend visualization
 * - Customer segmentation (RFM analysis)
 * - Package performance breakdown
 * - Booking trend analysis
 * - Conversion funnel metrics
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Calendar,
  DollarSign,
  Activity,
  Target,
} from 'lucide-react';
import {
  useDailyRevenue,
  useMonthlyRevenue,
  useRevenueForecast,
  useCustomerRFM,
  useSegmentDistribution,
  formatCurrency,
  formatPercentage,
  calculatePercentageChange,
  getSegmentColor,
} from '@/hooks/useAdvancedAnalytics';
import PackageAnalytics from './PackageAnalytics';
import BookingTrends from './BookingTrends';
import ConversionAnalytics from './ConversionAnalytics';

interface AdvancedAnalyticsDashboardProps {
  tenantId: string;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export default function AdvancedAnalyticsDashboard({ tenantId }: AdvancedAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'30' | '60' | '90'>('30');
  const [forecastDays, setForecastDays] = useState<'30' | '60' | '90'>('30');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            Deep insights into revenue, customers, and performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">
            <DollarSign className="mr-2 h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="mr-2 h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="mr-2 h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="trends">
            <Calendar className="mr-2 h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="conversion">
            <Target className="mr-2 h-4 w-4" />
            Conversion
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <RevenueAnalytics 
            tenantId={tenantId} 
            days={parseInt(timeRange)}
            forecastDays={parseInt(forecastDays)}
            onForecastDaysChange={(days) => setForecastDays(days as any)}
          />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <CustomerSegmentation tenantId={tenantId} />
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <PackageAnalytics tenantId={tenantId} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <BookingTrends tenantId={tenantId} />
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-4">
          <ConversionAnalytics tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// REVENUE ANALYTICS COMPONENT
// ============================================================================

interface RevenueAnalyticsProps {
  tenantId: string;
  days: number;
  forecastDays: number;
  onForecastDaysChange: (days: number) => void;
}

function RevenueAnalytics({ tenantId, days, forecastDays, onForecastDaysChange }: RevenueAnalyticsProps) {
  const { data: dailyRevenue, isLoading: dailyLoading } = useDailyRevenue(tenantId, days);
  const { data: monthlyRevenue, isLoading: monthlyLoading } = useMonthlyRevenue(tenantId, 12);
  const { data: forecast, isLoading: forecastLoading } = useRevenueForecast(tenantId, forecastDays);

  // Calculate summary stats
  const totalRevenue = dailyRevenue?.reduce((sum, day) => sum + day.total_revenue, 0) || 0;
  const avgDailyRevenue = dailyRevenue?.length ? totalRevenue / dailyRevenue.length : 0;
  const totalOrders = dailyRevenue?.reduce((sum, day) => sum + day.orders_count, 0) || 0;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // Calculate trend
  const recentRevenue = dailyRevenue?.slice(-7).reduce((sum, day) => sum + day.total_revenue, 0) || 0;
  const previousRevenue = dailyRevenue?.slice(-14, -7).reduce((sum, day) => sum + day.total_revenue, 0) || 0;
  const trendPercentage = calculatePercentageChange(recentRevenue, previousRevenue);

  if (dailyLoading || monthlyLoading || forecastLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              {trendPercentage !== 0 && (
                <Badge variant={trendPercentage > 0 ? 'default' : 'destructive'} className="ml-2">
                  {trendPercentage > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                  {formatPercentage(Math.abs(trendPercentage))}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Revenue</CardTitle>
            <div className="text-2xl font-bold">{formatCurrency(avgDailyRevenue)}</div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Daily Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
          <CardDescription>Revenue over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Area type="monotone" dataKey="total_revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>Projected revenue with confidence intervals</CardDescription>
            </div>
            <Select value={forecastDays.toString()} onValueChange={(value) => onForecastDaysChange(parseInt(value))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="forecast_date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Legend />
              <Area type="monotone" dataKey="confidence_upper" stroke="#e0e7ff" fill="#e0e7ff" fillOpacity={0.3} name="Upper Confidence" />
              <Area type="monotone" dataKey="forecasted_revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} name="Forecast" />
              <Area type="monotone" dataKey="confidence_lower" stroke="#e0e7ff" fill="#ffffff" fillOpacity={0.3} name="Lower Confidence" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Revenue by month for the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              />
              <Bar dataKey="total_revenue" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// CUSTOMER SEGMENTATION COMPONENT
// ============================================================================

function CustomerSegmentation({ tenantId }: { tenantId: string }) {
  const { data: rfmData, isLoading: rfmLoading } = useCustomerRFM(tenantId);
  const { data: segmentDist, isLoading: distLoading } = useSegmentDistribution(tenantId);

  if (rfmLoading || distLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const topCustomers = rfmData?.slice(0, 10) || [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Segment Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>RFM (Recency, Frequency, Monetary) segmentation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segmentDist}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ segment, percent }: any) => `${segment}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="segment"
              >
                {segmentDist?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Highest value customers by RFM score</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.customer_email} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{customer.customer_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getSegmentColor(customer.customer_segment)}>
                      {customer.customer_segment}
                    </Badge>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(customer.monetary_value)}</p>
                      <p className="text-sm text-muted-foreground">{customer.frequency} orders</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
