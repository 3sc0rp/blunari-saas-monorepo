import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface BackgroundJob {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  payload: Record<string, any>
  priority: number
  progress: number
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface SystemMetrics {
  name: string
  value: number
  unit: string
  metadata?: Record<string, any>
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  services: Record<string, any>
  uptime: number
  version?: string
}

export interface ScheduledJob {
  id: string
  type: string
  schedule: string // cron expression
  payload: Record<string, any>
  enabled: boolean
  nextRun: string
  lastRun?: string
}

export interface JobHistoryEntry {
  id: string
  jobId: string
  action: 'created' | 'started' | 'completed' | 'failed' | 'cancelled' | 'retried'
  timestamp: string
  userId?: string
  details?: Record<string, any>
}

export interface PerformanceAlert {
  id: string
  metric: string
  threshold: number
  currentValue: number
  severity: 'low' | 'medium' | 'high'
  timestamp: string
  resolved: boolean
}

export const useEnhancedBackgroundOpsAPI = () => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const callAPI = useCallback(async (functionName: string, options: any = {}) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke(functionName, options)

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error(`${functionName} API Error:`, error)
      toast({
        title: "API Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      throw error
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Enhanced Job Management
  const getJobs = useCallback(async (filters?: {
    status?: string
    type?: string
    priority?: number
    limit?: number
    offset?: number
  }): Promise<{ jobs: BackgroundJob[], total: number }> => {
    const result = await callAPI('jobs-api', {
      body: { action: 'list', filters }
    })
    
    // Handle different response formats
    if (Array.isArray(result)) {
      return { jobs: result, total: result.length }
    }
    if (result.jobs && Array.isArray(result.jobs)) {
      return { jobs: result.jobs, total: result.total || result.jobs.length }
    }
    return { jobs: [], total: 0 }
  }, [callAPI])

  const getJob = useCallback(async (id: string): Promise<BackgroundJob> => {
    return callAPI('jobs-api', {
      body: { action: 'get', id }
    })
  }, [callAPI])

  const createJob = useCallback(async (jobData: {
    type: string
    payload: Record<string, any>
    priority?: number
    scheduledFor?: string
  }): Promise<BackgroundJob> => {
    const result = await callAPI('jobs-api', {
      body: { action: 'create', ...jobData }
    })
    
    // Log job creation
    await logJobHistory(result.id, 'created', { payload: jobData.payload })
    
    return result
  }, [callAPI])

  const bulkCancelJobs = useCallback(async (jobIds: string[]): Promise<{ successful: string[], failed: string[] }> => {
    const results = { successful: [], failed: [] }
    
    for (const jobId of jobIds) {
      try {
        await callAPI('jobs-api', {
          body: { action: 'cancel', id: jobId }
        })
        await logJobHistory(jobId, 'cancelled')
        results.successful.push(jobId)
      } catch (error) {
        results.failed.push(jobId)
      }
    }
    
    return results
  }, [callAPI])

  const bulkRetryJobs = useCallback(async (jobIds: string[]): Promise<{ successful: string[], failed: string[] }> => {
    const results = { successful: [], failed: [] }
    
    for (const jobId of jobIds) {
      try {
        await callAPI('jobs-api', {
          body: { action: 'retry', id: jobId }
        })
        await logJobHistory(jobId, 'retried')
        results.successful.push(jobId)
      } catch (error) {
        results.failed.push(jobId)
      }
    }
    
    return results
  }, [callAPI])

  const cancelJob = useCallback(async (id: string): Promise<boolean> => {
    const result = await callAPI('jobs-api', {
      body: { action: 'cancel', id }
    })
    await logJobHistory(id, 'cancelled')
    return result
  }, [callAPI])

  const retryJob = useCallback(async (id: string): Promise<BackgroundJob> => {
    const result = await callAPI('jobs-api', {
      body: { action: 'retry', id }
    })
    await logJobHistory(id, 'retried')
    return result
  }, [callAPI])

  // Job Scheduling
  const getScheduledJobs = useCallback(async (): Promise<ScheduledJob[]> => {
    return callAPI('jobs-api', {
      body: { action: 'scheduled' }
    })
  }, [callAPI])

  const createScheduledJob = useCallback(async (scheduledJobData: {
    type: string
    schedule: string
    payload: Record<string, any>
    enabled?: boolean
  }): Promise<ScheduledJob> => {
    return callAPI('jobs-api', {
      body: { action: 'schedule', ...scheduledJobData }
    })
  }, [callAPI])

  const updateScheduledJob = useCallback(async (id: string, updates: Partial<ScheduledJob>): Promise<ScheduledJob> => {
    return callAPI('jobs-api', {
      body: { action: 'update_schedule', id, updates }
    })
  }, [callAPI])

  // Job History and Audit
  const getJobHistory = useCallback(async (jobId?: string, limit = 100): Promise<JobHistoryEntry[]> => {
    return callAPI('jobs-api', {
      body: { action: 'history', jobId, limit }
    })
  }, [callAPI])

  const logJobHistory = useCallback(async (
    jobId: string, 
    action: JobHistoryEntry['action'], 
    details?: Record<string, any>
  ): Promise<void> => {
    try {
      await callAPI('jobs-api', {
        body: { 
          action: 'log_history', 
          jobId, 
          historyAction: action, 
          details 
        }
      })
    } catch (error) {
      // Don't throw on history logging failures
      console.warn('Failed to log job history:', error)
    }
  }, [callAPI])

  // Enhanced Health & Metrics
  const getHealthStatus = useCallback(async (): Promise<HealthStatus> => {
    const result = await callAPI('health-check-api')
    
    // Normalize response format
    return {
      status: result.status || 'unhealthy',
      services: result.services || {},
      uptime: result.uptime || 0,
      version: result.version
    }
  }, [callAPI])

  const getMetrics = useCallback(async (type: 'system' | 'jobs' | 'database' = 'system'): Promise<{
    metrics: SystemMetrics[]
    timestamp: string
  }> => {
    const result = await callAPI('metrics-api', {
      body: { type }
    })
    
    // Normalize metrics response format
    let metrics: SystemMetrics[] = []
    
    if (result.metrics && Array.isArray(result.metrics)) {
      metrics = result.metrics
    } else if (Array.isArray(result)) {
      metrics = result
    } else if (result && typeof result === 'object') {
      // Convert object format to array
      metrics = Object.entries(result).map(([key, value]) => ({
        name: key,
        value: typeof value === 'number' ? value : 0,
        unit: key.includes('usage') ? '%' : key.includes('time') ? 'ms' : 'count'
      }))
    }
    
    return {
      metrics,
      timestamp: result.timestamp || new Date().toISOString()
    }
  }, [callAPI])

  const getHistoricalMetrics = useCallback(async (
    metric: string, 
    timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
  ): Promise<Array<{ timestamp: string, value: number }>> => {
    return callAPI('metrics-api', {
      body: { action: 'historical', metric, timeRange }
    })
  }, [callAPI])

  // Performance Alerts
  const getActiveAlerts = useCallback(async (): Promise<PerformanceAlert[]> => {
    return callAPI('alerts-api', {
      body: { action: 'active' }
    })
  }, [callAPI])

  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    return callAPI('alerts-api', {
      body: { action: 'acknowledge', alertId }
    })
  }, [callAPI])

  const createAlertRule = useCallback(async (rule: {
    metric: string
    threshold: number
    operator: 'gt' | 'lt' | 'eq'
    severity: 'low' | 'medium' | 'high'
    enabled: boolean
  }): Promise<void> => {
    return callAPI('alerts-api', {
      body: { action: 'create_rule', rule }
    })
  }, [callAPI])

  // System Diagnostics
  const runSystemDiagnostics = useCallback(async (): Promise<{
    systemHealth: Record<string, any>
    diskSpace: Record<string, any>
    memoryUsage: Record<string, any>
    networkConnectivity: Record<string, any>
    databaseConnections: Record<string, any>
  }> => {
    return callAPI('diagnostics-api', {
      body: { action: 'full_scan' }
    })
  }, [callAPI])

  const cleanupOldJobs = useCallback(async (olderThanDays = 30): Promise<{ cleaned: number }> => {
    return callAPI('jobs-api', {
      body: { action: 'cleanup', olderThanDays }
    })
  }, [callAPI])

  // Data Export
  const exportJobsData = useCallback(async (filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
    format?: 'csv' | 'json'
  }): Promise<{ downloadUrl: string }> => {
    return callAPI('export-api', {
      body: { type: 'jobs', filters }
    })
  }, [callAPI])

  const exportMetricsData = useCallback(async (filters?: {
    metrics?: string[]
    dateFrom?: string
    dateTo?: string
    format?: 'csv' | 'json'
  }): Promise<{ downloadUrl: string }> => {
    return callAPI('export-api', {
      body: { type: 'metrics', filters }
    })
  }, [callAPI])

  // Generic proxy for other endpoints
  const proxyRequest = useCallback(async (endpoint: string, params: Record<string, any> = {}) => {
    return callAPI('background-ops-proxy', {
      body: { endpoint, ...params }
    })
  }, [callAPI])

  return {
    loading,
    
    // Enhanced Job Management
    getJobs,
    getJob,
    createJob,
    cancelJob,
    retryJob,
    bulkCancelJobs,
    bulkRetryJobs,
    
    // Job Scheduling
    getScheduledJobs,
    createScheduledJob,
    updateScheduledJob,
    
    // Job History & Audit
    getJobHistory,
    logJobHistory,
    
    // Health & Metrics
    getHealthStatus,
    getMetrics,
    getHistoricalMetrics,
    
    // Performance Alerts
    getActiveAlerts,
    acknowledgeAlert,
    createAlertRule,
    
    // System Diagnostics
    runSystemDiagnostics,
    cleanupOldJobs,
    
    // Data Export
    exportJobsData,
    exportMetricsData,
    
    // Generic proxy
    proxyRequest,
  }
}