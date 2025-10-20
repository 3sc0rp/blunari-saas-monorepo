// ============================================================================
// Edge Function: evaluate-workflow-conditions
// ============================================================================
// Purpose: Evaluate if workflow trigger conditions are met
// Features:
//   - Support multiple condition operators
//   - Complex condition evaluation
//   - Context-based evaluation
//   - Return matched workflows
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INTERFACES
// ============================================================================

interface EvaluationRequest {
  tenant_id: string;
  trigger_type: string;
  context: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
}

interface WorkflowMatch {
  workflow_id: string;
  workflow_name: string;
  priority: number;
  triggers_matched: number;
  should_execute: boolean;
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

    const requestData: EvaluationRequest = await req.json();
    const { tenant_id, trigger_type, context, entity_type, entity_id } = requestData;

    console.log(`[Condition Eval] Evaluating trigger type: ${trigger_type} for tenant: ${tenant_id}`);

    // 1. Find all active workflows with matching trigger type
    const { data: workflows, error: workflowError } = await supabase
      .from('workflow_automations')
      .select(`
        id,
        name,
        priority,
        is_active,
        workflow_triggers (
          id,
          trigger_type,
          trigger_config,
          conditions,
          condition_operator,
          is_required
        )
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    if (workflowError) throw workflowError;

    // 2. Evaluate each workflow's triggers
    const matches: WorkflowMatch[] = [];

    for (const workflow of workflows || []) {
      const triggers = (workflow as any).workflow_triggers || [];
      
      // Filter triggers matching the trigger type
      const matchingTriggers = triggers.filter(
        (t: any) => t.trigger_type === trigger_type
      );

      if (matchingTriggers.length === 0) continue;

      let triggersMatched = 0;
      let allRequiredPassed = true;

      for (const trigger of matchingTriggers) {
        const passed = evaluateConditions(trigger.conditions, trigger.condition_operator, context);
        
        if (passed) {
          triggersMatched++;
        } else if (trigger.is_required) {
          allRequiredPassed = false;
          break;
        }
      }

      if (triggersMatched > 0 && allRequiredPassed) {
        matches.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          priority: workflow.priority || 0,
          triggers_matched: triggersMatched,
          should_execute: true,
        });
      }
    }

    // 3. Sort by priority (highest first)
    matches.sort((a, b) => b.priority - a.priority);

    console.log(`[Condition Eval] Found ${matches.length} matching workflows`);

    return new Response(JSON.stringify({
      success: true,
      matches,
      count: matches.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Condition Eval] Error:', error);
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Evaluate conditions with operator logic
 */
function evaluateConditions(
  conditions: any[],
  operator: string,
  context: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means always pass
  }

  const results = conditions.map(condition => evaluateSingleCondition(condition, context));

  switch (operator) {
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
 * Evaluate a single condition
 */
function evaluateSingleCondition(
  condition: any,
  context: Record<string, any>
): boolean {
  const field = condition.field;
  const value = condition.value;
  const operator = condition.operator || 'equals';

  // Get field value from context (supports nested fields with dot notation)
  const fieldValue = getNestedValue(context, field);

  switch (operator) {
    case 'equals':
    case '==':
      return fieldValue === value;

    case 'not_equals':
    case '!=':
      return fieldValue !== value;

    case 'greater_than':
    case '>':
      return Number(fieldValue) > Number(value);

    case 'greater_than_or_equal':
    case '>=':
      return Number(fieldValue) >= Number(value);

    case 'less_than':
    case '<':
      return Number(fieldValue) < Number(value);

    case 'less_than_or_equal':
    case '<=':
      return Number(fieldValue) <= Number(value);

    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);

    case 'is_null':
      return fieldValue === null || fieldValue === undefined;

    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;

    case 'is_empty':
      return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || String(fieldValue).trim() === '';

    case 'is_not_empty':
      return fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0) && String(fieldValue).trim() !== '';

    case 'matches_regex':
      try {
        const regex = new RegExp(value);
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const numValue = Number(fieldValue);
        return numValue >= Number(value[0]) && numValue <= Number(value[1]);
      }
      return false;

    case 'date_before':
      return new Date(fieldValue) < new Date(value);

    case 'date_after':
      return new Date(fieldValue) > new Date(value);

    case 'date_equals':
      return new Date(fieldValue).toDateString() === new Date(value).toDateString();

    default:
      console.warn(`[Condition Eval] Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({user: {name: 'John'}}, 'user.name') => 'John'
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
