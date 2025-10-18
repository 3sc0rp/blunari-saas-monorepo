import React from 'react';
import { useCateringAnalytics } from '@/hooks/useCateringAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Calendar,
  Star,
  Activity,
} from 'lucide-react';

interface CateringAnalyticsDashboardProps {
  tenantId: string;
}

export function CateringAnalyticsDashboard({ tenantId }: CateringAnalyticsDashboardProps) {
  const { analytics, isLoading } = useCateringAnalytics(tenantId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const orderMetrics = analytics?.orders || {
    total: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    inquiry: 0,
    quoted: 0,
    conversion_rate: 0,
    average_lead_time: 0,
    guest_count_total: 0,
    average_guest_count: 0,
  };

  const revenueMetrics = analytics?.revenue || {
    total: 0,
    confirmed: 0,
    completed: 0,
    pending: 0,
    average_order_value: 0,
    deposits_collected: 0,
    deposits_pending: 0,
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderMetrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {orderMetrics.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(revenueMetrics.total / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(revenueMetrics.average_order_value / 100).toFixed(2)} avg order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests Served</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderMetrics.guest_count_total}</div>
            <p className="text-xs text-muted-foreground">
              {orderMetrics.average_guest_count.toFixed(0)} avg per event
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(orderMetrics.conversion_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Inquiry to confirmed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
          <CardDescription>Current distribution of catering orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{orderMetrics.inquiry}</div>
              <div className="text-xs text-muted-foreground">Inquiry</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{orderMetrics.quoted}</div>
              <div className="text-xs text-muted-foreground">Quoted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{orderMetrics.confirmed}</div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {orderMetrics.total - orderMetrics.completed - orderMetrics.cancelled}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{orderMetrics.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{orderMetrics.cancelled}</div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Financial overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confirmed Revenue</span>
              <span className="font-semibold">${(revenueMetrics.confirmed / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed Revenue</span>
              <span className="font-semibold">${(revenueMetrics.completed / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Revenue</span>
              <span className="font-semibold text-yellow-600">
                ${(revenueMetrics.pending / 100).toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-semibold">Total Pipeline</span>
              <span className="text-lg font-bold text-primary">
                ${(revenueMetrics.total / 100).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposits</CardTitle>
            <CardDescription>Deposit collection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Collected</span>
              <span className="font-semibold text-green-600">
                ${(revenueMetrics.deposits_collected / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-semibold text-orange-600">
                ${(revenueMetrics.deposits_pending / 100).toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="text-xs text-muted-foreground mb-2">Collection Rate</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{
                    width: `${((revenueMetrics.deposits_collected / (revenueMetrics.deposits_collected + revenueMetrics.deposits_pending)) * 100) || 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Packages (if available) */}
      {analytics?.performance?.popular_packages && analytics.performance.popular_packages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Packages</CardTitle>
            <CardDescription>Best-selling catering packages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.performance.popular_packages.slice(0, 5).map((pkg, index) => (
                <div key={pkg.package_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.count} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(pkg.revenue / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

