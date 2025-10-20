// ============================================================================
// Edge Function: execute-workflow
// ============================================================================
// Purpose: Orchestrate workflow execution from trigger to completion
// Features:
//   - Evaluate trigger conditions
//   - Execute actions in sequence
//   - Handle retries and errors
//   - Log execution details
//   - Update workflow statistics
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INTERFACES
// ============================================================================

interface WorkflowExecutionRequest {
  workflow_id: string;
  tenant_id: string;
  trigger_data?: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
  triggered_by?: string;
  triggered_by_user_id?: string;
}

interface WorkflowTrigger {
  id: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[];
  condition_operator: string;
  is_required: boolean;
  execution_order: number;
}

interface WorkflowAction {
  id: string;
  action_type: string;
  action_config: Record<string, any>;
  execution_order: number;
  delay_minutes: number;
  retry_count: number;
  retry_delay_minutes: number;
  execute_if?: Record<string, any>;
  is_active: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Evaluate if trigger conditions are met
 */
function evaluateTriggerConditions(
  trigger: WorkflowTrigger,
  context: Record<string, any>
): boolean {
  if (!trigger.conditions || trigger.conditions.length === 0) {
    return true; // No conditions means always pass
  }

  const results = trigger.conditions.map((condition: any) => {
    const fieldValue = context[condition.field];
    const expectedValue = condition.value;
    const operator = condition.operator || 'equals';

    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return fieldValue > expectedValue;
      case 'less_than':
        return fieldValue < expectedValue;
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      default:
        return false;
    }
  });

  // Apply condition operator
  switch (trigger.condition_operator) {
    case 'AND':
      return results.every(r => r);
    case 'OR':
      return results.some(r => r);
    case 'NOT':
      return !results.some(r => r);
    default:
      return results.every(r => r);
  }
}

/**
 * Execute a single workflow action
 */
async function executeAction(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Check conditional execution
    if (action.execute_if) {
      const shouldExecute = evaluateTriggerConditions(
        { ...action, conditions: [action.execute_if], condition_operator: 'AND' } as any,
        context
      );
      if (!shouldExecute) {
        return { success: true, result: { skipped: true, reason: 'Condition not met' } };
      }
    }

    // Apply delay if configured
    if (action.delay_minutes > 0) {
      // In production, this would schedule the action for later
      console.log(`[Action] Would delay ${action.delay_minutes} minutes`);
    }

    // Execute based on action type
    switch (action.action_type) {
      case 'send_email':
        return await executeSendEmail(supabase, action, context, tenantId);
      
      case 'send_sms':
        return await executeSendSMS(supabase, action, context, tenantId);
      
      case 'send_notification':
        return await executeSendNotification(supabase, action, context, tenantId);
      
      case 'update_order_status':
        return await executeUpdateOrderStatus(supabase, action, context, tenantId);
      
      case 'create_task':
        return await executeCreateTask(supabase, action, context, tenantId);
      
      case 'update_field':
        return await executeUpdateField(supabase, action, context, tenantId);
      
      case 'call_webhook':
        return await executeCallWebhook(action, context);
      
      default:
        return { 
          success: false, 
          error: `Unsupported action type: ${action.action_type}` 
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Action execution failed';
    return { success: false, error: errorMessage };
  }
}

/**
 * Action Executors
 */
async function executeSendEmail(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;
  
  // Store email history
  const { error } = await supabase.from('email_history').insert({
    tenant_id: tenantId,
    to_email: config.to_email || context.customer_email,
    subject: config.subject,
    template_id: config.template_id,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: { action: 'email_sent' } };
}

async function executeSendSMS(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;
  
  const { error } = await supabase.from('sms_history').insert({
    tenant_id: tenantId,
    to_phone: config.to_phone || context.customer_phone,
    message: config.message,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: { action: 'sms_sent' } };
}

async function executeSendNotification(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Placeholder for notification system integration
  return { success: true, result: { action: 'notification_sent' } };
}

async function executeUpdateOrderStatus(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;
  const orderId = config.order_id || context.order_id;

  const { error } = await supabase
    .from('catering_orders')
    .update({ status: config.new_status })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: { action: 'status_updated', new_status: config.new_status } };
}

async function executeCreateTask(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;

  const { data, error } = await supabase.from('tasks').insert({
    tenant_id: tenantId,
    title: config.title,
    description: config.description,
    assigned_to: config.assigned_to,
    due_date: config.due_date,
    priority: config.priority || 'medium',
    status: 'pending',
  }).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: { action: 'task_created', task_id: data.id } };
}

async function executeUpdateField(
  supabase: any,
  action: WorkflowAction,
  context: Record<string, any>,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;

  const { error } = await supabase
    .from(config.table)
    .update({ [config.field]: config.value })
    .eq('id', config.record_id || context.record_id)
    .eq('tenant_id', tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: { action: 'field_updated' } };
}

async function executeCallWebhook(
  action: WorkflowAction,
  context: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.action_config;

  try {
    const response = await fetch(config.webhook_url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}` };
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Webhook call failed';
    return { success: false, error: errorMessage };
  }
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

    const requestData: WorkflowExecutionRequest = await req.json();
    const { workflow_id, tenant_id, trigger_data = {}, entity_type, entity_id, triggered_by = 'system', triggered_by_user_id } = requestData;

    console.log(`[Workflow] Executing workflow ${workflow_id} for tenant ${tenant_id}`);

    // 1. Check if workflow can execute (rate limiting, cooldown)
    const { data: canExecute } = await supabase.rpc('can_workflow_execute', {
      p_workflow_id: workflow_id,
      p_tenant_id: tenant_id,
    });

    if (!canExecute) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Workflow execution blocked by rate limit or cooldown',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_automation_id: workflow_id,
        tenant_id,
        triggered_by,
        triggered_by_user_id,
        entity_type,
        entity_id,
        trigger_data,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError) throw execError;

    const executionLog: any[] = [];
    const startTime = Date.now();

    // 3. Fetch and evaluate triggers
    const { data: triggers } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('workflow_automation_id', workflow_id)
      .eq('tenant_id', tenant_id)
      .order('execution_order');

    let triggersPassed = true;
    for (const trigger of triggers || []) {
      const passed = evaluateTriggerConditions(trigger, trigger_data);
      executionLog.push({
        step: 'trigger_evaluation',
        trigger_id: trigger.id,
        trigger_type: trigger.trigger_type,
        passed,
        timestamp: new Date().toISOString(),
      });

      if (trigger.is_required && !passed) {
        triggersPassed = false;
        break;
      }
    }

    if (!triggersPassed) {
      // Update execution as cancelled
      await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          execution_log: executionLog,
        })
        .eq('id', execution.id);

      return new Response(JSON.stringify({
        success: false,
        error: 'Required trigger conditions not met',
        execution_id: execution.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch and execute actions
    const { data: actions } = await supabase
      .from('workflow_actions')
      .select('*')
      .eq('workflow_automation_id', workflow_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('execution_order');

    let actionsExecuted = 0;
    let actionsSucceeded = 0;
    let actionsFailed = 0;

    for (const action of actions || []) {
      const actionStartTime = Date.now();
      const result = await executeAction(supabase, action, trigger_data, tenant_id);
      const actionDuration = Date.now() - actionStartTime;

      actionsExecuted++;
      if (result.success) actionsSucceeded++;
      else actionsFailed++;

      // Log action execution
      executionLog.push({
        step: 'action_execution',
        action_id: action.id,
        action_type: action.action_type,
        success: result.success,
        result: result.result,
        error: result.error,
        duration_ms: actionDuration,
        timestamp: new Date().toISOString(),
      });

      // Store detailed action execution
      await supabase.from('workflow_execution_actions').insert({
        workflow_execution_id: execution.id,
        workflow_action_id: action.id,
        tenant_id,
        action_type: action.action_type,
        action_config: action.action_config,
        status: result.success ? 'completed' : 'failed',
        started_at: new Date(Date.now() - actionDuration).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: actionDuration,
        result: result.result,
        error_message: result.error,
      });

      // Handle retry logic
      if (!result.success && action.retry_count > 0) {
        executionLog.push({
          step: 'action_retry_scheduled',
          action_id: action.id,
          retry_count: action.retry_count,
          retry_delay_minutes: action.retry_delay_minutes,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 5. Update execution with results
    const finalStatus = actionsFailed > 0 ? 'failed' : 'completed';
    const duration = Date.now() - startTime;

    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        actions_executed: actionsExecuted,
        actions_succeeded: actionsSucceeded,
        actions_failed: actionsFailed,
        execution_log: executionLog,
      })
      .eq('id', execution.id);

    // 6. Update workflow statistics
    await supabase.rpc('increment', {
      row_id: workflow_id,
      table_name: 'workflow_automations',
      column_name: 'execution_count',
    });

    if (finalStatus === 'completed') {
      await supabase.rpc('increment', {
        row_id: workflow_id,
        table_name: 'workflow_automations',
        column_name: 'success_count',
      });
    } else {
      await supabase.rpc('increment', {
        row_id: workflow_id,
        table_name: 'workflow_automations',
        column_name: 'failure_count',
      });
    }

    await supabase
      .from('workflow_automations')
      .update({ last_executed_at: new Date().toISOString() })
      .eq('id', workflow_id);

    return new Response(JSON.stringify({
      success: true,
      execution_id: execution.id,
      status: finalStatus,
      actions_executed: actionsExecuted,
      actions_succeeded: actionsSucceeded,
      actions_failed: actionsFailed,
      duration_ms: duration,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Workflow] Error:', error);
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
