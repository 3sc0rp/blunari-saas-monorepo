// Week 19-20: RBAC - Role Management React Hooks
// Purpose: Comprehensive role management with TanStack Query
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// =====================================================
// TYPES
// =====================================================

export interface Role {
  id: string
  tenant_id: string | null
  name: string
  display_name: string
  description: string | null
  role_type: 'system' | 'custom'
  parent_role_id: string | null
  hierarchy_level: number
  is_default: boolean
  is_active: boolean
  max_users: number | null
  color: string | null
  icon: string | null
  display_order: number
  created_at: string
  updated_at: string
  created_by: string | null
  permissions?: RolePermission[]
  user_count?: number
}

export interface RolePermission {
  permission_id: string
  permission_name: string
  resource: string
  action: string
  scope: string
  is_inherited: boolean
  inherited_from_role: string | null
}

export interface RoleCreateInput {
  tenant_id: string
  name: string
  display_name: string
  description?: string
  parent_role_id?: string
  color?: string
  icon?: string
  is_default?: boolean
  max_users?: number
}

export interface RoleUpdateInput {
  display_name?: string
  description?: string
  parent_role_id?: string | null
  color?: string
  icon?: string
  is_default?: boolean
  is_active?: boolean
  max_users?: number | null
}

// =====================================================
// QUERY KEYS
// =====================================================

const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (tenantId: string, includeSystem?: boolean) =>
    [...roleKeys.lists(), tenantId, includeSystem] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  users: (roleId: string) => [...roleKeys.all, 'users', roleId] as const,
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
// HOOKS: Role CRUD
// =====================================================

/**
 * Get all roles for a tenant
 * @param tenantId - Tenant ID
 * @param includeSystem - Include system roles (default: true)
 */
export function useRoles(tenantId: string, includeSystem: boolean = true) {
  return useQuery({
    queryKey: roleKeys.list(tenantId, includeSystem),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles?tenant_id=${tenantId}&include_system=${includeSystem}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch roles')
      }

      const data = await response.json()
      return data.roles as Role[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantId,
  })
}

/**
 * Get single role with permissions and user count
 * @param roleId - Role ID
 */
export function useRole(roleId: string | undefined) {
  return useQuery({
    queryKey: roleKeys.detail(roleId || ''),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles/${roleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch role')
      }

      const data = await response.json()
      return data.role as Role
    },
    enabled: !!roleId,
  })
}

/**
 * Get system roles only
 */
export function useSystemRoles() {
  return useQuery({
    queryKey: [...roleKeys.all, 'system'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true })

      if (error) throw error
      return data as Role[]
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (system roles rarely change)
  })
}

/**
 * Create new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RoleCreateInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles`,
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
        throw new Error(error.error || 'Failed to create role')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate role lists
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

/**
 * Update role
 */
export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RoleUpdateInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles/${roleId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      return await response.json()
    },
    onSuccess: () => {
      // Invalidate specific role and lists
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

/**
 * Delete role (soft delete)
 */
export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleId: string) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles/${roleId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role')
      }

      return await response.json()
    },
    onSuccess: (_, roleId) => {
      // Invalidate lists and specific role
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
    },
  })
}

// =====================================================
// HOOKS: Role Permissions
// =====================================================

/**
 * Assign permissions to role
 */
export function useAssignRolePermissions(roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles/${roleId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role_id: roleId,
            permission_ids: permissionIds,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign permissions')
      }

      return await response.json()
    },
    onSuccess: () => {
      // Invalidate role detail (includes permissions)
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
    },
  })
}

/**
 * Get users with specific role
 */
export function useRoleUsers(roleId: string) {
  return useQuery({
    queryKey: roleKeys.users(roleId),
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles/${roleId}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch role users')
      }

      const data = await response.json()
      return data.user_roles
    },
    enabled: !!roleId,
  })
}

// =====================================================
// HOOKS: Convenience
// =====================================================

/**
 * Get custom (tenant-defined) roles only
 */
export function useCustomRoles(tenantId: string) {
  return useQuery({
    queryKey: [...roleKeys.lists(), tenantId, 'custom'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role_type', 'custom')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true })

      if (error) throw error
      return data as Role[]
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}

/**
 * Get default role for tenant
 */
export function useDefaultRole(tenantId: string) {
  return useQuery({
    queryKey: [...roleKeys.all, 'default', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data as Role
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!tenantId,
  })
}
