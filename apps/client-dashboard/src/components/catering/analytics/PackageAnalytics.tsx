/**
 * Package Analytics Component
 * 
 * Displays package performance metrics with charts
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
import { usePackagePerformance, formatCurrency, formatPercentage } from '@/hooks/useAdvancedAnalytics';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface PackageAnalyticsProps {
  tenantId: string;
}

export default function PackageAnalytics({ tenantId }: PackageAnalyticsProps) {
  const { data: packages, isLoading } = usePackagePerformance(tenantId);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const topPackages = packages?.slice(0, 5) || [];
  const totalRevenue = packages?.reduce((sum, pkg) => sum + pkg.total_revenue, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Total Packages
            </CardTitle>
            <div className="text-2xl font-bold">{packages?.length || 0}</div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Total Revenue
            </CardTitle>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Package</CardTitle>
            <div className="text-lg font-bold truncate">{topPackages[0]?.package_name || 'N/A'}</div>
            <p className="text-sm text-muted-foreground">{formatCurrency(topPackages[0]?.total_revenue || 0)}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Revenue Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Package</CardTitle>
          <CardDescription>Distribution of revenue across packages</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topPackages}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ package_name, revenue_percentage }: any) => 
                  `${package_name}: ${revenue_percentage.toFixed(1)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="total_revenue"
                nameKey="package_name"
              >
                {topPackages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Package Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Package Performance</CardTitle>
          <CardDescription>Orders and revenue by package</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={packages} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis dataKey="package_name" type="category" width={150} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total_revenue" fill="#8b5cf6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Package Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Package Details</CardTitle>
          <CardDescription>Comprehensive package metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {packages?.map((pkg, index) => (
                <div key={pkg.package_id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{pkg.package_name}</h4>
                        <p className="text-sm text-muted-foreground">{pkg.package_category}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{pkg.order_count} orders</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="font-bold">{formatCurrency(pkg.total_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Order Value</p>
                      <p className="font-bold">{formatCurrency(pkg.avg_order_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue %</p>
                      <p className="font-bold">{formatPercentage(pkg.revenue_percentage)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Order %</p>
                      <p className="font-bold">{formatPercentage(pkg.order_percentage)}</p>
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
