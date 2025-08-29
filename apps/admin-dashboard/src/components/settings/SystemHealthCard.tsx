import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SystemHealth } from '@/types/settings';
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface SystemHealthCardProps {
  health: SystemHealth;
  onRefresh?: () => void;
}

export function SystemHealthCard({ health, onRefresh }: SystemHealthCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'outage':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'outage':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${time}ms`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Overview
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold capitalize ${getOverallStatusColor(health.overall)}`}>
                {health.overall}
              </span>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Cpu className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{health.metrics.cpuUsage}%</div>
              <p className="text-sm text-muted-foreground">CPU Usage</p>
              <Progress value={health.metrics.cpuUsage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MemoryStick className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">{health.metrics.memoryUsage}%</div>
              <p className="text-sm text-muted-foreground">Memory</p>
              <Progress value={health.metrics.memoryUsage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <HardDrive className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold">{health.metrics.diskUsage}%</div>
              <p className="text-sm text-muted-foreground">Disk Usage</p>
              <Progress value={health.metrics.diskUsage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{health.metrics.databaseConnections}</div>
              <p className="text-sm text-muted-foreground">DB Connections</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold">{health.metrics.activeUsers.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Component Status
          </CardTitle>
          <CardDescription>
            Real-time status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health.components.map((component, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(component.status)}
                  <div>
                    <p className="font-medium">{component.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last checked: {new Date(component.lastCheck).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {component.responseTime && (
                    <div className="text-center">
                      <div className="font-medium">{formatResponseTime(component.responseTime)}</div>
                      <div className="text-muted-foreground">Response</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="font-medium">{formatUptime(component.uptime)}</div>
                    <div className="text-muted-foreground">Uptime</div>
                  </div>
                  <Badge className={getStatusColor(component.status)}>
                    {component.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {health.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              Recent system alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge className={getAlertSeverityColor(alert.severity)} variant="outline">
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {alert.resolved ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}