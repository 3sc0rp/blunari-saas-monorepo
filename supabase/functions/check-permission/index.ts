// Week 19-20: RBAC - Permission Check Edge Function
// Purpose: Fast permission validation with caching and audit logging
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PermissionCheckInput {
  user_id?: string // Optional - defaults to authenticated user
  tenant_id: string
  permission_name?: string // e.g., "bookings.create"
  resource_type?: string // Alternative: specify resource + action
  action?: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'import' | 'manage' | 'execute'
  resource_id?: string
  context?: Record<string, any>
}

interface BulkPermissionCheckInput {
  user_id?: string
  tenant_id: string
  permissions: Array<{
    permission_name?: string
    resource_type?: string
    action?: string
    resource_id?: string
    context?: Record<string, any>
  }>
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

    // Route: POST / - Check single permission
    if (req.method === 'POST' && path === '/check-permission') {
      const body: PermissionCheckInput = await req.json()

      if (!body.tenant_id) {
        throw new Error('tenant_id is required')
      }

      const userId = body.user_id || user.id

      // Determine permission name
      let permissionName = body.permission_name
      if (!permissionName && body.resource_type && body.action) {
        permissionName = `${body.resource_type}.${body.action}`
      }

      if (!permissionName) {
        throw new Error('Either permission_name or (resource_type + action) is required')
      }

      // Use RPC function to check permission
      let hasPermission = false

      if (body.resource_type && body.action) {
        // Use resource-level check (includes audit logging)
        const { data, error: permError } = await supabaseClient
          .rpc('check_resource_permission', {
            p_user_id: userId,
            p_tenant_id: body.tenant_id,
            p_resource_type: body.resource_type,
            p_action: body.action,
            p_resource_id: body.resource_id,
            p_context: body.context || {},
          })

        if (permError) throw permError
        hasPermission = data
      } else {
        // Use simple permission check
        const { data, error: permError } = await supabaseClient
          .rpc('has_permission', {
            p_user_id: userId,
            p_tenant_id: body.tenant_id,
            p_permission_name: permissionName,
            p_resource_id: body.resource_id,
            p_context: body.context || {},
          })

        if (permError) throw permError
        hasPermission = data
      }

      return new Response(
        JSON.stringify({
          success: true,
          has_permission: hasPermission,
          user_id: userId,
          permission_name: permissionName,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: POST /bulk - Check multiple permissions
    if (req.method === 'POST' && path === '/check-permission/bulk') {
      const body: BulkPermissionCheckInput = await req.json()

      if (!body.tenant_id || !body.permissions || body.permissions.length === 0) {
        throw new Error('tenant_id and permissions array are required')
      }

      const userId = body.user_id || user.id

      // Check each permission
      const results = await Promise.all(
        body.permissions.map(async (permCheck) => {
          let permissionName = permCheck.permission_name
          if (!permissionName && permCheck.resource_type && permCheck.action) {
            permissionName = `${permCheck.resource_type}.${permCheck.action}`
          }

          if (!permissionName) {
            return {
              permission_name: 'unknown',
              has_permission: false,
              error: 'Invalid permission specification',
            }
          }

          try {
            let hasPermission = false

            if (permCheck.resource_type && permCheck.action) {
              const { data, error } = await supabaseClient
                .rpc('check_resource_permission', {
                  p_user_id: userId,
                  p_tenant_id: body.tenant_id,
                  p_resource_type: permCheck.resource_type,
                  p_action: permCheck.action,
                  p_resource_id: permCheck.resource_id,
                  p_context: permCheck.context || {},
                })

              if (error) throw error
              hasPermission = data
            } else {
              const { data, error } = await supabaseClient
                .rpc('has_permission', {
                  p_user_id: userId,
                  p_tenant_id: body.tenant_id,
                  p_permission_name: permissionName,
                  p_resource_id: permCheck.resource_id,
                  p_context: permCheck.context || {},
                })

              if (error) throw error
              hasPermission = data
            }

            return {
              permission_name: permissionName,
              has_permission: hasPermission,
            }
          } catch (error) {
            return {
              permission_name: permissionName,
              has_permission: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )

      return new Response(
        JSON.stringify({
          success: true,
          user_id: userId,
          results,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /stats - Get permission statistics for tenant
    if (req.method === 'GET' && path === '/check-permission/stats') {
      const tenantId = url.searchParams.get('tenant_id')
      const days = parseInt(url.searchParams.get('days') || '30')

      if (!tenantId) {
        throw new Error('tenant_id is required')
      }

      // Use RPC function to get stats
      const { data: stats, error: statsError } = await supabaseClient
        .rpc('get_permission_stats', {
          p_tenant_id: tenantId,
          p_days: days,
        })

      if (statsError) throw statsError

      return new Response(
        JSON.stringify({
          success: true,
          stats: stats || [],
          period_days: days,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /audit - Get audit log
    if (req.method === 'GET' && path === '/check-permission/audit') {
      const tenantId = url.searchParams.get('tenant_id')
      const userId = url.searchParams.get('user_id')
      const permissionName = url.searchParams.get('permission_name')
      const isGranted = url.searchParams.get('is_granted')
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      if (!tenantId) {
        throw new Error('tenant_id is required')
      }

      let query = supabaseClient
        .from('permission_audit_log')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('checked_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (permissionName) {
        query = query.eq('permission_name', permissionName)
      }

      if (isGranted !== null && isGranted !== undefined) {
        query = query.eq('is_granted', isGranted === 'true')
      }

      const { data: auditLog, error: auditError, count } = await query

      if (auditError) throw auditError

      return new Response(
        JSON.stringify({
          success: true,
          audit_log: auditLog || [],
          total_count: count || 0,
          limit,
          offset,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route: GET /permissions - Get all permissions for tenant
    if (req.method === 'GET' && path === '/check-permission/permissions') {
      const tenantId = url.searchParams.get('tenant_id')
      const resourceType = url.searchParams.get('resource_type')
      const includeInactive = url.searchParams.get('include_inactive') === 'true'

      if (!tenantId) {
        throw new Error('tenant_id is required')
      }

      let query = supabaseClient
        .from('permissions')
        .select(`
          *,
          permission_groups(name, icon)
        `)
        .order('resource', { ascending: true })
        .order('action', { ascending: true })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      if (resourceType) {
        query = query.eq('resource', resourceType)
      }

      const { data: permissions, error: permissionsError } = await query

      if (permissionsError) throw permissionsError

      // Group by resource
      const groupedPermissions: Record<string, any[]> = {}
      permissions?.forEach((permission) => {
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

    // Route: GET /resources - Get list of resources with permissions
    if (req.method === 'GET' && path === '/check-permission/resources') {
      const { data: resources, error: resourcesError } = await supabaseClient
        .from('permissions')
        .select('resource')
        .eq('is_active', true)

      if (resourcesError) throw resourcesError

      // Get unique resources
      const uniqueResources = [...new Set(resources?.map((r) => r.resource) || [])]

      return new Response(
        JSON.stringify({
          success: true,
          resources: uniqueResources,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Route not found
    throw new Error(`Route not found: ${req.method} ${path}`)
  } catch (error) {
    console.error('Error in check-permission function:', error)
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
