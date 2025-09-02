import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeploymentManager } from "@/components/operations/DeploymentManager";
import { LoggingManager } from "@/components/operations/LoggingManager";
import { BackupManager } from "@/components/operations/BackupManager";
import { EnhancedBackgroundJobsManager } from "@/components/operations/EnhancedBackgroundJobsManager";
import { SystemHealthCard } from "@/components/settings/SystemHealthCard";
import {
  Activity,
  Server,
  Database,
  Shield,
  Rocket,
  FileText,
  Settings,
  Cpu,
} from "lucide-react";

// Mock system health data
const mockSystemHealth = {
  overall: "healthy" as const,
  status: "healthy" as const,
  uptime: 99.9,
  responseTime: 245,
  lastUpdate: new Date().toISOString(),
  metrics: {
    cpuUsage: 45,
    memoryUsage: 67,
    diskUsage: 23,
    databaseConnections: 156,
    activeUsers: 1247,
  },
  components: [
    {
      name: "API Server",
      status: "operational" as const,
      responseTime: 120,
      uptime: 99.9,
      lastCheck: new Date(Date.now() - 60000).toISOString(),
    },
    {
      name: "Database",
      status: "operational" as const,
      responseTime: 15,
      uptime: 99.95,
      lastCheck: new Date(Date.now() - 30000).toISOString(),
    },
    {
      name: "Cache Service",
      status: "degraded" as const,
      responseTime: 45,
      uptime: 98.7,
      lastCheck: new Date(Date.now() - 45000).toISOString(),
    },
    {
      name: "File Storage",
      status: "operational" as const,
      responseTime: 89,
      uptime: 99.8,
      lastCheck: new Date(Date.now() - 90000).toISOString(),
    },
  ],
  alerts: [
    {
      id: "1",
      severity: "warning" as const,
      message: "Cache service response time above threshold",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      resolved: false,
    },
  ],
};

const OperationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operations & Deployment</h1>
            <p className="text-muted-foreground">
              Monitor and manage your application's deployment and operational
              health
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant="secondary"
              className="bg-success/10 text-success border-success/20"
            >
              <Activity className="h-3 w-3 mr-1" />
              All Systems Operational
            </Badge>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Server className="h-4 w-4 mr-2" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">99.9% uptime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Rocket className="h-4 w-4 mr-2" />
                Deployments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Last Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2h ago</div>
              <p className="text-xs text-muted-foreground">2.4 GB</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">0.01%</div>
              <p className="text-xs text-muted-foreground">Last 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Operations Tabs */}
        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Health</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>Background Jobs</span>
            </TabsTrigger>
            <TabsTrigger
              value="deployments"
              className="flex items-center space-x-2"
            >
              <Rocket className="h-4 w-4" />
              <span>Deployments</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger
              value="backups"
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Backups</span>
            </TabsTrigger>
            <TabsTrigger
              value="scaling"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Scaling</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <SystemHealthCard
              health={mockSystemHealth}
              onRefresh={() => console.log("Refreshing health data...")}
            />
          </TabsContent>

          <TabsContent value="jobs">
            <EnhancedBackgroundJobsManager />
          </TabsContent>

          <TabsContent value="deployments">
            <DeploymentManager />
          </TabsContent>

          <TabsContent value="logs">
            <LoggingManager />
          </TabsContent>

          <TabsContent value="backups">
            <BackupManager />
          </TabsContent>

          <TabsContent value="scaling">
            <Card>
              <CardHeader>
                <CardTitle>Auto-scaling Configuration</CardTitle>
                <CardDescription>
                  Configure horizontal scaling policies and load balancing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Current Capacity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Active Instances</span>
                            <Badge variant="secondary">3</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>CPU Utilization</span>
                            <span className="font-medium">45%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Memory Usage</span>
                            <span className="font-medium">67%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Network I/O</span>
                            <span className="font-medium">125 MB/s</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Scaling Policies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Min Instances</span>
                            <Badge variant="outline">2</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Max Instances</span>
                            <Badge variant="outline">10</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Scale Up Threshold</span>
                            <span className="font-medium">75% CPU</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Scale Down Threshold</span>
                            <span className="font-medium">25% CPU</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Load Balancer Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            99.9%
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Uptime
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">1,247</div>
                          <p className="text-sm text-muted-foreground">
                            Active Connections
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">245ms</div>
                          <p className="text-sm text-muted-foreground">
                            Avg Response Time
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OperationsPage;
