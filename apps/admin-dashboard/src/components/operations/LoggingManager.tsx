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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Search,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  service: string;
  userId?: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

interface LogMetrics {
  total: number;
  byLevel: Record<string, number>;
  errorRate: number;
  avgResponseTime: number;
}

export const LoggingManager: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<LogMetrics>({
    total: 0,
    byLevel: {},
    errorRate: 0,
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [levelFilter, serviceFilter]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (realTimeEnabled) {
      interval = setInterval(loadLogs, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeEnabled]);

  const loadLogs = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockLogs: LogEntry[] = [
        {
          id: "1",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: "error",
          message: "Database connection failed",
          service: "api-server",
          userId: "user-123",
          requestId: "req-456",
          metadata: { host: "api-01", port: 5432 },
        },
        {
          id: "2",
          timestamp: new Date(Date.now() - 240000).toISOString(),
          level: "warn",
          message: "High memory usage detected",
          service: "worker",
          metadata: { memory: "85%", threshold: "80%" },
        },
        {
          id: "3",
          timestamp: new Date(Date.now() - 180000).toISOString(),
          level: "info",
          message: "User authenticated successfully",
          service: "auth-service",
          userId: "user-789",
          requestId: "req-123",
        },
        {
          id: "4",
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: "debug",
          message: "Cache miss for key: user_settings_456",
          service: "cache-service",
          metadata: { key: "user_settings_456", ttl: 3600 },
        },
        {
          id: "5",
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: "error",
          message: "Payment processing failed",
          service: "payment-service",
          userId: "user-456",
          requestId: "req-789",
          metadata: { amount: 2999, currency: "USD", gateway: "stripe" },
        },
      ];

      const mockMetrics: LogMetrics = {
        total: 15420,
        byLevel: {
          error: 234,
          warn: 456,
          info: 12890,
          debug: 1840,
        },
        errorRate: 1.52,
        avgResponseTime: 245,
      };

      // Apply filters
      let filteredLogs = mockLogs;
      if (levelFilter !== "all") {
        filteredLogs = filteredLogs.filter((log) => log.level === levelFilter);
      }
      if (serviceFilter !== "all") {
        filteredLogs = filteredLogs.filter(
          (log) => log.service === serviceFilter,
        );
      }
      if (searchQuery) {
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.userId?.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      setLogs(filteredLogs);
      setMetrics(mockMetrics);
    } catch (error) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const csv = [
        "Timestamp,Level,Service,Message,User ID,Request ID",
        ...logs.map((log) =>
          [
            log.timestamp,
            log.level,
            log.service,
            `"${log.message}"`,
            log.userId || "",
            log.requestId || "",
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "debug":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "destructive";
      case "warn":
        return "default";
      case "info":
        return "secondary";
      case "debug":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const services = [
    "all",
    "api-server",
    "worker",
    "auth-service",
    "cache-service",
    "payment-service",
  ];
  const levels = ["all", "error", "warn", "info", "debug"];

  if (loading) {
    return <div className="animate-pulse">Loading logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Logging & Monitoring</h2>
          <p className="text-muted-foreground">View and analyze system logs</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={realTimeEnabled ? "default" : "outline"}
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${realTimeEnabled ? "animate-spin" : ""}`}
            />
            Real-time
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Live Logs</TabsTrigger>
          <TabsTrigger value="metrics">Log Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Log Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>
                    Real-time application logs from all services
                  </CardDescription>
                </div>
                <Badge variant="outline">{logs.length} entries</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level === "all" ? "All Levels" : level.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service === "all" ? "All Services" : service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getLevelIcon(log.level)}
                          <Badge variant={getLevelColor(log.level) as any}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {log.service}
                          </span>
                          {log.requestId && (
                            <Badge variant="outline" className="text-xs">
                              {log.requestId}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="text-sm">{log.message}</div>

                      {(log.userId || log.metadata) && (
                        <div className="flex space-x-4 text-xs text-muted-foreground">
                          {log.userId && <span>User: {log.userId}</span>}
                          {log.metadata && (
                            <span>Data: {JSON.stringify(log.metadata)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {metrics.errorRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Errors per total logs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.byLevel.error}
                </div>
                <p className="text-xs text-muted-foreground">Critical issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.byLevel.warn}</div>
                <p className="text-xs text-muted-foreground">
                  Potential issues
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Log Distribution by Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.byLevel).map(([level, count]) => (
                  <div
                    key={level}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {getLevelIcon(level)}
                      <span className="capitalize">{level}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            level === "error"
                              ? "bg-red-500"
                              : level === "warn"
                                ? "bg-yellow-500"
                                : level === "info"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                          }`}
                          style={{ width: `${(count / metrics.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log-based Alerts</CardTitle>
              <CardDescription>
                Configure alerts based on log patterns and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">High Error Rate</h4>
                      <p className="text-sm text-muted-foreground">
                        Alert when error rate exceeds 5% in 5 minutes
                      </p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        Database Connection Failures
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Alert on any database connection errors
                      </p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Payment Processing Issues</h4>
                      <p className="text-sm text-muted-foreground">
                        Alert on payment service errors
                      </p>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
