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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { useEnhancedBackgroundOpsAPI } from "@/hooks/useEnhancedBackgroundOpsAPI";
import { useToast } from "@/hooks/use-toast";
import type { BackgroundJob } from "@/types/admin";
import { JobEnqueueSchema, type JobEnqueueData } from "@/types/admin";

interface BackgroundJobsPanelProps {
  tenantId?: string;
}

export function BackgroundJobsPanel({ tenantId }: BackgroundJobsPanelProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
  });

  const { getJobs, cancelJob, retryJob, createJob } =
    useEnhancedBackgroundOpsAPI();
  const { toast } = useToast();

  const [newJob, setNewJob] = useState<Partial<JobEnqueueData>>({
    type: "WELCOME_EMAIL",
    payload: {},
    priority: 5,
  });

  useEffect(() => {
    loadJobs();
  }, [filters, tenantId]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await getJobs({
        status: filters.status !== "all" ? filters.status : undefined,
        type: filters.type !== "all" ? filters.type : undefined,
        limit: 50,
      });
      setJobs(response.jobs as any);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load background jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      await cancelJob(jobId);
      await loadJobs(); // Refresh

      toast({
        title: "Job Cancelled",
        description: "Background job has been cancelled successfully.",
      });
    } catch (error) {
      console.error("Error cancelling job:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      await retryJob(jobId);
      await loadJobs(); // Refresh

      toast({
        title: "Job Retried",
        description: "Background job has been queued for retry.",
      });
    } catch (error) {
      console.error("Error retrying job:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateJob = async () => {
    try {
      // Validate job data
      const validatedJob = JobEnqueueSchema.parse({
        ...newJob,
        tenant_id: tenantId,
        idempotency_key: crypto.randomUUID(),
      });

      await createJob({
        type: validatedJob.type!,
        payload: validatedJob.payload!,
        priority: validatedJob.priority,
        scheduledFor: validatedJob.schedule_at,
      });
      await loadJobs(); // Refresh
      setShowCreateJob(false);

      // Reset form
      setNewJob({
        type: "WELCOME_EMAIL",
        payload: {},
        priority: 5,
      });

      toast({
        title: "Job Created",
        description: "Background job has been enqueued successfully.",
      });
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: "Failed to create background job",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "running":
        return (
          <Badge variant="default">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <Square className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canCancel = (job: BackgroundJob) => {
    return ["pending", "running"].includes(job.status);
  };

  const canRetry = (job: BackgroundJob) => {
    return (
      ["failed", "cancelled"].includes(job.status) &&
      job.attempts < job.max_retries
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Background Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Manage background job execution and monitoring
          </p>
        </div>

        <Button onClick={() => setShowCreateJob(!showCreateJob)}>
          <Plus className="h-4 w-4 mr-2" />
          Enqueue Job
        </Button>
      </div>

      {/* Create Job Form */}
      {showCreateJob && (
        <Card>
          <CardHeader>
            <CardTitle>Enqueue New Job</CardTitle>
            <CardDescription>
              Create a new background job for this tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type</Label>
                <Select
                  value={newJob.type}
                  onValueChange={(value) =>
                    setNewJob((prev) => ({ ...prev, type: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WELCOME_EMAIL">Welcome Email</SelectItem>
                    <SelectItem value="RESERVATION_EMAIL">
                      Reservation Email
                    </SelectItem>
                    <SelectItem value="ANALYTICS_AGGREGATE">
                      Analytics Aggregate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={newJob.priority}
                  onChange={(e) =>
                    setNewJob((prev) => ({
                      ...prev,
                      priority: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Payload (JSON)</Label>
              <Input
                placeholder='{"email": "user@example.com"}'
                value={JSON.stringify(newJob.payload)}
                onChange={(e) => {
                  try {
                    const payload = JSON.parse(e.target.value || "{}");
                    setNewJob((prev) => ({ ...prev, payload }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateJob(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateJob}>Enqueue Job</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div>
              <Label>Status Filter</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type Filter</Label>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="WELCOME_EMAIL">Welcome Email</SelectItem>
                  <SelectItem value="RESERVATION_EMAIL">
                    Reservation Email
                  </SelectItem>
                  <SelectItem value="ANALYTICS_AGGREGATE">
                    Analytics Aggregate
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadJobs}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading jobs...
                    </TableCell>
                  </TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No jobs found</p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filters or create a new job
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">
                        {job.id.substring(0, 8)}...
                        {job.idempotency_key && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Idempotent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            job.attempts >= job.max_retries
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {job.attempts}/{job.max_retries}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canCancel(job) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelJob(job.id)}
                              disabled={actionLoading === job.id}
                            >
                              {actionLoading === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Square className="h-3 w-3" />
                              )}
                            </Button>
                          )}

                          {canRetry(job) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryJob(job.id)}
                              disabled={actionLoading === job.id}
                            >
                              {actionLoading === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
