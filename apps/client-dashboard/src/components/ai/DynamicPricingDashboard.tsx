/**
 * Dynamic Pricing Dashboard Component
 * 
 * Displays pricing history, active rules, and allows price calculations.
 */

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, Calendar, Plus } from 'lucide-react';
import { useDynamicPricing, usePricingRules } from '@/hooks/ai/useDynamicPricing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DynamicPricingDashboardProps {
  tenantId: string;
  packageId?: string;
}

export function DynamicPricingDashboard({ tenantId, packageId }: DynamicPricingDashboardProps) {
  const {
    pricingHistory,
    isLoadingHistory,
    stats,
  } = useDynamicPricing(tenantId, packageId || '', undefined);

  const {
    rules,
    isLoading: isLoadingRules,
  } = usePricingRules(tenantId);

  // Transform pricing history for chart
  const chartData = pricingHistory
    ?.slice(0, 30)
    .reverse()
    .map((h) => ({
      date: new Date(h.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      original: parseFloat(h.original_price.toString()),
      adjusted: parseFloat(h.adjusted_price.toString()),
      change: parseFloat(h.adjusted_price.toString()) - parseFloat(h.original_price.toString()),
    })) || [];

  const activeRules = rules?.filter((r) => r.status === 'active') || [];
  const pausedRules = rules?.filter((r) => r.status === 'paused') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dynamic Pricing</h2>
          <p className="text-muted-foreground">
            Optimize prices based on demand, time, and inventory
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_adjustments}</div>
              <p className="text-xs text-muted-foreground">
                Price changes in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Adjustment</CardTitle>
              {stats.avg_adjustment > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avg_adjustment > 0 ? '+' : ''}${stats.avg_adjustment.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per price adjustment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Range</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.max_discount < 0 ? `${stats.max_discount.toFixed(2)}` : '–'}
                {' to '}
                {stats.max_premium > 0 ? `+${stats.max_premium.toFixed(2)}` : '–'}
              </div>
              <p className="text-xs text-muted-foreground">
                Min discount to max premium
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing History Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing History</CardTitle>
            <CardDescription>
              Original vs adjusted prices over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                />
                <Line
                  type="monotone"
                  dataKey="original"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Original Price"
                />
                <Line
                  type="monotone"
                  dataKey="adjusted"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  name="Adjusted Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Active Pricing Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Pricing Rules</CardTitle>
              <CardDescription>
                {activeRules.length} active, {pausedRules.length} paused
              </CardDescription>
            </div>
            <Badge variant="default">{activeRules.length} Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.slice(0, 10).map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rule.rule_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.price_adjustment_type === 'percentage' ? (
                        <span className={rule.adjustment_value > 0 ? 'text-green-600' : 'text-red-600'}>
                          {rule.adjustment_value > 0 ? '+' : ''}
                          {rule.adjustment_value}%
                        </span>
                      ) : (
                        <span>
                          {rule.adjustment_value > 0 ? '+' : ''}$
                          {rule.adjustment_value}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      {rule.valid_until ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(rule.valid_until).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rule.status === 'active'
                            ? 'default'
                            : rule.status === 'paused'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rule.times_applied}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pricing Rules</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Create dynamic pricing rules to automatically adjust prices based on demand, time, or inventory.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Adjustments */}
      {pricingHistory && pricingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Price Adjustments</CardTitle>
            <CardDescription>Last 10 pricing changes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Adjusted</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingHistory.slice(0, 10).map((history) => {
                  const change = parseFloat(history.adjusted_price.toString()) - parseFloat(history.original_price.toString());
                  const changePercent = (change / parseFloat(history.original_price.toString())) * 100;

                  return (
                    <TableRow key={history.id}>
                      <TableCell className="text-sm">
                        {new Date(history.applied_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>${parseFloat(history.original_price.toString()).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        ${parseFloat(history.adjusted_price.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}>
                          {change > 0 ? '+' : ''}${change.toFixed(2)}
                          {' '}
                          ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {history.adjustment_reason || 'Standard pricing'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
