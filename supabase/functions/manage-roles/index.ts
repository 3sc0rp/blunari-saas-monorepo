// Week 19-20: RBAC - Role Management Edge Function
// Purpose: CRUD operations for roles and role-permission assignments
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RoleCreateInput {
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

interface RoleUpdateInput {
  display_name?: string
  description?: string
  parent_role_id?: string | null
  color?: string
  icon?: string
  is_default?: boolean
  is_active?: boolean
  max_users?: number | null
}

interface AssignPermissionsInput {
  role_id: string
  permission_ids: string[]
  is_granted?: boolean
}

interface DatabaseRole {
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
}

interface RolePermission {
  permission_id: string
  permission_name: string
  is_granted: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const url = new URL(req.url)
    const path = url.pathname

    // Route: GET / - List all roles for tenant
    if (req.method === 'GET' && path === '/manage-roles') {
      const tenantId = url.searchParams.get('tenant_id')
      if (!tenantId) {
        throw new Error('tenant_id is required')
      }

      const includeSystem = url.searchParams.get('include_system') === 'true'

      let query = supabaseClient
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true })
        .order('name', { ascending: true })

      if (includeSystem) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      } else {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: roles, error: rolesError } = await query

      if (rolesError) throw rolesError

      return new Response(JSON.stringify({ success: true, roles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route: GET /:id - Get single role with permissions
    if (req.method === 'GET' && path.match(/^\/manage-roles\/.+$/)) {
      const roleId = path.split('/').pop()

      // Get role details
      const { data: role, error: roleError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError
      if (!role) throw new Error('Role not found')

      // Get role permissions using RPC
      const { data: permissions, error: permissionsError } = await supabaseClient
        .rpc('get_role_all_permissions', { p_role_id: roleId })

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError)
      }

      // Get user count
      const { count: userCount, error: countError } = await supabaseClient
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)
        .eq('is_active', true)

      if (countError) {
        console.error('Error counting users:', countError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          role: {
            ...role,
            permissions: permissions || [],
            user_count: userCount || 0,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST / - Create new role
    if (req.method === 'POST' && path === '/manage-roles') {
      const body: RoleCreateInput = await req.json()

      // Validate required fields
      if (!body.tenant_id || !body.name || !body.display_name) {
        throw new Error('tenant_id, name, and display_name are required')
      }

      // Check if user has permission to create roles
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: body.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to create roles')
      }

      // Check for circular hierarchy if parent_role_id is provided
      if (body.parent_role_id) {
        const { data: isCircular, error: circularError } = await supabaseClient
          .rpc('check_role_hierarchy_circular', {
            p_role_id: body.parent_role_id, // Temporary - will be replaced with actual role_id after insert
            p_parent_role_id: body.parent_role_id,
          })

        if (circularError) throw circularError
      }

      // Calculate hierarchy level
      let hierarchyLevel = 0
      if (body.parent_role_id) {
        const { data: parentRole, error: parentError } = await supabaseClient
          .from('roles')
          .select('hierarchy_level')
          .eq('id', body.parent_role_id)
          .single()

        if (parentError) throw new Error('Parent role not found')
        hierarchyLevel = parentRole.hierarchy_level + 1
      }

      // Create role
      const { data: newRole, error: createError } = await supabaseClient
        .from('roles')
        .insert({
          tenant_id: body.tenant_id,
          name: body.name,
          display_name: body.display_name,
          description: body.description,
          role_type: 'custom',
          parent_role_id: body.parent_role_id,
          hierarchy_level: hierarchyLevel,
          is_default: body.is_default || false,
          color: body.color,
          icon: body.icon,
          max_users: body.max_users,
          created_by: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      return new Response(
        JSON.stringify({ success: true, role: newRole }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: PATCH /:id - Update role
    if (req.method === 'PATCH' && path.match(/^\/manage-roles\/.+$/)) {
      const roleId = path.split('/').pop()
      const body: RoleUpdateInput = await req.json()

      // Get existing role
      const { data: existingRole, error: fetchError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (fetchError) throw fetchError
      if (!existingRole) throw new Error('Role not found')

      // Prevent updating system roles
      if (existingRole.role_type === 'system') {
        throw new Error('Cannot update system roles')
      }

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: existingRole.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to update roles')
      }

      // Check for circular hierarchy if parent_role_id is being changed
      if (body.parent_role_id !== undefined) {
        if (body.parent_role_id === roleId) {
          throw new Error('Role cannot be its own parent')
        }

        if (body.parent_role_id) {
          const { data: isCircular, error: circularError } = await supabaseClient
            .rpc('check_role_hierarchy_circular', {
              p_role_id: roleId,
              p_parent_role_id: body.parent_role_id,
            })

          if (circularError) throw circularError
          if (isCircular) {
            throw new Error('Circular role hierarchy detected')
          }
        }
      }

      // Calculate new hierarchy level if parent changed
      let newHierarchyLevel = existingRole.hierarchy_level
      if (body.parent_role_id !== undefined) {
        if (body.parent_role_id === null) {
          newHierarchyLevel = 0
        } else {
          const { data: parentRole, error: parentError } = await supabaseClient
            .from('roles')
            .select('hierarchy_level')
            .eq('id', body.parent_role_id)
            .single()

          if (parentError) throw new Error('Parent role not found')
          newHierarchyLevel = parentRole.hierarchy_level + 1
        }
      }

      // Update role
      const updateData: any = {
        ...body,
        hierarchy_level: newHierarchyLevel,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedRole, error: updateError } = await supabaseClient
        .from('roles')
        .update(updateData)
        .eq('id', roleId)
        .select()
        .single()

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ success: true, role: updatedRole }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: DELETE /:id - Delete role
    if (req.method === 'DELETE' && path.match(/^\/manage-roles\/.+$/)) {
      const roleId = path.split('/').pop()

      // Get role
      const { data: role, error: fetchError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (fetchError) throw fetchError
      if (!role) throw new Error('Role not found')

      // Prevent deleting system roles
      if (role.role_type === 'system') {
        throw new Error('Cannot delete system roles')
      }

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: role.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to delete roles')
      }

      // Check if role has users assigned
      const { count: userCount, error: countError } = await supabaseClient
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)
        .eq('is_active', true)

      if (countError) throw countError

      if (userCount && userCount > 0) {
        throw new Error(`Cannot delete role with ${userCount} active user(s)`)
      }

      // Soft delete (set is_active = false)
      const { error: deleteError } = await supabaseClient
        .from('roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', roleId)

      if (deleteError) throw deleteError

      return new Response(
        JSON.stringify({ success: true, message: 'Role deleted successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /:id/permissions - Assign permissions to role
    if (req.method === 'POST' && path.match(/^\/manage-roles\/.+\/permissions$/)) {
      const roleId = path.split('/')[2]
      const body: AssignPermissionsInput = await req.json()

      if (!body.permission_ids || body.permission_ids.length === 0) {
        throw new Error('permission_ids array is required')
      }

      // Get role
      const { data: role, error: roleError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError
      if (!role) throw new Error('Role not found')

      // Prevent modifying system role permissions
      if (role.role_type === 'system') {
        throw new Error('Cannot modify system role permissions')
      }

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: role.tenant_id,
          p_resource_type: 'permissions',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to manage role permissions')
      }

      // Validate permissions exist
      const { data: permissions, error: permissionsError } = await supabaseClient
        .from('permissions')
        .select('id')
        .in('id', body.permission_ids)
        .eq('is_active', true)

      if (permissionsError) throw permissionsError

      if (permissions.length !== body.permission_ids.length) {
        throw new Error('One or more invalid permission IDs')
      }

      // Delete existing role permissions
      const { error: deleteError } = await supabaseClient
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deleteError) throw deleteError

      // Insert new role permissions
      const rolePermissions = body.permission_ids.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
        is_granted: body.is_granted !== false, // Default to true
        granted_by: user.id,
      }))

      const { data: inserted, error: insertError } = await supabaseClient
        .from('role_permissions')
        .insert(rolePermissions)
        .select()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({
          success: true,
          message: `${inserted.length} permissions assigned to role`,
          permissions: inserted,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /:id/users - Get users with this role
    if (req.method === 'GET' && path.match(/^\/manage-roles\/.+\/users$/)) {
      const roleId = path.split('/')[2]

      const { data: userRoles, error: userRolesError } = await supabaseClient
        .from('user_roles')
        .select(`
          id,
          user_id,
          scope_type,
          scope_id,
          is_active,
          valid_from,
          valid_until,
          assigned_at
        `)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (userRolesError) throw userRolesError

      return new Response(
        JSON.stringify({ success: true, user_roles: userRoles }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route not found
    throw new Error(`Route not found: ${req.method} ${path}`)
  } catch (error) {
    console.error('Error in manage-roles function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
