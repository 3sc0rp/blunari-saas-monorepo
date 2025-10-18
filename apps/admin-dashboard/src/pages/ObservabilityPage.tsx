import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Server,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Clock,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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

interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  service_name: string;
  endpoint?: string;
  severity: string;
  recorded_at: string;
}

interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  resolved: boolean;
  occurred_at: string;
}

interface AlertInstance {
  id: string;
  severity: string;
  message: string;
  status: string;
  fired_at: string;
  acknowledged_at?: string;
}

interface PerformanceTrend {
  metric_name: string;
  period_start: string;
  avg_value: number;
  percentile_95: number;
}

export default function ObservabilityPage() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [alerts, setAlerts] = useState<AlertInstance[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<
    PerformanceTrend[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadObservabilityData();
    setupRealtimeSubscriptions();

    if (autoRefresh) {
      const interval = setInterval(loadObservabilityData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadObservabilityData = async () => {
    try {
      // Load system metrics (last hour)
      const { data: metricsData } = await supabase
        .from("system_health_metrics")
        .select("*")
        .gte("recorded_at", new Date(Date.now() - 3600000).toISOString())
        .order("recorded_at", { ascending: false })
        .limit(100);

      setSystemMetrics(metricsData || []);

      // Load error logs (last 24 hours, unresolved)
      const { data: errorsData } = await supabase
        .from("error_logs")
        .select("*")
        .eq("resolved", false)
        .gte("occurred_at", new Date(Date.now() - 86400000).toISOString())
        .order("occurred_at", { ascending: false })
        .limit(50);

      setErrorLogs(errorsData || []);

      // Load active alerts
      const { data: alertsData } = await supabase
        .from("alert_instances")
        .select("*")
        .eq("status", "active")
        .order("fired_at", { ascending: false })
        .limit(20);

      setAlerts(alertsData || []);

      // Load performance trends (last 24 hours)
      const { data: trendsData } = await supabase
        .from("performance_trends")
        .select("*")
        .eq("aggregation_period", "hour")
        .gte("period_start", new Date(Date.now() - 86400000).toISOString())
        .order("period_start", { ascending: false })
        .limit(24);

      setPerformanceTrends(trendsData || []);
    } catch (error) {
      console.error("Error loading observability data:", error);
      toast({
        title: "Error",
        description: "Failed to load monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new system metrics
    const metricsChannel = supabase
      .channel("system-metrics")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_health_metrics",
        },
        (payload) => {
          setSystemMetrics((prev) => [
            payload.new as SystemMetric,
            ...prev.slice(0, 99),
          ]);
        },
      )
      .subscribe();

    // Subscribe to new error logs
    const errorsChannel = supabase
      .channel("error-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "error_logs",
        },
        (payload) => {
          setErrorLogs((prev) => [
            payload.new as ErrorLog,
            ...prev.slice(0, 49),
          ]);

          // Show toast for critical errors
          const newError = payload.new as ErrorLog;
          if (newError.severity === "critical") {
            toast({
              title: "Critical Error Detected",
              description: newError.message,
              variant: "destructive",
            });
          }
        },
      )
      .subscribe();

    // Subscribe to new alerts
    const alertsChannel = supabase
      .channel("alert-instances")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_instances",
        },
        (payload) => {
          setAlerts((prev) => [
            payload.new as AlertInstance,
            ...prev.slice(0, 19),
          ]);

          // Show toast for new alerts
          const newAlert = payload.new as AlertInstance;
          toast({
            title: `${newAlert.severity.toUpperCase()} Alert`,
            description: newAlert.message,
            variant:
              newAlert.severity === "critical" ? "destructive" : "default",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(errorsChannel);
      supabase.removeChannel(alertsChannel);
    };
  };

  const triggerMonitoring = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke("monitor-system");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monitoring data collected successfully",
      });

      // Refresh data after a short delay
      setTimeout(loadObservabilityData, 1000);
    } catch (error) {
      console.error("Error triggering monitoring:", error);
      toast({
        title: "Error",
        description: "Failed to collect monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alert_instances")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));

      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged",
      });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from("error_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", errorId);

      if (error) throw error;

      setErrorLogs((prev) => prev.filter((log) => log.id !== errorId));

      toast({
        title: "Error Resolved",
        description: "Error has been marked as resolved",
      });
    } catch (error) {
      console.error("Error resolving error log:", error);
      toast({
        title: "Error",
        description: "Failed to resolve error",
        variant: "destructive",
      });
    }
  };

  const getMetricsByName = (metricName: string) => {
    return systemMetrics
      .filter((m) => m.metric_name === metricName)
      .slice(0, 20)
      .reverse();
  };

  const getCurrentMetricValue = (metricName: string, defaultValue = 0) => {
    const metric = systemMetrics.find((m) => m.metric_name === metricName);
    return metric ? metric.metric_value : defaultValue;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "high":
        return "bg-warning/10 text-warning border-warning/20";
      case "medium":
        return "bg-primary/10 text-primary border-primary/20";
      case "low":
        return "bg-secondary/10 text-secondary-foreground border-secondary/20";
      default:
        return "bg-muted/50 text-muted-foreground border-muted/20";
    }
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === "ms") {
      return `${value.toFixed(1)}ms`;
    } else if (unit === "percentage") {
      return `${value.toFixed(1)}%`;
    } else if (unit === "requests_per_minute") {
      return `${value.toFixed(0)} req/min`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  if (loading && systemMetrics.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Observability</h1>
            <p className="text-muted-foreground">
              Real-time system monitoring and performance analysis
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <Eye className="w-4 h-4 mr-2" />
              ) : (
                <EyeOff className="w-4 h-4 mr-2" />
              )}
              Auto Refresh {autoRefresh ? "On" : "Off"}
            </Button>
            <Button
              variant="default"
              onClick={triggerMonitoring}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Collect Metrics
            </Button>
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}{" "}
                  require attention
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAlerts([])}
                >
                  View All Alerts
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(
                  getCurrentMetricValue("response_time"),
                  "ms",
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                API response time (avg)
              </p>
              <Progress
                value={Math.min(
                  getCurrentMetricValue("response_time") / 10,
                  100,
                )}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(
                  getCurrentMetricValue("error_rate"),
                  "percentage",
                )}
              </div>
              <p className="text-xs text-muted-foreground">System error rate</p>
              <Progress
                value={getCurrentMetricValue("error_rate") * 2}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(
                  getCurrentMetricValue("throughput"),
                  "requests_per_minute",
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Requests per minute
              </p>
              <Progress
                value={getCurrentMetricValue("throughput")}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                DB Connections
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(
                  getCurrentMetricValue("connection_pool_usage"),
                  "percentage",
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Connection pool usage
              </p>
              <Progress
                value={getCurrentMetricValue("connection_pool_usage")}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Trend</CardTitle>
                  <CardDescription>
                    API response times over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getMetricsByName("response_time")}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="recorded_at"
                        tickFormatter={(value) =>
                          format(new Date(value), "HH:mm")
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) =>
                          format(new Date(value), "HH:mm:ss")
                        }
                        formatter={(value) => [`${value}ms`, "Response Time"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="metric_value"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rate Trend</CardTitle>
                  <CardDescription>
                    System error rates over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={getMetricsByName("error_rate")}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="recorded_at"
                        tickFormatter={(value) =>
                          format(new Date(value), "HH:mm")
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) =>
                          format(new Date(value), "HH:mm:ss")
                        }
                        formatter={(value) => [`${value}%`, "Error Rate"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="metric_value"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Error Logs</CardTitle>
                <CardDescription>
                  Unresolved errors from the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {errorLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      No unresolved errors found
                    </div>
                  ) : (
                    errorLogs.map((error) => (
                      <div
                        key={error.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            <span className="font-medium">
                              {error.error_type}
                            </span>
                            {error.endpoint && (
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {error.method} {error.endpoint}
                              </code>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {error.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(error.occurred_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveError(error.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>
                  System alerts requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      No active alerts
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="font-medium">{alert.message}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Fired{" "}
                            {formatDistanceToNow(new Date(alert.fired_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Historical performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceTrends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    No trend data available yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {performanceTrends.map((trend, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{trend.metric_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Average: {trend.avg_value?.toFixed(2)} | 95th
                              percentile: {trend.percentile_95?.toFixed(2)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {format(
                              new Date(trend.period_start),
                              "MMM d, HH:mm",
                            )}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
