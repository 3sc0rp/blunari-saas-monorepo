// Week 21-22: Audit Logging - Log Activity Edge Function
// Purpose: Manual activity logging API with batch support
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface LogActivityRequest {
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  status?: 'success' | 'failure' | 'pending'
  error_message?: string
  metadata?: Record<string, any>
  tags?: string[]
}

interface BatchLogRequest {
  logs: LogActivityRequest[]
}

interface LogActivityResponse {
  success: boolean
  audit_id?: string
  audit_ids?: string[]
  message?: string
  error?: string
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

    // Extract request context
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

    // Parse request body
    const body = await req.json()

    // Check if batch request
    const isBatch = 'logs' in body
    
    if (isBatch) {
      // Batch logging
      const batchRequest = body as BatchLogRequest
      
      if (!Array.isArray(batchRequest.logs) || batchRequest.logs.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Logs array is required and must not be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (batchRequest.logs.length > 100) {
        return new Response(
          JSON.stringify({ success: false, error: 'Maximum 100 logs per batch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate each log entry
      for (const log of batchRequest.logs) {
        if (!log.action || !log.resource_type) {
          return new Response(
            JSON.stringify({ success: false, error: 'Each log must have action and resource_type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Insert batch logs
      const auditIds: string[] = []
      
      for (const log of batchRequest.logs) {
        // Calculate changed fields if both old and new values provided
        let changedFields: string[] | null = null
        if (log.old_values && log.new_values) {
          changedFields = Object.keys(log.new_values).filter(
            (key) => JSON.stringify(log.old_values![key]) !== JSON.stringify(log.new_values![key])
          )
        }

        const { data: auditLog, error: insertError } = await supabase
          .from('audit_logs')
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            action: log.action,
            resource_type: log.resource_type,
            resource_id: log.resource_id || null,
            old_values: log.old_values || null,
            new_values: log.new_values || null,
            changed_fields: changedFields,
            ip_address: ipAddress,
            user_agent: userAgent,
            request_id: requestId,
            severity: log.severity || 'info',
            status: log.status || 'success',
            error_message: log.error_message || null,
            metadata: log.metadata || null,
            tags: log.tags || null,
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting audit log:', insertError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to insert audit log',
              details: insertError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        auditIds.push(auditLog.id)
      }

      return new Response(
        JSON.stringify({
          success: true,
          audit_ids: auditIds,
          message: `Successfully logged ${auditIds.length} activities`,
        } as LogActivityResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Single log request
      const logRequest = body as LogActivityRequest

      // Validate required fields
      if (!logRequest.action || !logRequest.resource_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'action and resource_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate changed fields if both old and new values provided
      let changedFields: string[] | null = null
      if (logRequest.old_values && logRequest.new_values) {
        changedFields = Object.keys(logRequest.new_values).filter(
          (key) => JSON.stringify(logRequest.old_values![key]) !== JSON.stringify(logRequest.new_values![key])
        )
      }

      // Insert audit log
      const { data: auditLog, error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          action: logRequest.action,
          resource_type: logRequest.resource_type,
          resource_id: logRequest.resource_id || null,
          old_values: logRequest.old_values || null,
          new_values: logRequest.new_values || null,
          changed_fields: changedFields,
          ip_address: ipAddress,
          user_agent: userAgent,
          request_id: requestId,
          severity: logRequest.severity || 'info',
          status: logRequest.status || 'success',
          error_message: logRequest.error_message || null,
          metadata: logRequest.metadata || null,
          tags: logRequest.tags || null,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error inserting audit log:', insertError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to insert audit log',
            details: insertError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          audit_id: auditLog.id,
          message: 'Activity logged successfully',
        } as LogActivityResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in log-activity function:', error)
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
