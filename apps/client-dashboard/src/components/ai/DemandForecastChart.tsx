/**
 * Demand Forecast Chart Component
 * 
 * Visualizes demand predictions with confidence intervals using Recharts.
 */

import React from 'react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { useDemandForecast, useForecastAccuracy } from '@/hooks/ai/useDemandForecast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DemandForecastChartProps {
  tenantId: string;
  packageId?: string;
}

export function DemandForecastChart({ tenantId, packageId }: DemandForecastChartProps) {
  const {
    forecasts,
    summary,
    isLoading,
    error,
    generateForecast,
    isGenerating,
  } = useDemandForecast(tenantId, packageId);

  const {
    metrics,
    isLoading: isLoadingMetrics,
  } = useForecastAccuracy(tenantId);

  const handleGenerateForecast = () => {
    generateForecast({
      tenant_id: tenantId,
      package_id: packageId,
      days_ahead: 30,
      include_confidence_interval: true,
    });
  };

  // Transform data for chart
  const chartData = forecasts?.map((f) => ({
    date: new Date(f.forecast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    predicted: f.predicted_orders,
    lower: f.confidence_interval_lower,
    upper: f.confidence_interval_upper,
    revenue: f.predicted_revenue,
  })) || [];

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load demand forecasts. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Demand Forecast</h2>
          <p className="text-muted-foreground">
            AI-powered predictions for the next 30 days
          </p>
        </div>
        <Button
          onClick={handleGenerateForecast}
          disabled={isGenerating || isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate Forecast'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next 7 Days</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.next_7_days.reduce((sum, f) => sum + f.predicted_orders, 0)} orders
              </div>
              <p className="text-xs text-muted-foreground">
                ${summary.next_7_days.reduce((sum, f) => sum + f.predicted_revenue, 0).toFixed(0)} revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next 30 Days</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_predicted_orders} orders
              </div>
              <p className="text-xs text-muted-foreground">
                Avg {summary.avg_daily_orders} orders/day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary.total_predicted_revenue.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                ${(summary.total_predicted_revenue / summary.total_predicted_orders).toFixed(0)} avg order
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accuracy Metrics */}
      {metrics && !isLoadingMetrics && metrics.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Forecast Accuracy</CardTitle>
            <CardDescription>Based on {metrics.count} past predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={metrics.accuracy > 0.8 ? 'default' : 'secondary'}>
                {(metrics.accuracy * 100).toFixed(1)}% Accurate
              </Badge>
              <span className="text-sm text-muted-foreground">
                MAE: {metrics.mae.toFixed(1)} orders
              </span>
              <span className="text-sm text-muted-foreground">
                MAPE: {metrics.mape.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {forecasts && forecasts.length > 0 ? (
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders Forecast</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Predicted Orders</CardTitle>
                <CardDescription>
                  Daily order predictions with 95% confidence interval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="hsl(var(--background))"
                      name="Lower Bound"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      name="Predicted Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Predicted Revenue</CardTitle>
                <CardDescription>
                  Daily revenue predictions based on historical averages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                      name="Predicted Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Forecasts Available</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Generate your first demand forecast to see AI-powered predictions for order volume and revenue.
            </p>
            <Button onClick={handleGenerateForecast} disabled={isGenerating}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate Forecast
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
