// Week 21-22: Audit Logging - Core Audit Log React Hooks
// Purpose: Comprehensive audit logging with React Query
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

// =====================================================
// TYPES
// =====================================================

export type AuditLogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'login'
  | 'logout'
  | 'permission_denied'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'restore'
  | 'archive'

export type AuditLogSeverity = 'info' | 'warning' | 'error' | 'critical'

export type AuditLogStatus = 'success' | 'failure' | 'pending'

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  user_email: string | null
  user_name: string | null
  action: AuditLogAction
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  severity: AuditLogSeverity
  status: AuditLogStatus
  error_message: string | null
  metadata: Record<string, any> | null
  tags: string[] | null
  created_at: string
}

export interface AuditLogFilters {
  tenant_id: string
  user_id?: string
  action?: AuditLogAction | AuditLogAction[]
  resource_type?: string | string[]
  resource_id?: string
  severity?: AuditLogSeverity | AuditLogSeverity[]
  status?: AuditLogStatus | AuditLogStatus[]
  start_date?: string
  end_date?: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
  include_stats?: boolean
}

export interface AuditLogStats {
  total_logs: number
  by_action: Record<string, number>
  by_resource_type: Record<string, number>
  by_severity: Record<string, number>
  by_status: Record<string, number>
  unique_users: number
  date_range: {
    start: string
    end: string
  }
}

export interface AuditLogResponse {
  success: boolean
  logs: AuditLog[]
  total_count: number
  stats?: AuditLogStats
}

export interface LogActivityInput {
  action: AuditLogAction
  resource_type: string
  resource_id?: string
  resource_name?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  severity?: AuditLogSeverity
  status?: AuditLogStatus
  error_message?: string
  metadata?: Record<string, any>
  tags?: string[]
}

export interface BatchLogActivityInput {
  logs: LogActivityInput[]
}

// =====================================================
// QUERY KEYS
// =====================================================

const auditKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: AuditLogFilters) =>
    [...auditKeys.lists(), tenantId, filters] as const,
  stats: (tenantId: string, dateRange?: { start: string; end: string }) =>
    [...auditKeys.all, 'stats', tenantId, dateRange] as const,
  timeline: (tenantId: string, userId: string) =>
    [...auditKeys.all, 'timeline', tenantId, userId] as const,
  history: (tenantId: string, resourceType: string, resourceId: string) =>
    [...auditKeys.all, 'history', tenantId, resourceType, resourceId] as const,
}

// =====================================================
// HELPER: Get Access Token
// =====================================================

async function getAccessToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

// =====================================================
// HELPER: Get Client Context
// =====================================================

function getClientContext() {
  return {
    ip_address: undefined, // Server will detect from request
    user_agent: navigator.userAgent,
    session_id: undefined, // Server will use JWT session
  }
}

// =====================================================
// HOOK: Query Audit Logs
// =====================================================

/**
 * Query audit logs with filters
 * @param tenantId - Tenant ID
 * @param filters - Optional filters for querying logs
 */
export function useAuditLogs(tenantId: string, filters?: Omit<AuditLogFilters, 'tenant_id'>) {
  return useQuery({
    queryKey: auditKeys.list(tenantId, { tenant_id: tenantId, ...filters }),
    queryFn: async (): Promise<AuditLogResponse> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-audit-logs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            ...filters,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch audit logs' }))
        throw new Error(error.error || 'Failed to fetch audit logs')
      }

      return await response.json()
    },
    staleTime: 60000, // 1 minute
    enabled: !!tenantId,
    retry: 2,
  })
}

// =====================================================
// HOOK: Log Single Activity
// =====================================================

/**
 * Log a single activity
 * @param tenantId - Tenant ID
 */
export function useLogActivity(tenantId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: LogActivityInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const context = getClientContext()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-activity`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            ...input,
            ...context,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to log activity' }))
        throw new Error(error.error || 'Failed to log activity')
      }

      return await response.json()
    },
    onSuccess: () => {
      // Invalidate audit log lists
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
    },
    onError: (error: Error) => {
      // Silent failure for logging - don't disrupt user flow
      console.error('Failed to log activity:', error.message)
    },
  })
}

// =====================================================
// HOOK: Batch Log Activities
// =====================================================

/**
 * Log multiple activities in a batch
 * @param tenantId - Tenant ID
 */
export function useBatchLogActivity(tenantId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: BatchLogActivityInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const context = getClientContext()

      // Add tenant_id and context to each log entry
      const logsWithContext = input.logs.map(log => ({
        tenant_id: tenantId,
        ...log,
        ...context,
      }))

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-activity`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batch: true,
            logs: logsWithContext,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to batch log activities' }))
        throw new Error(error.error || 'Failed to batch log activities')
      }

      return await response.json()
    },
    onSuccess: () => {
      // Invalidate audit log lists
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
    },
    onError: (error: Error) => {
      // Silent failure for logging - don't disrupt user flow
      console.error('Failed to batch log activities:', error.message)
    },
  })
}

// =====================================================
// HOOK: Audit Statistics
// =====================================================

/**
 * Get audit statistics for a date range
 * @param tenantId - Tenant ID
 * @param dateRange - Optional date range (defaults to last 30 days)
 */
export function useAuditStats(
  tenantId: string,
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: auditKeys.stats(tenantId, dateRange),
    queryFn: async (): Promise<AuditLogStats> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      // Default to last 30 days if no date range provided
      const defaultEnd = new Date().toISOString()
      const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-audit-logs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            start_date: dateRange?.start || defaultStart,
            end_date: dateRange?.end || defaultEnd,
            include_stats: true,
            limit: 1, // We only need stats, not logs
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch audit stats' }))
        throw new Error(error.error || 'Failed to fetch audit stats')
      }

      const data = await response.json()
      return data.stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantId,
  })
}

// =====================================================
// HOOK: Export Audit Logs
// =====================================================

/**
 * Export audit logs to CSV
 * @param tenantId - Tenant ID
 */
export function useExportAudit(tenantId: string) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (filters?: Omit<AuditLogFilters, 'tenant_id'>) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-audit-logs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            ...filters,
            export_format: 'csv',
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to export audit logs' }))
        throw new Error(error.error || 'Failed to export audit logs')
      }

      // Get CSV content from response
      const csvContent = await response.text()

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    },
    onSuccess: () => {
      toast({
        title: 'Export successful',
        description: 'Audit logs have been exported to CSV',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =====================================================
// HOOK: User Activity Timeline
// =====================================================

/**
 * Get activity timeline for a specific user
 * @param tenantId - Tenant ID
 * @param userId - User ID
 */
export function useUserActivityTimeline(tenantId: string, userId: string | undefined) {
  return useQuery({
    queryKey: auditKeys.timeline(tenantId, userId || ''),
    queryFn: async (): Promise<AuditLog[]> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-audit-logs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            limit: 100,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch user activity' }))
        throw new Error(error.error || 'Failed to fetch user activity')
      }

      const data = await response.json()
      return data.logs
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!tenantId && !!userId,
  })
}

// =====================================================
// HOOK: Resource History
// =====================================================

/**
 * Get change history for a specific resource
 * @param tenantId - Tenant ID
 * @param resourceType - Resource type (e.g., 'booking', 'user')
 * @param resourceId - Resource ID
 */
export function useResourceHistory(
  tenantId: string,
  resourceType: string | undefined,
  resourceId: string | undefined
) {
  return useQuery({
    queryKey: auditKeys.history(tenantId, resourceType || '', resourceId || ''),
    queryFn: async (): Promise<AuditLog[]> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-audit-logs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            resource_type: resourceType,
            resource_id: resourceId,
            limit: 50,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch resource history' }))
        throw new Error(error.error || 'Failed to fetch resource history')
      }

      const data = await response.json()
      return data.logs
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!tenantId && !!resourceType && !!resourceId,
  })
}
