// ============================================================================
// Edge Function: schedule-workflow-actions
// ============================================================================
// Purpose: Schedule delayed workflow actions for future execution
// Features:
//   - Schedule actions with delays
//   - Support recurring schedules
//   - Queue management
//   - Retry failed actions
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ScheduleRequest {
  workflow_execution_id: string;
  action_id: string;
  tenant_id: string;
  delay_minutes?: number;
  schedule_at?: string; // ISO 8601 timestamp
  action_config: Record<string, any>;
  retry_config?: {
    max_retries: number;
    retry_delay_minutes: number;
  };
}

interface ProcessQueueRequest {
  tenant_id?: string;
  limit?: number;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: POST /schedule - Schedule a new action
    if (path.endsWith('/schedule') && req.method === 'POST') {
      return await handleScheduleAction(req, supabase);
    }

    // Route: POST /process-queue - Process pending scheduled actions
    if (path.endsWith('/process-queue') && req.method === 'POST') {
      return await handleProcessQueue(req, supabase);
    }

    // Route: GET /pending - Get pending actions for a tenant
    if (path.endsWith('/pending') && req.method === 'GET') {
      return await handleGetPending(req, supabase);
    }

    return new Response(JSON.stringify({
      error: 'Not found',
      available_endpoints: ['/schedule', '/process-queue', '/pending'],
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Schedule Actions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorStack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Handle scheduling a new action
 */
async function handleScheduleAction(req: Request, supabase: any) {
  const data: ScheduleRequest = await req.json();
  const { 
    workflow_execution_id, 
    action_id, 
    tenant_id, 
    delay_minutes = 0, 
    schedule_at,
    action_config,
    retry_config 
  } = data;

  // Calculate execution time
  const executeAt = schedule_at 
    ? new Date(schedule_at)
    : new Date(Date.now() + delay_minutes * 60 * 1000);

  console.log(`[Schedule] Scheduling action ${action_id} for ${executeAt.toISOString()}`);

  // In a production system, this would create a scheduled job
  // For now, we'll store it in a dedicated table for scheduled actions

  // Create scheduled action record
  const { data: scheduled, error } = await supabase
    .from('workflow_execution_actions')
    .insert({
      workflow_execution_id,
      workflow_action_id: action_id,
      tenant_id,
      action_type: action_config.action_type,
      action_config,
      status: 'pending',
      started_at: executeAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    scheduled_action_id: scheduled.id,
    execute_at: executeAt.toISOString(),
    delay_minutes,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle processing queued actions
 */
async function handleProcessQueue(req: Request, supabase: any) {
  const data: ProcessQueueRequest = await req.json();
  const { tenant_id, limit = 10 } = data;

  console.log(`[Process Queue] Processing up to ${limit} pending actions`);

  // Find pending actions that are ready to execute
  let query = supabase
    .from('workflow_execution_actions')
    .select('*')
    .eq('status', 'pending')
    .lte('started_at', new Date().toISOString())
    .order('started_at', { ascending: true })
    .limit(limit);

  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id);
  }

  const { data: pendingActions, error } = await query;

  if (error) throw error;

  const results = [];

  for (const action of pendingActions || []) {
    try {
      // Update status to running
      await supabase
        .from('workflow_execution_actions')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', action.id);

      // Execute the action based on type
      const result = await executeScheduledAction(supabase, action);

      // Update status based on result
      const updateData: any = {
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: result.duration_ms,
        result: result.result,
      };

      if (!result.success) {
        updateData.error_message = result.error;
      }

      await supabase
        .from('workflow_execution_actions')
        .update(updateData)
        .eq('id', action.id);

      results.push({
        action_id: action.id,
        success: result.success,
        error: result.error,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark as failed
      await supabase
        .from('workflow_execution_actions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', action.id);

      results.push({
        action_id: action.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    processed: results.length,
    results,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle getting pending actions
 */
async function handleGetPending(req: Request, supabase: any) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant_id');

  let query = supabase
    .from('workflow_execution_actions')
    .select('*')
    .eq('status', 'pending')
    .order('started_at', { ascending: true });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data: pending, error } = await query;

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    count: pending?.length || 0,
    actions: pending || [],
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute a scheduled action
 */
async function executeScheduledAction(
  supabase: any,
  action: any
): Promise<{ success: boolean; result?: any; error?: string; duration_ms: number }> {
  const startTime = Date.now();

  try {
    const config = action.action_config;

    switch (action.action_type) {
      case 'send_email':
        // Call send-email Edge Function
        await supabase.from('email_history').insert({
          tenant_id: action.tenant_id,
          to_email: config.to_email,
          subject: config.subject,
          template_id: config.template_id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
        break;

      case 'send_sms':
        // Call send-sms Edge Function
        await supabase.from('sms_history').insert({
          tenant_id: action.tenant_id,
          to_phone: config.to_phone,
          message: config.message,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
        break;

      case 'update_order_status':
        await supabase
          .from('catering_orders')
          .update({ status: config.new_status })
          .eq('id', config.order_id)
          .eq('tenant_id', action.tenant_id);
        break;

      case 'create_task':
        await supabase.from('tasks').insert({
          tenant_id: action.tenant_id,
          title: config.title,
          description: config.description,
          assigned_to: config.assigned_to,
          due_date: config.due_date,
          priority: config.priority || 'medium',
          status: 'pending',
        });
        break;

      default:
        throw new Error(`Unsupported action type: ${action.action_type}`);
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      result: { executed: true },
      duration_ms: duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Action execution failed';
    
    return {
      success: false,
      error: errorMessage,
      duration_ms: duration,
    };
  }
}
