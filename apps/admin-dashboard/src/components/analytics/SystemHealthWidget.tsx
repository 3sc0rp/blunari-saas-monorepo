import React, { useState, useEffect } from "react";
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
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Clock,
  Server,
  Database,
  Globe,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEnhancedBackgroundOpsAPI } from "@/hooks/useEnhancedBackgroundOpsAPI";
import { useToast } from "@/hooks/use-toast";
import type { SystemHealth, SystemMetrics } from "@/types/admin";

export function SystemHealthWidget() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { proxyRequest } = useEnhancedBackgroundOpsAPI();
  const { toast } = useToast();

  useEffect(() => {
    loadHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      if (!loading) setLoading(true);

      // Load health and metrics in parallel
      const [healthResponse, metricsResponse] = await Promise.all([
        proxyRequest("/v1/health"),
        proxyRequest("/v1/metrics"),
      ]);

      setHealth(healthResponse.data);
      setMetrics(metricsResponse.data?.metrics || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading health data:", error);

      if (loading) {
        toast({
          title: "Health Check Failed",
          description: "Unable to fetch system health status",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge
            variant="outline"
            className="text-success border-success/20 bg-success/5"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge
            variant="outline"
            className="text-warning border-warning/20 bg-warning/5"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Degraded
          </Badge>
        );
      case "unhealthy":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Unhealthy
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case "database":
        return <Database className="h-4 w-4" />;
      case "api":
      case "booking-api":
        return <Server className="h-4 w-4" />;
      case "web":
      case "frontend":
        return <Globe className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === "ms") {
      return `${value.toFixed(0)}ms`;
    }
    if (unit === "percent" || unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    if (unit === "bytes") {
      if (value > 1024 * 1024 * 1024)
        return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
      if (value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
      if (value > 1024) return `${(value / 1024).toFixed(1)}KB`;
      return `${value}B`;
    }
    return value.toString();
  };

  // Get key metrics for display
  const keyMetrics = metrics.filter((m) =>
    [
      "response_time_p95",
      "cpu_usage",
      "memory_usage",
      "job_success_rate",
    ].includes(m.metric_name),
  );

  if (loading && !health) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading health data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Real-time system status and performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={loadHealthData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {health ? (
            <>
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Overall Status</p>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {formatUptime(health.uptime)} • Version:{" "}
                    {health.version}
                  </p>
                </div>
                {getHealthBadge(health.status)}
              </div>

              {/* Response Time */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Response Time</p>
                  <p className="text-sm text-muted-foreground">API latency</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">
                    {health.response_time_ms}ms
                  </p>
                  <p
                    className={`text-xs ${health.response_time_ms < 100 ? "text-success" : health.response_time_ms < 300 ? "text-warning" : "text-destructive"}`}
                  >
                    {health.response_time_ms < 100
                      ? "Excellent"
                      : health.response_time_ms < 300
                        ? "Good"
                        : "Slow"}
                  </p>
                </div>
              </div>

              {/* Services Status */}
              {health.services && health.services.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Services</p>
                  <div className="space-y-2">
                    {health.services.map((service, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {getServiceIcon(service.name)}
                          <span className="text-sm">{service.name}</span>
                        </div>
                        {getHealthBadge(service.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-4">
              <XCircle className="h-6 w-6 text-muted-foreground mr-2" />
              <span className="text-muted-foreground">
                Health data unavailable
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {keyMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>
              Performance indicators and system statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {keyMetrics.map((metric, index) => {
                let displayName = metric.metric_name.replace(/_/g, " ");
                displayName =
                  displayName.charAt(0).toUpperCase() + displayName.slice(1);

                const value = metric.metric_value;
                let progressValue = 0;
                let variant: "default" | "success" | "warning" | "destructive" =
                  "default";

                // Calculate progress and variant based on metric type
                if (metric.metric_name.includes("usage")) {
                  progressValue = Math.min(value, 100);
                  variant =
                    value < 70
                      ? "success"
                      : value < 85
                        ? "warning"
                        : "destructive";
                } else if (metric.metric_name === "job_success_rate") {
                  progressValue = value;
                  variant =
                    value > 95
                      ? "success"
                      : value > 80
                        ? "warning"
                        : "destructive";
                } else if (metric.metric_name === "response_time_p95") {
                  progressValue = Math.min((value / 1000) * 100, 100); // Normalize to 1000ms max
                  variant =
                    value < 200
                      ? "success"
                      : value < 500
                        ? "warning"
                        : "destructive";
                }

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-sm font-mono">
                        {formatMetricValue(value, metric.metric_unit)}
                      </span>
                    </div>
                    {progressValue > 0 && (
                      <Progress
                        value={progressValue}
                        className={`h-2 ${variant === "success" ? "text-success" : variant === "warning" ? "text-warning" : variant === "destructive" ? "text-destructive" : ""}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
