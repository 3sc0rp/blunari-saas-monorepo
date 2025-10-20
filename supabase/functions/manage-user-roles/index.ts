// Week 19-20: RBAC - User Role Management Edge Function
// Purpose: Assign and revoke roles to/from users
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignRoleInput {
  tenant_id: string
  user_id: string
  role_id: string
  scope_type?: string
  scope_id?: string
  valid_from?: string
  valid_until?: string
  notes?: string
}

interface RevokeRoleInput {
  user_role_id: string
}

interface BulkAssignInput {
  tenant_id: string
  user_ids: string[]
  role_id: string
  scope_type?: string
  scope_id?: string
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

    // Route: GET / - Get user roles
    if (req.method === 'GET' && path === '/manage-user-roles') {
      const userId = url.searchParams.get('user_id')
      const tenantId = url.searchParams.get('tenant_id')

      if (!userId || !tenantId) {
        throw new Error('user_id and tenant_id are required')
      }

      // Use RPC function to get roles with details
      const { data: roles, error: rolesError } = await supabaseClient
        .rpc('get_user_roles', {
          p_user_id: userId,
          p_tenant_id: tenantId,
        })

      if (rolesError) throw rolesError

      return new Response(
        JSON.stringify({ success: true, roles: roles || [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /assign - Assign role to user
    if (req.method === 'POST' && path === '/manage-user-roles/assign') {
      const body: AssignRoleInput = await req.json()

      // Validate required fields
      if (!body.tenant_id || !body.user_id || !body.role_id) {
        throw new Error('tenant_id, user_id, and role_id are required')
      }

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: body.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to assign roles')
      }

      // Validate role exists and is active
      const { data: role, error: roleError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', body.role_id)
        .eq('is_active', true)
        .single()

      if (roleError || !role) {
        throw new Error('Role not found or inactive')
      }

      // Check tenant match (unless system role)
      if (role.tenant_id !== null && role.tenant_id !== body.tenant_id) {
        throw new Error('Role does not belong to specified tenant')
      }

      // Check max_users limit
      if (role.max_users !== null) {
        const { count: currentUserCount, error: countError } = await supabaseClient
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', body.role_id)
          .eq('is_active', true)

        if (countError) throw countError

        if (currentUserCount && currentUserCount >= role.max_users) {
          throw new Error(`Role has reached maximum user limit (${role.max_users})`)
        }
      }

      // Check if user already has this role with same scope
      const { data: existingAssignment, error: existingError } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('tenant_id', body.tenant_id)
        .eq('user_id', body.user_id)
        .eq('role_id', body.role_id)
        .eq('scope_type', body.scope_type || '')
        .eq('scope_id', body.scope_id || '')
        .eq('is_active', true)
        .maybeSingle()

      if (existingError) throw existingError

      if (existingAssignment) {
        throw new Error('User already has this role assignment')
      }

      // Assign role
      const { data: userRole, error: assignError } = await supabaseClient
        .from('user_roles')
        .insert({
          tenant_id: body.tenant_id,
          user_id: body.user_id,
          role_id: body.role_id,
          scope_type: body.scope_type,
          scope_id: body.scope_id,
          valid_from: body.valid_from || new Date().toISOString(),
          valid_until: body.valid_until,
          notes: body.notes,
          assigned_by: user.id,
        })
        .select()
        .single()

      if (assignError) throw assignError

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Role assigned successfully',
          user_role: userRole,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /revoke - Revoke role from user
    if (req.method === 'POST' && path === '/manage-user-roles/revoke') {
      const body: RevokeRoleInput = await req.json()

      if (!body.user_role_id) {
        throw new Error('user_role_id is required')
      }

      // Get user role assignment
      const { data: userRole, error: fetchError } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('id', body.user_role_id)
        .single()

      if (fetchError) throw fetchError
      if (!userRole) throw new Error('User role assignment not found')

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: userRole.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to revoke roles')
      }

      // Soft delete (set is_active = false)
      const { error: revokeError } = await supabaseClient
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.user_role_id)

      if (revokeError) throw revokeError

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Role revoked successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /bulk-assign - Assign role to multiple users
    if (req.method === 'POST' && path === '/manage-user-roles/bulk-assign') {
      const body: BulkAssignInput = await req.json()

      if (!body.tenant_id || !body.role_id || !body.user_ids || body.user_ids.length === 0) {
        throw new Error('tenant_id, role_id, and user_ids array are required')
      }

      // Check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('check_resource_permission', {
          p_user_id: user.id,
          p_tenant_id: body.tenant_id,
          p_resource_type: 'roles',
          p_action: 'manage',
        })

      if (permError || !hasPermission) {
        throw new Error('Insufficient permissions to assign roles')
      }

      // Validate role
      const { data: role, error: roleError } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', body.role_id)
        .eq('is_active', true)
        .single()

      if (roleError || !role) {
        throw new Error('Role not found or inactive')
      }

      // Check max_users limit
      if (role.max_users !== null) {
        const { count: currentUserCount, error: countError } = await supabaseClient
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', body.role_id)
          .eq('is_active', true)

        if (countError) throw countError

        const availableSlots = role.max_users - (currentUserCount || 0)
        if (body.user_ids.length > availableSlots) {
          throw new Error(
            `Cannot assign role to ${body.user_ids.length} users. Only ${availableSlots} slot(s) available`
          )
        }
      }

      // Prepare bulk insert data
      const userRoles = body.user_ids.map((userId) => ({
        tenant_id: body.tenant_id,
        user_id: userId,
        role_id: body.role_id,
        scope_type: body.scope_type,
        scope_id: body.scope_id,
        assigned_by: user.id,
      }))

      // Bulk insert (will fail for duplicates due to unique constraint)
      const { data: inserted, error: insertError } = await supabaseClient
        .from('user_roles')
        .insert(userRoles)
        .select()

      if (insertError) {
        // Provide more helpful error for duplicates
        if (insertError.code === '23505') {
          throw new Error('One or more users already have this role assignment')
        }
        throw insertError
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Role assigned to ${inserted.length} user(s)`,
          user_roles: inserted,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /permissions - Get user's effective permissions
    if (req.method === 'GET' && path === '/manage-user-roles/permissions') {
      const userId = url.searchParams.get('user_id')
      const tenantId = url.searchParams.get('tenant_id')

      if (!userId || !tenantId) {
        throw new Error('user_id and tenant_id are required')
      }

      // Use RPC function to get permissions
      const { data: permissions, error: permissionsError } = await supabaseClient
        .rpc('get_user_permissions', {
          p_user_id: userId,
          p_tenant_id: tenantId,
        })

      if (permissionsError) throw permissionsError

      // Group permissions by resource
      const groupedPermissions: Record<string, any[]> = {}
      permissions?.forEach((permission: any) => {
        if (!groupedPermissions[permission.resource]) {
          groupedPermissions[permission.resource] = []
        }
        groupedPermissions[permission.resource].push(permission)
      })

      return new Response(
        JSON.stringify({
          success: true,
          permissions: permissions || [],
          grouped_permissions: groupedPermissions,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /check-permission - Check if user has specific permission
    if (req.method === 'POST' && path === '/manage-user-roles/check-permission') {
      const body = await req.json()

      if (!body.user_id || !body.tenant_id || !body.permission_name) {
        throw new Error('user_id, tenant_id, and permission_name are required')
      }

      // Use RPC function to check permission
      const { data: hasPermission, error: permError } = await supabaseClient
        .rpc('has_permission', {
          p_user_id: body.user_id,
          p_tenant_id: body.tenant_id,
          p_permission_name: body.permission_name,
          p_resource_id: body.resource_id,
          p_context: body.context || {},
        })

      if (permError) throw permError

      return new Response(
        JSON.stringify({
          success: true,
          has_permission: hasPermission,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /audit - Get permission audit log for user
    if (req.method === 'GET' && path === '/manage-user-roles/audit') {
      const userId = url.searchParams.get('user_id')
      const tenantId = url.searchParams.get('tenant_id')
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      if (!userId || !tenantId) {
        throw new Error('user_id and tenant_id are required')
      }

      const { data: auditLog, error: auditError } = await supabaseClient
        .from('permission_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .order('checked_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (auditError) throw auditError

      return new Response(
        JSON.stringify({
          success: true,
          audit_log: auditLog || [],
          limit,
          offset,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route not found
    throw new Error(`Route not found: ${req.method} ${path}`)
  } catch (error) {
    console.error('Error in manage-user-roles function:', error)
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
