// Week 19-20: RBAC - Permission Management React Hooks
// Purpose: Permission checking and management with TanStack Query
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// =====================================================
// TYPES
// =====================================================

export interface Permission {
  id: string
  permission_group_id: string | null
  name: string
  display_name: string
  description: string | null
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'import' | 'manage' | 'execute'
  scope: 'global' | 'tenant' | 'department' | 'team' | 'own'
  conditions: Record<string, any>
  is_system_permission: boolean
  is_dangerous: boolean
  requires_approval: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  permission_groups?: {
    name: string
    icon: string | null
  }
}

export interface PermissionGroup {
  id: string
  name: string
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PermissionCheckInput {
  user_id?: string
  tenant_id: string
  permission_name?: string
  resource_type?: string
  action?: string
  resource_id?: string
  context?: Record<string, any>
}

export interface PermissionCheckResult {
  has_permission: boolean
  user_id: string
  permission_name: string
}

export interface BulkPermissionCheckResult {
  permission_name: string
  has_permission: boolean
  error?: string
}

export interface PermissionStat {
  permission_name: string
  total_checks: number
  granted_count: number
  denied_count: number
  grant_rate: number
  unique_users: number
}

// =====================================================
// QUERY KEYS
// =====================================================

const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (tenantId: string, resourceType?: string) =>
    [...permissionKeys.lists(), tenantId, resourceType] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...permissionKeys.details(), id] as const,
  checks: () => [...permissionKeys.all, 'check'] as const,
  check: (userId: string, tenantId: string, permissionName: string) =>
    [...permissionKeys.checks(), userId, tenantId, permissionName] as const,
  stats: (tenantId: string, days: number) =>
    [...permissionKeys.all, 'stats', tenantId, days] as const,
  audit: () => [...permissionKeys.all, 'audit'] as const,
  resources: () => [...permissionKeys.all, 'resources'] as const,
}

const permissionGroupKeys = {
  all: ['permission_groups'] as const,
  lists: () => [...permissionGroupKeys.all, 'list'] as const,
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
// HOOKS: Permissions List
// =====================================================

/**
 * Get all permissions (optionally filtered by resource type)
 */
export function usePermissions(tenantId: string, resourceType?: string) {
  return useQuery({
    queryKey: permissionKeys.list(tenantId, resourceType),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission/permissions`
      )
      url.searchParams.set('tenant_id', tenantId)
      if (resourceType) {
        url.searchParams.set('resource_type', resourceType)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch permissions')
      }

      const data = await response.json()
      return {
        permissions: data.permissions as Permission[],
        grouped_permissions: data.grouped_permissions as Record<string, Permission[]>,
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (permissions rarely change)
    enabled: !!tenantId,
  })
}

/**
 * Get permission groups
 */
export function usePermissionGroups() {
  return useQuery({
    queryKey: permissionGroupKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_groups')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as PermissionGroup[]
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Get available resources (resource types)
 */
export function usePermissionResources() {
  return useQuery({
    queryKey: permissionKeys.resources(),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission/resources`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch resources')
      }

      const data = await response.json()
      return data.resources as string[]
    },
    staleTime: 30 * 60 * 1000,
  })
}

// =====================================================
// HOOKS: Permission Checking
// =====================================================

/**
 * Check if user has a specific permission
 * @param input - Permission check parameters
 * @param enabled - Enable/disable query (default: true)
 */
export function useCheckPermission(input: PermissionCheckInput, enabled: boolean = true) {
  return useQuery({
    queryKey: permissionKeys.check(
      input.user_id || 'current',
      input.tenant_id,
      input.permission_name || `${input.resource_type}.${input.action}`
    ),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to check permission')
      }

      const data = await response.json()
      return data as PermissionCheckResult
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: enabled && !!input.tenant_id && (!!input.permission_name || (!!input.resource_type && !!input.action)),
  })
}

/**
 * Check multiple permissions at once
 */
export function useBulkCheckPermissions(
  tenantId: string,
  userId: string | undefined,
  permissions: Array<{
    permission_name?: string
    resource_type?: string
    action?: string
    resource_id?: string
    context?: Record<string, any>
  }>
) {
  return useQuery({
    queryKey: [...permissionKeys.checks(), 'bulk', tenantId, userId, JSON.stringify(permissions)],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission/bulk`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            permissions,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to check permissions')
      }

      const data = await response.json()
      return {
        user_id: data.user_id as string,
        results: data.results as BulkPermissionCheckResult[],
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!tenantId && permissions.length > 0,
  })
}

/**
 * Imperative permission check mutation
 * Use when you need to check permission based on user action
 */
export function useCheckPermissionMutation() {
  return useMutation({
    mutationFn: async (input: PermissionCheckInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to check permission')
      }

      return await response.json() as PermissionCheckResult
    },
  })
}

// =====================================================
// HOOKS: Permission Statistics
// =====================================================

/**
 * Get permission usage statistics
 */
export function usePermissionStats(tenantId: string, days: number = 30) {
  return useQuery({
    queryKey: permissionKeys.stats(tenantId, days),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission/stats?tenant_id=${tenantId}&days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch permission stats')
      }

      const data = await response.json()
      return {
        stats: data.stats as PermissionStat[],
        period_days: data.period_days as number,
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}

/**
 * Get permission audit log
 */
export function usePermissionAudit(
  tenantId: string,
  filters?: {
    user_id?: string
    permission_name?: string
    is_granted?: boolean
    limit?: number
    offset?: number
  }
) {
  return useQuery({
    queryKey: [...permissionKeys.audit(), tenantId, JSON.stringify(filters)],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permission/audit`
      )
      url.searchParams.set('tenant_id', tenantId)
      if (filters?.user_id) url.searchParams.set('user_id', filters.user_id)
      if (filters?.permission_name) url.searchParams.set('permission_name', filters.permission_name)
      if (filters?.is_granted !== undefined) url.searchParams.set('is_granted', String(filters.is_granted))
      if (filters?.limit) url.searchParams.set('limit', String(filters.limit))
      if (filters?.offset) url.searchParams.set('offset', String(filters.offset))

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch audit log')
      }

      return await response.json()
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!tenantId,
  })
}

// =====================================================
// HOOKS: Convenience
// =====================================================

/**
 * Simple hook to check if current user has permission
 * Returns boolean directly for easy conditional rendering
 */
export function useHasPermission(
  tenantId: string,
  permissionName: string,
  options?: {
    resourceId?: string
    context?: Record<string, any>
    enabled?: boolean
  }
): boolean {
  const { data } = useCheckPermission(
    {
      tenant_id: tenantId,
      permission_name: permissionName,
      resource_id: options?.resourceId,
      context: options?.context,
    },
    options?.enabled !== false
  )

  return data?.has_permission || false
}

/**
 * Check if user can perform action on resource type
 */
export function useCanPerform(
  tenantId: string,
  resourceType: string,
  action: string,
  options?: {
    resourceId?: string
    context?: Record<string, any>
    enabled?: boolean
  }
): boolean {
  const { data } = useCheckPermission(
    {
      tenant_id: tenantId,
      resource_type: resourceType,
      action,
      resource_id: options?.resourceId,
      context: options?.context,
    },
    options?.enabled !== false
  )

  return data?.has_permission || false
}
