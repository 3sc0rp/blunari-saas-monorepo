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

export const useBackgroundOpsAPI = () => {
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

  // Job Management
  const getJobs = useCallback(async (): Promise<BackgroundJob[]> => {
    console.log('Calling jobs-api with action: list')
    return callAPI('jobs-api', {
      body: { action: 'list' }
    })
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
  }): Promise<BackgroundJob> => {
    return callAPI('jobs-api', {
      body: { action: 'create', ...jobData }
    })
  }, [callAPI])

  const cancelJob = useCallback(async (id: string): Promise<boolean> => {
    return callAPI('jobs-api', {
      body: { action: 'cancel', id }
    })
  }, [callAPI])

  const retryJob = useCallback(async (id: string): Promise<BackgroundJob> => {
    return callAPI('jobs-api', {
      body: { action: 'retry', id }
    })
  }, [callAPI])

  // Health Check
  const getHealthStatus = useCallback(async (): Promise<HealthStatus> => {
    return callAPI('health-check-api')
  }, [callAPI])

  // Metrics
  const getMetrics = useCallback(async (type: 'system' | 'jobs' | 'database' = 'system'): Promise<{
    metrics: SystemMetrics[]
    timestamp: string
  }> => {
    console.log('Calling metrics-api with type:', type)
    return callAPI('metrics-api', {
      body: { type }
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
    
    // Job Management
    getJobs,
    getJob,
    createJob,
    cancelJob,
    retryJob,
    
    // Health & Metrics
    getHealthStatus,
    getMetrics,
    
    // Generic proxy
    proxyRequest,
  }
}