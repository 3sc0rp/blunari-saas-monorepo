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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  GitBranch,
  Rocket,
  Settings,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface DeploymentStatus {
  id: string;
  environment: "development" | "staging" | "production";
  status: "pending" | "deploying" | "success" | "failed" | "rolled_back";
  branch: string;
  commit: string;
  deployedAt: string;
  duration: number;
  url: string;
  health: "healthy" | "degraded" | "unhealthy";
}

interface Environment {
  name: string;
  status: "active" | "inactive" | "maintenance";
  url: string;
  version: string;
  lastDeployment: string;
  health: "healthy" | "degraded" | "unhealthy";
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

export const DeploymentManager: React.FC = () => {
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeploymentData();
  }, []);

  const loadDeploymentData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockDeployments: DeploymentStatus[] = [
        {
          id: "1",
          environment: "production",
          status: "success",
          branch: "main",
          commit: "abc123f",
          deployedAt: new Date(Date.now() - 3600000).toISOString(),
          duration: 120,
          url: "https://app.company.com",
          health: "healthy",
        },
        {
          id: "2",
          environment: "staging",
          status: "success",
          branch: "develop",
          commit: "def456g",
          deployedAt: new Date(Date.now() - 1800000).toISOString(),
          duration: 95,
          url: "https://staging.company.com",
          health: "healthy",
        },
        {
          id: "3",
          environment: "development",
          status: "deploying",
          branch: "feature/new-ui",
          commit: "ghi789h",
          deployedAt: new Date().toISOString(),
          duration: 0,
          url: "https://dev.company.com",
          health: "degraded",
        },
      ];

      const mockEnvironments: Environment[] = [
        {
          name: "Production",
          status: "active",
          url: "https://app.company.com",
          version: "v2.1.3",
          lastDeployment: "2 hours ago",
          health: "healthy",
          metrics: { uptime: 99.9, responseTime: 245, errorRate: 0.01 },
        },
        {
          name: "Staging",
          status: "active",
          url: "https://staging.company.com",
          version: "v2.2.0-beta",
          lastDeployment: "30 minutes ago",
          health: "healthy",
          metrics: { uptime: 99.7, responseTime: 198, errorRate: 0.05 },
        },
        {
          name: "Development",
          status: "active",
          url: "https://dev.company.com",
          version: "v2.2.0-alpha",
          lastDeployment: "Just now",
          health: "degraded",
          metrics: { uptime: 98.5, responseTime: 320, errorRate: 0.15 },
        },
      ];

      setDeployments(mockDeployments);
      setEnvironments(mockEnvironments);
    } catch (error) {
      toast.error("Failed to load deployment data");
    } finally {
      setLoading(false);
    }
  };

  const triggerDeployment = async (environment: string, branch: string) => {
    setIsDeploying(true);
    try {
      // Mock deployment trigger
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`Deployment to ${environment} initiated`);
      loadDeploymentData();
    } catch (error) {
      toast.error("Failed to trigger deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  const rollbackDeployment = async (deploymentId: string) => {
    try {
      // Mock rollback
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Rollback initiated");
      loadDeploymentData();
    } catch (error) {
      toast.error("Failed to rollback deployment");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "deploying":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "deploying":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading deployment data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployment Management</h2>
          <p className="text-muted-foreground">
            Manage deployments across all environments
          </p>
        </div>
        <Button onClick={() => loadDeploymentData()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="environments">
        <TabsList>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="deployments">Recent Deployments</TabsTrigger>
          <TabsTrigger value="pipeline">CI/CD Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {environments.map((env) => (
              <Card key={env.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{env.name}</CardTitle>
                    <Badge
                      variant={
                        env.status === "active" ? "default" : "secondary"
                      }
                    >
                      {env.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    <span className={getHealthColor(env.health)}>
                      {env.health}
                    </span>{" "}
                    • {env.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uptime</span>
                      <span className="font-medium">{env.metrics.uptime}%</span>
                    </div>
                    <Progress value={env.metrics.uptime} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Response Time</div>
                      <div className="font-medium">
                        {env.metrics.responseTime}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Error Rate</div>
                      <div className="font-medium">
                        {env.metrics.errorRate}%
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        triggerDeployment(env.name.toLowerCase(), "main")
                      }
                      disabled={isDeploying}
                    >
                      <Rocket className="h-3 w-3 mr-1" />
                      Deploy
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={env.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Monitor className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
              <CardDescription>
                Latest deployment activity across all environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <div className="font-medium">
                          {deployment.environment}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <GitBranch className="h-3 w-3 inline mr-1" />
                          {deployment.branch} • {deployment.commit}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusColor(deployment.status)}
                      >
                        {deployment.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div>
                          {new Date(deployment.deployedAt).toLocaleString()}
                        </div>
                        {deployment.duration > 0 && (
                          <div className="text-muted-foreground">
                            {deployment.duration}s
                          </div>
                        )}
                      </div>

                      {deployment.status === "success" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rollbackDeployment(deployment.id)}
                        >
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CI/CD Pipeline Status</CardTitle>
              <CardDescription>
                Monitor your automated deployment pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Pipeline configured with GitHub Actions. Automatic
                    deployments enabled for main and develop branches.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Build Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tests</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between">
                          <span>Linting</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between">
                          <span>Build</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between">
                          <span>Security Scan</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Deployment Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Success Rate</span>
                          <span className="font-medium">98.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Deploy Time</span>
                          <span className="font-medium">2m 15s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rollback Rate</span>
                          <span className="font-medium">1.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deployments Today</span>
                          <span className="font-medium">12</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
