// Week 19-20: RBAC - User Role Management React Hooks
// Purpose: Assign/revoke roles and manage user permissions
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// =====================================================
// TYPES
// =====================================================

export interface UserRole {
  role_id: string
  role_name: string
  role_display_name: string
  role_type: 'system' | 'custom'
  hierarchy_level: number
  scope_type: string | null
  scope_id: string | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
}

export interface UserPermission {
  permission_name: string
  resource: string
  action: string
  scope: string
  conditions: Record<string, any>
  role_name: string
  is_granted: boolean
}

export interface AssignRoleInput {
  tenant_id: string
  user_id: string
  role_id: string
  scope_type?: string
  scope_id?: string
  valid_from?: string
  valid_until?: string
  notes?: string
}

export interface BulkAssignRoleInput {
  tenant_id: string
  user_ids: string[]
  role_id: string
  scope_type?: string
  scope_id?: string
}

export interface PermissionAuditEntry {
  id: string
  tenant_id: string
  user_id: string
  permission_name: string
  resource_type: string
  resource_id: string | null
  action: string
  scope: string | null
  is_granted: boolean
  denial_reason: string | null
  request_metadata: Record<string, any>
  conditions_evaluated: Record<string, any>
  checked_at: string
}

// =====================================================
// QUERY KEYS
// =====================================================

const userRoleKeys = {
  all: ['user_roles'] as const,
  lists: () => [...userRoleKeys.all, 'list'] as const,
  list: (userId: string, tenantId: string) => [...userRoleKeys.lists(), userId, tenantId] as const,
  permissions: (userId: string, tenantId: string) =>
    [...userRoleKeys.all, 'permissions', userId, tenantId] as const,
  audit: (userId: string, tenantId: string) =>
    [...userRoleKeys.all, 'audit', userId, tenantId] as const,
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
// HOOKS: User Roles
// =====================================================

/**
 * Get all roles assigned to a user
 */
export function useUserRoles(userId: string, tenantId: string) {
  return useQuery({
    queryKey: userRoleKeys.list(userId, tenantId),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles?user_id=${userId}&tenant_id=${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user roles')
      }

      const data = await response.json()
      return data.roles as UserRole[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId && !!tenantId,
  })
}

/**
 * Get current user's roles
 */
export function useCurrentUserRoles(tenantId: string) {
  return useQuery({
    queryKey: [...userRoleKeys.all, 'current', tenantId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles?user_id=${user.id}&tenant_id=${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch current user roles')
      }

      const data = await response.json()
      return data.roles as UserRole[]
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}

/**
 * Get all effective permissions for a user
 */
export function useUserPermissions(userId: string, tenantId: string) {
  return useQuery({
    queryKey: userRoleKeys.permissions(userId, tenantId),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/permissions?user_id=${userId}&tenant_id=${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user permissions')
      }

      const data = await response.json()
      return {
        permissions: data.permissions as UserPermission[],
        grouped_permissions: data.grouped_permissions as Record<string, UserPermission[]>,
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId && !!tenantId,
  })
}

/**
 * Get current user's permissions
 */
export function useCurrentUserPermissions(tenantId: string) {
  return useQuery({
    queryKey: [...userRoleKeys.all, 'current-permissions', tenantId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/permissions?user_id=${user.id}&tenant_id=${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch current user permissions')
      }

      const data = await response.json()
      return {
        permissions: data.permissions as UserPermission[],
        grouped_permissions: data.grouped_permissions as Record<string, UserPermission[]>,
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}

// =====================================================
// HOOKS: Role Assignment
// =====================================================

/**
 * Assign role to user
 */
export function useAssignRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AssignRoleInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/assign`,
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
        throw new Error(error.error || 'Failed to assign role')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate user roles and permissions
      queryClient.invalidateQueries({
        queryKey: userRoleKeys.list(variables.user_id, variables.tenant_id),
      })
      queryClient.invalidateQueries({
        queryKey: userRoleKeys.permissions(variables.user_id, variables.tenant_id),
      })
    },
  })
}

/**
 * Revoke role from user
 */
export function useRevokeRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userRoleId: string) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/revoke`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_role_id: userRoleId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke role')
      }

      return await response.json()
    },
    onSuccess: () => {
      // Invalidate all user role queries
      queryClient.invalidateQueries({ queryKey: userRoleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: [...userRoleKeys.all, 'permissions'] })
    },
  })
}

/**
 * Bulk assign role to multiple users
 */
export function useBulkAssignRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkAssignRoleInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/bulk-assign`,
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
        throw new Error(error.error || 'Failed to bulk assign role')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate role queries for all affected users
      variables.user_ids.forEach((userId) => {
        queryClient.invalidateQueries({
          queryKey: userRoleKeys.list(userId, variables.tenant_id),
        })
        queryClient.invalidateQueries({
          queryKey: userRoleKeys.permissions(userId, variables.tenant_id),
        })
      })
    },
  })
}

// =====================================================
// HOOKS: Permission Audit
// =====================================================

/**
 * Get permission audit log for user
 */
export function useUserPermissionAudit(
  userId: string,
  tenantId: string,
  options?: {
    limit?: number
    offset?: number
  }
) {
  return useQuery({
    queryKey: [...userRoleKeys.audit(userId, tenantId), options?.limit, options?.offset],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles/audit`
      )
      url.searchParams.set('user_id', userId)
      url.searchParams.set('tenant_id', tenantId)
      if (options?.limit) url.searchParams.set('limit', String(options.limit))
      if (options?.offset) url.searchParams.set('offset', String(options.offset))

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

      const data = await response.json()
      return {
        audit_log: data.audit_log as PermissionAuditEntry[],
        limit: data.limit as number,
        offset: data.offset as number,
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!userId && !!tenantId,
  })
}

// =====================================================
// HOOKS: Convenience
// =====================================================

/**
 * Check if user has specific role
 */
export function useUserHasRole(
  userId: string,
  tenantId: string,
  roleName: string
): boolean {
  const { data: roles } = useUserRoles(userId, tenantId)
  return roles?.some((role) => role.role_name === roleName) || false
}

/**
 * Check if current user has specific role
 */
export function useCurrentUserHasRole(
  tenantId: string,
  roleName: string
): boolean {
  const { data: roles } = useCurrentUserRoles(tenantId)
  return roles?.some((role) => role.role_name === roleName) || false
}

/**
 * Get highest priority role for user (lowest hierarchy level)
 */
export function useUserPrimaryRole(
  userId: string,
  tenantId: string
): UserRole | undefined {
  const { data: roles } = useUserRoles(userId, tenantId)
  
  if (!roles || roles.length === 0) return undefined
  
  return roles.reduce((highest, current) => 
    current.hierarchy_level < highest.hierarchy_level ? current : highest
  )
}

/**
 * Check if user is admin (has admin, manager, or super_admin role)
 */
export function useIsAdmin(userId: string, tenantId: string): boolean {
  const { data: roles } = useUserRoles(userId, tenantId)
  
  return roles?.some((role) => 
    ['super_admin', 'admin', 'manager'].includes(role.role_name)
  ) || false
}

/**
 * Check if current user is admin
 */
export function useCurrentUserIsAdmin(tenantId: string): boolean {
  const { data: roles } = useCurrentUserRoles(tenantId)
  
  return roles?.some((role) => 
    ['super_admin', 'admin', 'manager'].includes(role.role_name)
  ) || false
}
