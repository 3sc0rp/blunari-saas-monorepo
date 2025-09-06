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
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  AlertCircle,
  Shield,
  Settings,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Calendar,
  Plus,
  Eye,
  EyeOff,
  Wrench,
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
  BarChart,
  Bar,
} from "recharts";

interface Service {
  id: string;
  service_name: string;
  service_type: string;
  service_url?: string;
  description: string;
  critical: boolean;
  sla_uptime_target: number;
  enabled: boolean;
}

interface ServiceHealth {
  id: string;
  service_id: string;
  status: string;
  response_time_ms: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
  services: Service;
}

interface ResourceUsage {
  id: string;
  service_name: string;
  resource_type: string;
  current_value: number;
  max_value: number;
  unit: string;
  threshold_warning: number;
  threshold_critical: number;
  hostname: string;
  recorded_at: string;
}

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  impact: string;
  affected_services: string[];
  detected_at: string;
  resolved_at?: string;
}

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  maintenance_type: string;
  affected_services: string[];
  impact_level: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
}

interface DiagnosticResult {
  id: string;
  diagnostic_type: string;
  service_name: string;
  test_name: string;
  status: string;
  result_data: any;
  execution_time_ms: number;
  recommendations: string[];
  executed_at: string;
}

export default function SystemHealthPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<
    MaintenanceWindow[]
  >([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSystemHealthData();
    setupRealtimeSubscriptions();

    if (autoRefresh) {
      const interval = setInterval(loadSystemHealthData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadSystemHealthData = async () => {
    try {
      setLoading(true);

      // Load services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .order("service_name");

      setServices(servicesData || []);

      // Load recent service health status
      const { data: healthData } = await supabase
        .from("service_health_status")
        .select(
          `
          *,
          services (*)
        `,
        )
        .gte("checked_at", new Date(Date.now() - 3600000).toISOString())
        .order("checked_at", { ascending: false });

      setServiceHealth(healthData || []);

      // Load resource usage (last hour)
      const { data: resourceData } = await supabase
        .from("resource_usage")
        .select("*")
        .gte("recorded_at", new Date(Date.now() - 3600000).toISOString())
        .order("recorded_at", { ascending: false })
        .limit(100);

      setResourceUsage(resourceData || []);

      // Load open incidents
      const { data: incidentsData } = await supabase
        .from("incidents")
        .select("*")
        .neq("status", "resolved")
        .order("detected_at", { ascending: false });

      setIncidents(incidentsData || []);

      // Load upcoming maintenance windows
      const { data: maintenanceData } = await supabase
        .from("maintenance_windows")
        .select("*")
        .gte("scheduled_start", new Date().toISOString())
        .order("scheduled_start");

      setMaintenanceWindows(maintenanceData || []);

      // Load recent diagnostic results
      const { data: diagnosticsData } = await supabase
        .from("diagnostic_results")
        .select("*")
        .gte("executed_at", new Date(Date.now() - 86400000).toISOString())
        .order("executed_at", { ascending: false })
        .limit(20);

      setDiagnostics(diagnosticsData || []);
    } catch (error) {
      console.error("Error loading system health data:", error);
      toast({
        title: "Error",
        description: "Failed to load system health data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to service health updates
    const healthChannel = supabase
      .channel("service-health")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_health_status",
        },
        async (payload) => {
          // Fetch the complete record with service details
          const { data } = await supabase
            .from("service_health_status")
            .select(
              `
            *,
            services (*)
          `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setServiceHealth((prev) => [
              data as ServiceHealth,
              ...prev.slice(0, 99),
            ]);

            // Show toast for critical service issues
            if (data.status !== "healthy" && data.services?.critical) {
              toast({
                title: "Service Health Alert",
                description: `${data.services.service_name} is ${data.status}`,
                variant:
                  data.status === "unhealthy" ? "destructive" : "default",
              });
            }
          }
        },
      )
      .subscribe();

    // Subscribe to incidents
    const incidentsChannel = supabase
      .channel("incidents")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incidents",
        },
        (payload) => {
          setIncidents((prev) => [payload.new as Incident, ...prev]);

          const incident = payload.new as Incident;
          toast({
            title: "New Incident",
            description: `${incident.title} (${incident.severity} severity)`,
            variant:
              incident.severity === "critical" ? "destructive" : "default",
          });
        },
      )
      .subscribe();

    // Subscribe to resource usage
    const resourceChannel = supabase
      .channel("resource-usage")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "resource_usage",
        },
        (payload) => {
          setResourceUsage((prev) => [
            payload.new as ResourceUsage,
            ...prev.slice(0, 99),
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(resourceChannel);
    };
  };

  const runHealthCheck = async () => {
    try {
      setRunningHealthCheck(true);
      const { error } = await supabase.functions.invoke("health-check");

      if (error) throw error;

      toast({
        title: "Health Check Complete",
        description: "System health check completed successfully",
      });

      // Refresh data after a short delay
      setTimeout(loadSystemHealthData, 1000);
    } catch (error) {
      console.error("Error running health check:", error);
      toast({
        title: "Error",
        description: "Failed to run health check",
        variant: "destructive",
      });
    } finally {
      setRunningHealthCheck(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      
      // Run client-side diagnostics instead of calling Edge Function
      const diagnostics = [];
      let overallStatus = "success";

      // Database connectivity test
      const dbStartTime = Date.now();
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("count(*)")
          .single();

        const dbExecutionTime = Date.now() - dbStartTime;
        
        if (error) {
          overallStatus = "error";
          console.error("Database diagnostic failed:", error);
        }

        diagnostics.push({
          test_name: "Database Connectivity",
          status: error ? "error" : "success",
          execution_time_ms: dbExecutionTime,
          error_message: error?.message,
        });
      } catch (error) {
        overallStatus = "error";
        diagnostics.push({
          test_name: "Database Connectivity",
          status: "error",
          execution_time_ms: Date.now() - dbStartTime,
          error_message: error.message,
        });
      }

      // API response test
      const apiStartTime = Date.now();
      try {
        const { data, error } = await supabase.from("tenants").select("id").limit(1);
        const apiExecutionTime = Date.now() - apiStartTime;
        
        diagnostics.push({
          test_name: "API Response Time",
          status: error ? "error" : "success",
          execution_time_ms: apiExecutionTime,
          error_message: error?.message,
        });
        
        if (error && overallStatus === "success") {
          overallStatus = "warning";
        }
      } catch (error) {
        diagnostics.push({
          test_name: "API Response Time",
          status: "error",
          execution_time_ms: Date.now() - apiStartTime,
          error_message: error.message,
        });
        overallStatus = "error";
      }

      // Report results
      const successCount = diagnostics.filter(d => d.status === "success").length;
      const totalTests = diagnostics.length;

      toast({
        title: "Diagnostics Complete",
        description: `${successCount}/${totalTests} tests passed. Overall status: ${overallStatus}`,
        variant: overallStatus === "error" ? "destructive" : "default"
      });

      // Log detailed results for debugging
      console.log("Diagnostics Results:", {
        overallStatus,
        tests: diagnostics,
        summary: `${successCount}/${totalTests} tests passed`
      });

      // Refresh data after a short delay
      setTimeout(loadSystemHealthData, 1000);
    } catch (error) {
      console.error("Error running diagnostics:", error);
      toast({
        title: "Error",
        description: "Failed to run diagnostics",
        variant: "destructive",
      });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const getServiceStatus = (serviceId: string) => {
    const latestHealth = serviceHealth
      .filter((h) => h.service_id === serviceId)
      .sort(
        (a, b) =>
          new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime(),
      )[0];

    return (
      latestHealth || {
        status: "unknown",
        response_time_ms: 0,
        checked_at: new Date().toISOString(),
      }
    );
  };

  const getResourceUsageByType = (type: string) => {
    return resourceUsage
      .filter((r) => r.resource_type === type)
      .slice(0, 10)
      .reverse();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-success/10 text-success border-success/20";
      case "degraded":
        return "bg-warning/10 text-warning border-warning/20";
      case "unhealthy":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/50 text-muted-foreground border-muted/20";
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "cpu":
        return Cpu;
      case "memory":
        return MemoryStick;
      case "disk":
        return HardDrive;
      case "network":
        return Network;
      default:
        return Activity;
    }
  };

  const formatResourceValue = (value: number, unit: string) => {
    if (unit === "percentage") {
      return `${value.toFixed(1)}%`;
    } else if (unit === "mbps") {
      return `${value.toFixed(1)} Mbps`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  if (loading && services.length === 0) {
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

  const healthyServices = services.filter(
    (s) => getServiceStatus(s.id).status === "healthy",
  ).length;
  const totalServices = services.length;
  const criticalIncidents = incidents.filter(
    (i) => i.severity === "critical",
  ).length;
  const avgResponseTime =
    serviceHealth.length > 0
      ? serviceHealth.reduce((sum, h) => sum + (h.response_time_ms || 0), 0) /
        serviceHealth.length
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-muted-foreground">
              Real-time infrastructure monitoring and diagnostics
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
              onClick={runHealthCheck}
              disabled={runningHealthCheck}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${runningHealthCheck ? "animate-spin" : ""}`}
              />
              Health Check
            </Button>
            <Button
              variant="default"
              onClick={runDiagnostics}
              disabled={runningDiagnostics}
            >
              <Wrench
                className={`w-4 h-4 mr-2 ${runningDiagnostics ? "animate-spin" : ""}`}
              />
              Run Diagnostics
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalIncidents > 0 && (
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {criticalIncidents} critical incident
                  {criticalIncidents !== 1 ? "s" : ""} detected
                </span>
                <Button variant="outline" size="sm">
                  View Incidents
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Health
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthyServices}/{totalServices}
              </div>
              <p className="text-xs text-muted-foreground">
                Services operational
              </p>
              <Progress
                value={(healthyServices / totalServices) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgResponseTime.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
              <Progress
                value={Math.min(avgResponseTime / 10, 100)}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Incidents
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incidents.length}</div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
              <div className="mt-2 flex gap-1">
                {incidents.filter((i) => i.severity === "critical").length >
                  0 && (
                  <Badge variant="destructive" className="text-xs">
                    {incidents.filter((i) => i.severity === "critical").length}{" "}
                    Critical
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {maintenanceWindows.length}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled windows</p>
              {maintenanceWindows.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Next:{" "}
                  {format(
                    new Date(maintenanceWindows[0].scheduled_start),
                    "MMM d, HH:mm",
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>
                  Current health status of all monitored services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => {
                    const status = getServiceStatus(service.id);
                    const Icon =
                      service.service_type === "database" ? Database : Server;

                    return (
                      <div key={service.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">
                              {service.service_name}
                            </span>
                          </div>
                          <Badge className={getStatusColor(status.status)}>
                            {status.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span>Response: {status.response_time_ms}ms</span>
                          <span>SLA: {service.sla_uptime_target}%</span>
                        </div>
                        {service.critical && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {["cpu", "memory", "disk", "network"].map((resourceType) => {
                const data = getResourceUsageByType(resourceType);
                const Icon = getResourceIcon(resourceType);
                const latest = data[data.length - 1];

                return (
                  <Card key={resourceType}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {resourceType.toUpperCase()} Usage
                      </CardTitle>
                      {latest && (
                        <CardDescription>
                          Current:{" "}
                          {formatResourceValue(
                            latest.current_value,
                            latest.unit,
                          )}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={data}>
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
                              formatter={(value, name) => [
                                formatResourceValue(
                                  value as number,
                                  latest?.unit || "percentage",
                                ),
                                "Usage",
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="current_value"
                              stroke="#8884d8"
                              fill="#8884d8"
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No {resourceType} data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Incidents</CardTitle>
                <CardDescription>
                  Active incidents requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      No open incidents
                    </div>
                  ) : (
                    incidents.map((incident) => (
                      <div key={incident.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getStatusColor(incident.severity)}
                            >
                              {incident.severity}
                            </Badge>
                            <span className="font-medium">
                              {incident.incident_number}
                            </span>
                          </div>
                          <Badge variant="outline">{incident.status}</Badge>
                        </div>
                        <h4 className="font-medium mb-1">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {incident.description}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span>Impact: {incident.impact}</span>
                          <span>
                            Detected:{" "}
                            {formatDistanceToNow(
                              new Date(incident.detected_at),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {incident.affected_services.map(
                              (service, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {service}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Results</CardTitle>
                <CardDescription>
                  Recent system diagnostic test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diagnostics.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4" />
                      No diagnostic results available
                    </div>
                  ) : (
                    diagnostics.map((diagnostic) => (
                      <div
                        key={diagnostic.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {diagnostic.diagnostic_type}
                            </Badge>
                            <span className="font-medium">
                              {diagnostic.test_name}
                            </span>
                          </div>
                          <Badge
                            className={
                              diagnostic.status === "pass"
                                ? "bg-green-500"
                                : diagnostic.status === "warning"
                                  ? "bg-yellow-500"
                                  : diagnostic.status === "fail"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                            }
                          >
                            {diagnostic.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Service: {diagnostic.service_name} | Execution:{" "}
                          {diagnostic.execution_time_ms}ms
                        </p>
                        {diagnostic.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium mb-1">
                              Recommendations:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {diagnostic.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(
                            new Date(diagnostic.executed_at),
                            { addSuffix: true },
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Windows</CardTitle>
                <CardDescription>
                  Scheduled maintenance activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceWindows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4" />
                      No scheduled maintenance windows
                    </div>
                  ) : (
                    maintenanceWindows.map((maintenance) => (
                      <div
                        key={maintenance.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{maintenance.title}</h4>
                          <Badge variant="outline">{maintenance.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {maintenance.description}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Start:{" "}
                            </span>
                            {format(
                              new Date(maintenance.scheduled_start),
                              "MMM d, yyyy HH:mm",
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">End: </span>
                            {format(
                              new Date(maintenance.scheduled_end),
                              "MMM d, yyyy HH:mm",
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {maintenance.affected_services.map(
                              (service, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {service}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            className={
                              maintenance.impact_level === "critical"
                                ? "bg-red-500"
                                : maintenance.impact_level === "major"
                                  ? "bg-orange-500"
                                  : maintenance.impact_level === "minor"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                            }
                          >
                            {maintenance.impact_level} impact
                          </Badge>
                          <Badge variant="outline">
                            {maintenance.maintenance_type}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
