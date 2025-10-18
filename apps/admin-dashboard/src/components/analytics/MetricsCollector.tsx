import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Database,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  Zap,
} from "lucide-react";
import { useSystemMetrics } from "@/hooks/useSystemMetrics";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export const MetricsCollector: React.FC = () => {
  const {
    systemMetrics,
    databaseMetrics,
    performanceTrends,
    loading,
    error,
    calculateHealthScore,
    getMetricsByCategory,
    getLatestMetricValue,
  } = useSystemMetrics();

  const { recordMetric, trackFeatureUsage } = useAnalyticsTracking();
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    setHealthScore(calculateHealthScore());
  }, [calculateHealthScore]);

  useEffect(() => {
    trackFeatureUsage("analytics", "metrics_collector_view");
  }, [trackFeatureUsage]);

  const getHealthStatus = (score: number) => {
    if (score >= 90)
      return {
        status: "Excellent",
        color: "text-green-600",
        bg: "bg-green-100",
      };
    if (score >= 75)
      return { status: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (score >= 50)
      return {
        status: "Warning",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    return { status: "Critical", color: "text-red-600", bg: "bg-red-100" };
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === "ms") {
      return `${value.toFixed(0)}ms`;
    }
    if (unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    if (unit === "bytes") {
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(value) / Math.log(1024));
      return `${(value / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  const healthStatus = getHealthStatus(healthScore);

  // Performance chart data
  const performanceChartData = performanceTrends
    .filter((trend) => trend.metric_category === "application")
    .slice(0, 24)
    .map((trend) => ({
      time: new Date(trend.period_start).toLocaleTimeString(),
      value: trend.avg_value,
      p95: trend.percentile_95,
      p99: trend.percentile_99,
    }));

  // Database performance data
  const dbPerformanceData = databaseMetrics.slice(0, 20).map((metric) => ({
    time: new Date(metric.recorded_at).toLocaleTimeString(),
    connections: metric.active_connections,
    waiting: metric.waiting_connections,
    value: metric.metric_value,
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Failed to load metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Overview
            </span>
            <Badge className={`${healthStatus.bg} ${healthStatus.color}`}>
              {healthStatus.status} ({healthScore}%)
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time system performance and health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Health Score</span>
                <span className="font-medium">{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">API Response</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatMetricValue(
                    getLatestMetricValue("api_response_time") || 0,
                    "ms",
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Average response time
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">DB Queries</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatMetricValue(
                    getLatestMetricValue("db_query_time") || 0,
                    "ms",
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Query execution time
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatMetricValue(
                    getLatestMetricValue("active_users") || 0,
                    "",
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Currently online
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatMetricValue(
                    getLatestMetricValue("system_uptime") || 99.9,
                    "%",
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last 24 hours
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>
                  Application performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}ms`,
                        name === "value"
                          ? "Average"
                          : name === "p95"
                            ? "95th Percentile"
                            : "99th Percentile",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="p95"
                      stackId="2"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getMetricsByCategory("application")
                    .slice(0, 5)
                    .map((metric) => (
                      <div
                        key={metric.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              metric.severity === "critical"
                                ? "destructive"
                                : metric.severity === "error"
                                  ? "destructive"
                                  : metric.severity === "warning"
                                    ? "secondary"
                                    : "default"
                            }
                          >
                            {metric.severity}
                          </Badge>
                          <span className="text-sm font-medium">
                            {metric.metric_name}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatMetricValue(
                            metric.metric_value,
                            metric.metric_unit,
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Database Connections</CardTitle>
                <CardDescription>Connection pool utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dbPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="connections"
                      stroke="hsl(var(--primary))"
                      name="Active"
                    />
                    <Line
                      type="monotone"
                      dataKey="waiting"
                      stroke="hsl(var(--destructive))"
                      name="Waiting"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
                <CardDescription>Current database status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {databaseMetrics.slice(0, 5).map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {metric.metric_name}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {formatMetricValue(metric.metric_value, "ms")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metric.active_connections}/
                          {metric.connection_pool_size} connections
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">$127,450</div>
                  <div className="text-sm text-muted-foreground">
                    Monthly Recurring Revenue
                  </div>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15.3%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">2,847</div>
                  <div className="text-sm text-muted-foreground">
                    Active Users
                  </div>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8.7%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">94.2%</div>
                  <div className="text-sm text-muted-foreground">
                    User Satisfaction
                  </div>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Excellent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Error Rates</CardTitle>
                <CardDescription>System error tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">4xx Errors</span>
                    <span className="text-sm font-medium">0.12%</span>
                  </div>
                  <Progress value={0.12} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm">5xx Errors</span>
                    <span className="text-sm font-medium">0.03%</span>
                  </div>
                  <Progress value={0.03} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Timeout Rate</span>
                    <span className="text-sm font-medium">0.001%</span>
                  </div>
                  <Progress value={0.001} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Infrastructure</CardTitle>
                <CardDescription>Resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>CPU Usage</span>
                      <span>34%</span>
                    </div>
                    <Progress value={34} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Disk Usage</span>
                      <span>23%</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
