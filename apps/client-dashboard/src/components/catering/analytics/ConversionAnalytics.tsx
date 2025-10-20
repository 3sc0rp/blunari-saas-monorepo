/**
 * Conversion Analytics Component
 * 
 * Displays conversion funnel and stage-by-stage metrics
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useConversionFunnel, formatPercentage, getStatusColor } from '@/hooks/useAdvancedAnalytics';

interface ConversionAnalyticsProps {
  tenantId: string;
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  quote_sent: 'Quote Sent',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ConversionAnalytics({ tenantId }: ConversionAnalyticsProps) {
  const { data: funnelData, isLoading } = useConversionFunnel(tenantId);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  // Filter out cancelled for main funnel
  const mainFunnel = funnelData?.filter(stage => stage.status !== 'cancelled') || [];
  const cancelledStage = funnelData?.find(stage => stage.status === 'cancelled');

  // Calculate overall conversion rate (inquiry to completed)
  const inquiryCount = funnelData?.find(s => s.status === 'inquiry')?.order_count || 0;
  const completedCount = funnelData?.find(s => s.status === 'completed')?.order_count || 0;
  const overallConversionRate = inquiryCount ? (completedCount / inquiryCount) * 100 : 0;

  // Find worst performing stage
  const worstStage = mainFunnel.reduce((worst, current) => {
    if (!current.conversion_rate || !worst.conversion_rate) return worst;
    return current.conversion_rate < worst.conversion_rate ? current : worst;
  }, mainFunnel[0]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              Overall Conversion Rate
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{formatPercentage(overallConversionRate)}</div>
              {overallConversionRate >= 20 ? (
                <Badge variant="default" className="ml-2">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Good
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  Low
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {completedCount} completed of {inquiryCount} inquiries
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weakest Stage</CardTitle>
            <div className="text-lg font-bold">
              {worstStage ? STATUS_LABELS[worstStage.status] : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">
              {worstStage?.conversion_rate ? formatPercentage(worstStage.conversion_rate) : ''} conversion
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <div className="text-2xl font-bold">
              {cancelledStage ? formatPercentage(cancelledStage.percentage) : '0%'}
            </div>
            <p className="text-sm text-muted-foreground">
              {cancelledStage?.order_count || 0} cancelled orders
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Order progression through pipeline stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mainFunnel.map((stage, index) => {
              const maxCount = mainFunnel[0]?.order_count || 1;
              const percentage = (stage.order_count / maxCount) * 100;
              
              return (
                <div key={stage.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(stage.status)}`} />
                      <span className="font-medium">{STATUS_LABELS[stage.status]}</span>
                      {stage.conversion_rate !== null && index > 0 && (
                        <Badge 
                          variant={stage.conversion_rate >= 50 ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {formatPercentage(stage.conversion_rate)} conversion
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-muted-foreground">
                        {stage.order_count} orders ({formatPercentage(stage.percentage)})
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-8" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stage-by-Stage Conversion Rates</CardTitle>
          <CardDescription>Conversion rate from previous stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mainFunnel.filter(s => s.conversion_rate !== null)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="status" 
                tickFormatter={(value) => STATUS_LABELS[value]}
              />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(1)}%`}
                labelFormatter={(label) => STATUS_LABELS[label]}
              />
              <Bar dataKey="conversion_rate" name="Conversion Rate">
                {mainFunnel.filter(s => s.conversion_rate !== null).map((entry, index) => {
                  const color = entry.conversion_rate && entry.conversion_rate >= 50 ? '#10b981' : '#ef4444';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Order Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Distribution by Stage</CardTitle>
          <CardDescription>Number of orders at each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="status" 
                tickFormatter={(value) => STATUS_LABELS[value]}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => value}
                labelFormatter={(label) => STATUS_LABELS[label]}
              />
              <Bar dataKey="order_count" name="Orders">
                {funnelData?.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'cancelled' ? '#ef4444' : '#8b5cf6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Stage Metrics</CardTitle>
          <CardDescription>Comprehensive breakdown of each funnel stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData?.map((stage) => (
              <div 
                key={stage.status} 
                className="p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(stage.status)}`} />
                    <h4 className="font-semibold">{STATUS_LABELS[stage.status]}</h4>
                  </div>
                  <Badge variant="outline">{stage.order_count} orders</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Percentage of Total</p>
                    <p className="font-bold">{formatPercentage(stage.percentage)}</p>
                  </div>
                  {stage.conversion_rate !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Conversion from Previous</p>
                      <p className="font-bold">{formatPercentage(stage.conversion_rate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Order Count</p>
                    <p className="font-bold">{stage.order_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
