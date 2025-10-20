// Week 21-22: Audit Logging - Query Audit Logs Edge Function
// Purpose: Query audit logs with filters, aggregations, and export
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface QueryRequest {
  // Filters
  user_id?: string
  resource_type?: string
  resource_id?: string
  action?: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  status?: 'success' | 'failure' | 'pending'
  start_date?: string // ISO 8601 format
  end_date?: string // ISO 8601 format
  tags?: string[]
  
  // Pagination
  limit?: number
  offset?: number
  
  // Options
  export_format?: 'json' | 'csv'
  include_stats?: boolean
}

interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  changed_fields: string[] | null
  ip_address: string | null
  user_agent: string | null
  severity: string | null
  status: string | null
  error_message: string | null
  metadata: Record<string, any> | null
  tags: string[] | null
  created_at: string
}

interface QueryResponse {
  success: boolean
  logs: AuditLog[]
  total_count?: number
  stats?: AuditStats
  error?: string
}

interface AuditStats {
  total_activities: number
  unique_users: number
  actions_by_type: Record<string, number>
  activities_by_resource: Record<string, number>
  severity_breakdown: Record<string, number>
  status_breakdown: Record<string, number>
  daily_activity: Record<string, number>
  top_users: Array<{ user_id: string; count: number }>
  failed_actions: number
  critical_events: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Get user from JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant ID from auto_provisioning
    const { data: provisioning, error: provError } = await supabase
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (provError || !provisioning) {
      return new Response(
        JSON.stringify({ success: false, error: 'No tenant access found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = provisioning.tenant_id

    // Parse request (GET or POST)
    let queryParams: QueryRequest
    
    if (req.method === 'GET') {
      const url = new URL(req.url)
      queryParams = {
        user_id: url.searchParams.get('user_id') || undefined,
        resource_type: url.searchParams.get('resource_type') || undefined,
        resource_id: url.searchParams.get('resource_id') || undefined,
        action: url.searchParams.get('action') || undefined,
        severity: (url.searchParams.get('severity') as any) || undefined,
        status: (url.searchParams.get('status') as any) || undefined,
        start_date: url.searchParams.get('start_date') || undefined,
        end_date: url.searchParams.get('end_date') || undefined,
        tags: url.searchParams.get('tags')?.split(',') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '100'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
        export_format: (url.searchParams.get('export_format') as any) || undefined,
        include_stats: url.searchParams.get('include_stats') === 'true',
      }
    } else if (req.method === 'POST') {
      queryParams = await req.json()
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate and sanitize pagination
    const limit = Math.min(queryParams.limit || 100, 1000) // Max 1000
    const offset = queryParams.offset || 0

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)

    // Apply filters
    if (queryParams.user_id) {
      query = query.eq('user_id', queryParams.user_id)
    }
    if (queryParams.resource_type) {
      query = query.eq('resource_type', queryParams.resource_type)
    }
    if (queryParams.resource_id) {
      query = query.eq('resource_id', queryParams.resource_id)
    }
    if (queryParams.action) {
      query = query.eq('action', queryParams.action)
    }
    if (queryParams.severity) {
      query = query.eq('severity', queryParams.severity)
    }
    if (queryParams.status) {
      query = query.eq('status', queryParams.status)
    }
    if (queryParams.start_date) {
      query = query.gte('created_at', queryParams.start_date)
    }
    if (queryParams.end_date) {
      query = query.lte('created_at', queryParams.end_date)
    }
    if (queryParams.tags && queryParams.tags.length > 0) {
      query = query.overlaps('tags', queryParams.tags)
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Execute query
    const { data: logs, error: queryError, count } = await query

    if (queryError) {
      console.error('Error querying audit logs:', queryError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to query audit logs',
          details: queryError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get statistics if requested
    let stats: AuditStats | undefined
    if (queryParams.include_stats) {
      const { data: statsData, error: statsError } = await supabase.rpc('get_audit_stats', {
        p_tenant_id: tenantId,
        p_start_date: queryParams.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: queryParams.end_date || new Date().toISOString(),
      })

      if (!statsError && statsData && statsData.length > 0) {
        const stat = statsData[0]
        stats = {
          total_activities: parseInt(stat.total_activities),
          unique_users: parseInt(stat.unique_users),
          actions_by_type: stat.actions_by_type || {},
          activities_by_resource: stat.activities_by_resource || {},
          severity_breakdown: stat.severity_breakdown || {},
          status_breakdown: stat.status_breakdown || {},
          daily_activity: stat.daily_activity || {},
          top_users: stat.top_users || [],
          failed_actions: parseInt(stat.failed_actions),
          critical_events: parseInt(stat.critical_events),
        }
      }
    }

    // Export format handling
    if (queryParams.export_format === 'csv') {
      // Convert logs to CSV
      const csvRows: string[] = []
      
      // Header
      csvRows.push([
        'ID',
        'Created At',
        'User ID',
        'Action',
        'Resource Type',
        'Resource ID',
        'Severity',
        'Status',
        'IP Address',
        'Changed Fields',
        'Tags',
        'Error Message',
      ].join(','))

      // Data rows
      for (const log of logs || []) {
        csvRows.push([
          log.id,
          log.created_at,
          log.user_id || '',
          log.action,
          log.resource_type,
          log.resource_id || '',
          log.severity || '',
          log.status || '',
          log.ip_address || '',
          log.changed_fields?.join(';') || '',
          log.tags?.join(';') || '',
          log.error_message?.replace(/,/g, ';') || '',
        ].map(field => `"${field}"`).join(','))
      }

      const csv = csvRows.join('\n')
      
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
        },
      })
    }

    // JSON response
    const response: QueryResponse = {
      success: true,
      logs: logs || [],
      total_count: count || 0,
    }

    if (stats) {
      response.stats = stats
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in query-audit-logs function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
