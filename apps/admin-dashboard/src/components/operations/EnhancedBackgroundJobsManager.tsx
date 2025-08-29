import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedBackgroundOpsAPI } from '@/hooks/useEnhancedBackgroundOpsAPI';
import { BackgroundJob, SystemMetrics, HealthStatus } from '@/hooks/useEnhancedBackgroundOpsAPI';
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
  XCircle,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AlertRule {
  id: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  enabled: boolean;
}

interface JobFilter {
  status?: string;
  type?: string;
  priority?: string;
  search?: string;
}

export const EnhancedBackgroundJobsManager: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<BackgroundJob[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobFilter, setJobFilter] = useState<JobFilter>({});
  const [activeTab, setActiveTab] = useState('jobs');
  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default to prevent infinite loops
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    { id: '1', metric: 'cpu_usage', threshold: 90, operator: 'gt', enabled: true },
    { id: '2', metric: 'memory_usage', threshold: 85, operator: 'gt', enabled: true },
    { id: '3', metric: 'error_rate', threshold: 5, operator: 'gt', enabled: true },
    { id: '4', metric: 'response_time', threshold: 500, operator: 'gt', enabled: true },
  ]);
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: Date }>>([]);
  
  const { 
    loading, 
    getJobs, 
    cancelJob, 
    retryJob, 
    getHealthStatus, 
    getMetrics,
    createJob,
    bulkCancelJobs,
    bulkRetryJobs
  } = useEnhancedBackgroundOpsAPI();
  const { toast } = useToast();

  // Removed duplicate checkAlertConditions function since it's now inline in fetchData

  const fetchData = useCallback(async () => {
    try {
      console.log('🔄 Fetching background ops data...');
      
      const [jobsData, healthData, metricsData] = await Promise.all([
        getJobs().catch(err => {
          console.error('Jobs API failed:', err);
          return { jobs: [], total: 0 };
        }),
        getHealthStatus().catch(err => {
          console.error('Health API failed:', err);
          return null;
        }),
        getMetrics('system').catch(err => {
          console.error('Metrics API failed:', err);
          return { metrics: [], timestamp: new Date().toISOString() };
        })
      ]);
      
      console.log('📊 Raw data received:', {
        jobs: jobsData,
        health: healthData,
        metrics: metricsData
      });
      
      // Handle jobs data - already normalized in API hook
      setJobs(jobsData.jobs || []);
      setHealthStatus(healthData);
      
      // Handle metrics data - already normalized in API hook
      const processedMetrics = metricsData.metrics || [];
      
      // Deduplicate metrics - keep only the latest value for each metric name
      const uniqueMetrics = new Map();
      processedMetrics.forEach(metric => {
        const existing = uniqueMetrics.get(metric.name);
        if (!existing || new Date(metric.timestamp || 0) > new Date(existing.timestamp || 0)) {
          uniqueMetrics.set(metric.name, metric);
        }
      });
      
      const deduplicatedMetrics = Array.from(uniqueMetrics.values());
      console.log('✅ Processed metrics:', deduplicatedMetrics);
      setMetrics(deduplicatedMetrics);
      
      // Check alerts only when we have new metrics
      if (processedMetrics && processedMetrics.length > 0) {
        const newAlerts: Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: Date }> = [];
        
        alertRules.forEach(rule => {
          if (!rule.enabled) return;
          
          const metric = processedMetrics.find(m => m.name === rule.metric);
          if (!metric) return;
          
          let triggered = false;
          switch (rule.operator) {
            case 'gt':
              triggered = metric.value > rule.threshold;
              break;
            case 'lt':
              triggered = metric.value < rule.threshold;
              break;
            case 'eq':
              triggered = metric.value === rule.threshold;
              break;
          }
          
          if (triggered) {
            const severity = rule.threshold > 80 ? 'high' : rule.threshold > 50 ? 'medium' : 'low';
            newAlerts.push({
              id: `${rule.id}-${Date.now()}`,
              message: `${rule.metric} is ${metric.value}${metric.unit} (threshold: ${rule.threshold}${metric.unit})`,
              severity,
              timestamp: new Date()
            });
          }
        });
        
        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
          
          newAlerts.forEach(alert => {
            toast({
              title: `Alert: ${alert.severity.toUpperCase()}`,
              description: alert.message,
              variant: alert.severity === 'high' ? 'destructive' : 'default',
            });
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch background ops data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operations data. Please check your connection.",
        variant: "destructive",
      });
      
      // Clear existing data instead of using mock data
      setJobs([]);
      setHealthStatus(null);
      setMetrics([]);
    }
  }, [getJobs, getHealthStatus, getMetrics, alertRules, toast]);

  // Filter jobs based on criteria
  useEffect(() => {
    let filtered = jobs;
    
    if (jobFilter.status && jobFilter.status !== 'all-status') {
      filtered = filtered.filter(job => job.status === jobFilter.status);
    }
    
    if (jobFilter.type) {
      filtered = filtered.filter(job => job.type.includes(jobFilter.type!));
    }
    
    if (jobFilter.priority && jobFilter.priority !== 'all-priority') {
      filtered = filtered.filter(job => (job.priority || 0).toString() === jobFilter.priority);
    }
    
    if (jobFilter.search) {
      filtered = filtered.filter(job => 
        job.type.toLowerCase().includes(jobFilter.search!.toLowerCase()) ||
        job.id.toLowerCase().includes(jobFilter.search!.toLowerCase())
      );
    }
    
    setFilteredJobs(filtered);
  }, [jobs, jobFilter]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality with proper cleanup
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(fetchData, refreshInterval * 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  const handleBulkCancel = async () => {
    if (selectedJobs.length === 0) return;
    
    try {
      const result = await bulkCancelJobs(selectedJobs);
      
      toast({
        title: "Bulk Cancel Completed",
        description: `${result.successful.length} jobs cancelled successfully${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}.`,
        variant: result.failed.length > 0 ? "destructive" : "default",
      });
      setSelectedJobs([]);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel jobs.",
        variant: "destructive",
      });
    }
  };

  const handleBulkRetry = async () => {
    if (selectedJobs.length === 0) return;
    
    try {
      const result = await bulkRetryJobs(selectedJobs);
      
      toast({
        title: "Bulk Retry Completed",
        description: `${result.successful.length} jobs queued for retry${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}.`,
        variant: result.failed.length > 0 ? "destructive" : "default",
      });
      setSelectedJobs([]);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry jobs.",
        variant: "destructive",
      });
    }
  };

  const exportJobs = () => {
    const csvContent = [
      ['ID', 'Type', 'Status', 'Priority', 'Progress', 'Created', 'Started', 'Completed'].join(','),
      ...filteredJobs.map(job => [
        job.id,
        job.type,
        job.status,
        job.priority,
        job.progress,
        job.created_at,
        job.started_at || '',
        job.completed_at || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `background-jobs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMetrics = () => {
    const csvContent = [
      ['Metric', 'Value', 'Unit', 'Timestamp'].join(','),
      ...metrics.map(metric => [
        metric.name,
        metric.value,
        metric.unit,
        new Date().toISOString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-metrics-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getMetricTrend = (metric: SystemMetrics) => {
    // Simple trend simulation based on current value
    const isHigh = metric.value > 70;
    const isMedium = metric.value > 40;
    
    if (isHigh) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (isMedium) {
      return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-red-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Active Alerts ({alerts.filter(a => Date.now() - a.timestamp.getTime() < 300000).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{alert.message}</span>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Background Operations</CardTitle>
              <CardDescription>Monitor and manage system operations with real-time alerts</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label>Auto-refresh</Label>
              </div>
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} disabled={loading} size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Health Overview
              </CardTitle>
              <CardDescription>Real-time system performance metrics</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {healthStatus ? (
                <Badge variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </Badge>
              ) : (
                <Badge variant="outline">No Data</Badge>
              )}
              <Button onClick={fetchData} size="sm" variant="outline" disabled={loading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!healthStatus ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Health Data Unavailable</h3>
              <p className="text-sm text-muted-foreground">
                Health monitoring service is not configured or unavailable. 
                Please configure BACKGROUND_OPS_URL to enable health monitoring.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-5">
                {/* CPU Usage */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Server className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {metrics.find(m => m.name === 'cpu_usage')?.value?.toFixed(0) || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">CPU Usage</div>
                  <Progress 
                    value={metrics.find(m => m.name === 'cpu_usage')?.value || 0} 
                    className="h-2"
                  />
                </div>

                {/* Memory Usage */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {metrics.find(m => m.name === 'memory_usage')?.value?.toFixed(0) || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Memory</div>
                  <Progress 
                    value={metrics.find(m => m.name === 'memory_usage')?.value || 0} 
                    className="h-2"
                  />
                </div>

                {/* Disk Usage */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {metrics.find(m => m.name === 'disk_usage')?.value?.toFixed(0) || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Disk Usage</div>
                  <Progress 
                    value={metrics.find(m => m.name === 'disk_usage')?.value || 0} 
                    className="h-2"
                  />
                </div>

                {/* Database Connections */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Server className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {metrics.find(m => m.name === 'db_connections')?.value?.toFixed(0) || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">DB Connections</div>
                  <div className="h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${Math.min((metrics.find(m => m.name === 'db_connections')?.value || 0) / 200 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Active Users */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="h-8 w-8 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {metrics.find(m => m.name === 'active_users')?.value?.toLocaleString() || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Active Users</div>
                  <div className="h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-indigo-500 rounded"
                      style={{ width: `${Math.min((metrics.find(m => m.name === 'active_users')?.value || 0) / 2000 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Health Status Cards */}
              <div className="grid gap-4 md:grid-cols-4 mt-6">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Service Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold text-green-700 capitalize">
                      {healthStatus.status}
                    </div>
                    <p className="text-xs text-green-600">
                      All services operational
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Uptime
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {healthStatus.uptime?.toFixed(2) || '--'}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last 30 days
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
                    <div className="text-lg font-semibold">
                      {jobs.filter(job => job.status === 'running' || job.status === 'pending').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {jobs.length} total jobs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Response Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {metrics.find(m => m.name === 'api_response_time')?.value?.toFixed(0) || 'N/A'}ms
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average API response
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Background Jobs</CardTitle>
                  <CardDescription>
                    Monitor and manage background processing jobs
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Create Job
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Test Job</DialogTitle>
                        <DialogDescription>
                          Create a test background job for debugging purposes
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Job Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="test-simple">Simple Test Job</SelectItem>
                              <SelectItem value="test-long">Long Running Test</SelectItem>
                              <SelectItem value="test-fail">Failing Test Job</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select defaultValue="1">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">High (1)</SelectItem>
                              <SelectItem value="2">Medium (2)</SelectItem>
                              <SelectItem value="3">Low (3)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={async () => {
                          try {
                            const testJob = await createJob({
                              type: 'test-job',
                              payload: { 
                                message: 'Test background job',
                                timestamp: new Date().toISOString()
                              },
                              priority: 1
                            });
                            
                            toast({
                              title: "Test job created",
                              description: `Job ${testJob.id} has been queued successfully`,
                            });
                            
                            fetchData(); // Refresh the jobs list
                          } catch (error) {
                            toast({
                              title: "Error creating job",
                              description: "Failed to create test job",
                              variant: "destructive",
                            });
                          }
                        }}>
                          Create Job
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={exportJobs} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  {selectedJobs.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Pause className="h-4 w-4 mr-2" />
                            Cancel Selected ({selectedJobs.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Jobs</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel {selectedJobs.length} selected jobs? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkCancel}>
                              Confirm Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <Button onClick={handleBulkRetry} size="sm" variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry Selected
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={jobFilter.search || ''}
                    onChange={(e) => setJobFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="w-64"
                  />
                </div>
                
                <Select value={jobFilter.status || ''} onValueChange={(v) => setJobFilter(prev => ({ ...prev, status: v || undefined }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={jobFilter.priority || ''} onValueChange={(v) => setJobFilter(prev => ({ ...prev, priority: v || undefined }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-priority">All Priority</SelectItem>
                    <SelectItem value="1">High (1)</SelectItem>
                    <SelectItem value="2">Medium (2)</SelectItem>
                    <SelectItem value="3">Low (3)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setJobFilter({})}
                >
                  Clear Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No background jobs found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedJobs.length === filteredJobs.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedJobs(filteredJobs.map(job => job.id));
                            } else {
                              setSelectedJobs([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedJobs.includes(job.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedJobs(prev => [...prev, job.id]);
                              } else {
                                setSelectedJobs(prev => prev.filter(id => id !== job.id));
                              }
                            }}
                          />
                        </TableCell>
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
                           <Badge variant="outline">{job.priority || 0}</Badge>
                         </TableCell>
                         <TableCell>
                           <div className="w-24">
                             <Progress value={job.progress || 0} className="h-2" />
                             <span className="text-xs text-muted-foreground">
                               {job.progress || 0}%
                             </span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm">
                             {job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : 'Unknown'}
                           </div>
                         </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {job.started_at && job.completed_at ? (
                              `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                            ) : job.started_at ? (
                              `${Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)}s`
                            ) : (
                              '-'
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {job.status === 'failed' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Retry Job</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to retry this job? It will be queued for execution.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => retryJob(job.id)}>
                                      Retry Job
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {(job.status === 'pending' || job.status === 'running') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Job</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this job? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => cancelJob(job.id)}>
                                      Cancel Job
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Metrics</CardTitle>
                  <CardDescription>
                    Real-time performance metrics with trend analysis
                  </CardDescription>
                </div>
                <Button onClick={exportMetrics} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Metrics
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              Debug Info: {metrics.length} metrics loaded at {format(new Date(), 'HH:mm:ss')}
            </div>
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading metrics...
              </div>
            )}
            {!loading && metrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No metrics data available - Check console for API response details
              </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {metrics.map((metric, index) => (
                    <Card key={index} className={`${
                      metric.value > 80 ? 'border-red-200 bg-red-50' : 
                      metric.value > 60 ? 'border-yellow-200 bg-yellow-50' : 
                      'border-green-200 bg-green-50'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span>{metric.name.replace('_', ' ').toUpperCase()}</span>
                          {getMetricTrend(metric)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {metric.value.toFixed(2)} {metric.unit}
                        </div>
                        <Progress 
                          value={Math.min(metric.value, 100)} 
                          className={`h-2 mt-2 ${
                            metric.value > 80 ? '[&>div]:bg-red-500' : 
                            metric.value > 60 ? '[&>div]:bg-yellow-500' : 
                            '[&>div]:bg-green-500'
                          }`}
                        />
                        {metric.metadata && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last updated: {format(new Date(), 'HH:mm:ss')}
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

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules Configuration</CardTitle>
              <CardDescription>
                Configure automated alerts for system metrics and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => {
                          setAlertRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, enabled } : r
                          ));
                        }}
                      />
                      <div>
                        <div className="font-medium">{rule.metric.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          Alert when {rule.operator === 'gt' ? 'greater than' : rule.operator === 'lt' ? 'less than' : 'equal to'} {rule.threshold}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => {
                          setAlertRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, threshold: Number(e.target.value) } : r
                          ));
                        }}
                        className="w-20"
                      />
                      <Select
                        value={rule.operator}
                        onValueChange={(operator: 'gt' | 'lt' | 'eq') => {
                          setAlertRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, operator } : r
                          ));
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gt">Greater than</SelectItem>
                          <SelectItem value="lt">Less than</SelectItem>
                          <SelectItem value="eq">Equal to</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground">No recent alerts</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {alerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                          </div>
                        </div>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'default'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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