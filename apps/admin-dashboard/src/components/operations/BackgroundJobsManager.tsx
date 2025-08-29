import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useBackgroundOpsAPI, BackgroundJob, SystemMetrics, HealthStatus } from '@/hooks/useBackgroundOpsAPI';
import { JobsDebugger } from './JobsDebugger';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Activity,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const BackgroundJobsManager: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [activeTab, setActiveTab] = useState('jobs');
  
  const { 
    loading, 
    getJobs, 
    cancelJob, 
    retryJob, 
    getHealthStatus, 
    getMetrics 
  } = useBackgroundOpsAPI();
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [jobsData, healthData, metricsData] = await Promise.all([
        getJobs(),
        getHealthStatus(),
        getMetrics('system')
      ]);
      
      setJobs(jobsData);
      setHealthStatus(healthData);
      setMetrics(metricsData.metrics);
    } catch (error) {
      console.error('Failed to fetch background ops data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      toast({
        title: "Job Cancelled",
        description: "Background job has been cancelled successfully.",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel job.",
        variant: "destructive",
      });
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob(jobId);
      toast({
        title: "Job Retried",
        description: "Background job has been queued for retry.",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry job.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Status Overview */}
      {healthStatus && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Server className="h-4 w-4 mr-2" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {healthStatus.status === 'healthy' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-lg font-semibold capitalize">
                  {healthStatus.status}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(healthStatus.uptime)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {healthStatus.version && `Version ${healthStatus.version}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobs.filter(job => job.status === 'running' || job.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {jobs.length} total jobs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Background Jobs</CardTitle>
                <CardDescription>
                  Monitor and manage background processing jobs
                </CardDescription>
              </div>
              <Button onClick={fetchData} disabled={loading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No background jobs found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <Badge variant={getStatusVariant(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{job.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={job.progress} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {job.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {job.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetryJob(job.id)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            {(job.status === 'pending' || job.status === 'running') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelJob(job.id)}
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>
                Real-time performance metrics from the background operations service
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No metrics data available
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {metrics.map((metric, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {metric.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {metric.value} {metric.unit}
                        </div>
                        {metric.metadata && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(metric.metadata)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <JobsDebugger />
        </TabsContent>
      </Tabs>
    </div>
  );
};