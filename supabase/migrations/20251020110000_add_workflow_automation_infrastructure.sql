-- ============================================================================
-- Week 15-16: Workflow Automation Infrastructure
-- ============================================================================
-- Description: Complete workflow automation system for catering operations
-- Features:
--   - Automated workflow orchestration
--   - Trigger-based action execution
--   - Template library for common workflows
--   - Full execution audit trail
--   - Multi-tenant isolation with RLS
-- Created: 2025-10-20
-- ============================================================================

-- ============================================================================
-- TABLE: workflow_templates
-- ============================================================================
-- Purpose: Pre-built workflow templates for common automation scenarios
-- Examples: Follow-up reminders, payment notifications, SLA escalations
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'follow_up', 'notification', 'escalation', 'status_change'
  icon VARCHAR(50), -- Icon identifier for UI
  
  -- Template configuration (stored as JSON for flexibility)
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Template status
  is_system_template BOOLEAN DEFAULT false, -- System templates are read-only
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT workflow_templates_category_check CHECK (
    category IN ('follow_up', 'notification', 'escalation', 'status_change', 'reminder', 'task_assignment', 'approval', 'custom')
  )
);

-- Indexes for workflow_templates
CREATE INDEX idx_workflow_templates_tenant_id ON workflow_templates(tenant_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_active ON workflow_templates(is_active);
CREATE INDEX idx_workflow_templates_created_at ON workflow_templates(created_at DESC);

-- ============================================================================
-- TABLE: workflow_automations
-- ============================================================================
-- Purpose: Core automation definitions linking triggers to actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  
  -- Workflow configuration
  priority INTEGER DEFAULT 0, -- Higher priority workflows execute first
  is_active BOOLEAN DEFAULT true,
  
  -- Execution settings
  max_executions_per_day INTEGER, -- Rate limiting
  cooldown_minutes INTEGER, -- Minimum time between executions
  
  -- Scheduling
  schedule_type VARCHAR(50) DEFAULT 'immediate', -- 'immediate', 'scheduled', 'recurring'
  schedule_config JSONB, -- For cron-like scheduling
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT workflow_automations_priority_check CHECK (priority >= 0 AND priority <= 100),
  CONSTRAINT workflow_automations_schedule_type_check CHECK (
    schedule_type IN ('immediate', 'scheduled', 'recurring', 'manual')
  )
);

-- Indexes for workflow_automations
CREATE INDEX idx_workflow_automations_tenant_id ON workflow_automations(tenant_id);
CREATE INDEX idx_workflow_automations_is_active ON workflow_automations(is_active);
CREATE INDEX idx_workflow_automations_priority ON workflow_automations(priority DESC);
CREATE INDEX idx_workflow_automations_template_id ON workflow_automations(template_id);
CREATE INDEX idx_workflow_automations_created_at ON workflow_automations(created_at DESC);

-- ============================================================================
-- TABLE: workflow_triggers
-- ============================================================================
-- Purpose: Define conditions that activate workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_automation_id UUID NOT NULL REFERENCES workflow_automations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Trigger type and configuration
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Condition logic
  condition_operator VARCHAR(20) DEFAULT 'AND', -- 'AND', 'OR' for multiple conditions
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Order and grouping
  execution_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workflow_triggers_trigger_type_check CHECK (
    trigger_type IN (
      'order_status_change',
      'order_created',
      'order_updated',
      'payment_received',
      'payment_overdue',
      'event_date_approaching',
      'time_based',
      'date_based',
      'threshold_reached',
      'field_value_change',
      'manual_trigger',
      'webhook',
      'custom'
    )
  ),
  CONSTRAINT workflow_triggers_condition_operator_check CHECK (
    condition_operator IN ('AND', 'OR', 'NOT')
  )
);

-- Indexes for workflow_triggers
CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_automation_id);
CREATE INDEX idx_workflow_triggers_tenant_id ON workflow_triggers(tenant_id);
CREATE INDEX idx_workflow_triggers_trigger_type ON workflow_triggers(trigger_type);
CREATE INDEX idx_workflow_triggers_execution_order ON workflow_triggers(execution_order);

-- ============================================================================
-- TABLE: workflow_actions
-- ============================================================================
-- Purpose: Define actions to execute when triggers are satisfied
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_automation_id UUID NOT NULL REFERENCES workflow_automations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Action type and configuration
  action_type VARCHAR(100) NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Execution settings
  execution_order INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0, -- Delay before executing
  retry_count INTEGER DEFAULT 0, -- Number of retries on failure
  retry_delay_minutes INTEGER DEFAULT 5,
  
  -- Conditional execution
  execute_if JSONB, -- Conditional logic for action execution
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workflow_actions_action_type_check CHECK (
    action_type IN (
      'send_email',
      'send_sms',
      'send_notification',
      'update_order_status',
      'create_task',
      'assign_task',
      'update_field',
      'call_webhook',
      'execute_function',
      'send_slack_message',
      'create_calendar_event',
      'generate_report',
      'custom'
    )
  ),
  CONSTRAINT workflow_actions_delay_check CHECK (delay_minutes >= 0),
  CONSTRAINT workflow_actions_retry_count_check CHECK (retry_count >= 0 AND retry_count <= 10)
);

-- Indexes for workflow_actions
CREATE INDEX idx_workflow_actions_workflow_id ON workflow_actions(workflow_automation_id);
CREATE INDEX idx_workflow_actions_tenant_id ON workflow_actions(tenant_id);
CREATE INDEX idx_workflow_actions_action_type ON workflow_actions(action_type);
CREATE INDEX idx_workflow_actions_execution_order ON workflow_actions(execution_order);
CREATE INDEX idx_workflow_actions_is_active ON workflow_actions(is_active);

-- ============================================================================
-- TABLE: workflow_executions
-- ============================================================================
-- Purpose: Audit trail and execution history for workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_automation_id UUID NOT NULL REFERENCES workflow_automations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Execution context
  trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE SET NULL,
  triggered_by VARCHAR(100), -- 'system', 'user', 'webhook', 'schedule'
  triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Related entity (polymorphic reference)
  entity_type VARCHAR(100), -- 'catering_order', 'booking', 'task', etc.
  entity_id UUID,
  
  -- Execution status
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Execution details
  trigger_data JSONB, -- Data that triggered the workflow
  execution_log JSONB DEFAULT '[]'::jsonb, -- Step-by-step execution log
  error_message TEXT,
  error_stack TEXT,
  
  -- Action execution results
  actions_executed INTEGER DEFAULT 0,
  actions_succeeded INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,
  
  -- Retry information
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workflow_executions_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying')
  ),
  CONSTRAINT workflow_executions_triggered_by_check CHECK (
    triggered_by IN ('system', 'user', 'webhook', 'schedule', 'manual', 'test')
  )
);

-- Indexes for workflow_executions
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_automation_id);
CREATE INDEX idx_workflow_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_entity ON workflow_executions(entity_type, entity_id);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX idx_workflow_executions_triggered_by ON workflow_executions(triggered_by);
CREATE INDEX idx_workflow_executions_next_retry_at ON workflow_executions(next_retry_at) WHERE status = 'retrying';

-- ============================================================================
-- TABLE: workflow_execution_actions
-- ============================================================================
-- Purpose: Detailed action execution results within workflow executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_execution_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  workflow_action_id UUID NOT NULL REFERENCES workflow_actions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Action details
  action_type VARCHAR(100) NOT NULL,
  action_config JSONB,
  
  -- Execution status
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Results
  result JSONB, -- Action execution result data
  error_message TEXT,
  error_stack TEXT,
  
  -- Retry information
  retry_attempt INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workflow_execution_actions_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')
  )
);

-- Indexes for workflow_execution_actions
CREATE INDEX idx_workflow_execution_actions_execution_id ON workflow_execution_actions(workflow_execution_id);
CREATE INDEX idx_workflow_execution_actions_action_id ON workflow_execution_actions(workflow_action_id);
CREATE INDEX idx_workflow_execution_actions_tenant_id ON workflow_execution_actions(tenant_id);
CREATE INDEX idx_workflow_execution_actions_status ON workflow_execution_actions(status);
CREATE INDEX idx_workflow_execution_actions_created_at ON workflow_execution_actions(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active workflows for a tenant
CREATE OR REPLACE FUNCTION get_active_workflows(p_tenant_id UUID)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name VARCHAR,
  trigger_count BIGINT,
  action_count BIGINT,
  execution_count INTEGER,
  success_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wa.id,
    wa.name,
    COUNT(DISTINCT wt.id) AS trigger_count,
    COUNT(DISTINCT wac.id) AS action_count,
    wa.execution_count,
    CASE 
      WHEN wa.execution_count > 0 
      THEN ROUND((wa.success_count::NUMERIC / wa.execution_count::NUMERIC) * 100, 2)
      ELSE 0
    END AS success_rate
  FROM workflow_automations wa
  LEFT JOIN workflow_triggers wt ON wa.id = wt.workflow_automation_id
  LEFT JOIN workflow_actions wac ON wa.id = wac.workflow_automation_id
  WHERE wa.tenant_id = p_tenant_id
    AND wa.is_active = true
  GROUP BY wa.id, wa.name, wa.execution_count, wa.success_count
  ORDER BY wa.priority DESC, wa.name;
END;
$$;

-- Function: Get workflow execution statistics
CREATE OR REPLACE FUNCTION get_workflow_stats(
  p_tenant_id UUID,
  p_workflow_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  average_duration_ms NUMERIC,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_executions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_executions,
    ROUND(AVG(duration_ms)::NUMERIC, 2) AS average_duration_ms,
    CASE 
      WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END AS success_rate
  FROM workflow_executions
  WHERE tenant_id = p_tenant_id
    AND created_at >= now() - (p_days || ' days')::INTERVAL
    AND (p_workflow_id IS NULL OR workflow_automation_id = p_workflow_id);
END;
$$;

-- Function: Check if workflow can execute (rate limiting and cooldown)
CREATE OR REPLACE FUNCTION can_workflow_execute(
  p_workflow_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow workflow_automations%ROWTYPE;
  v_executions_today INTEGER;
  v_last_execution TIMESTAMPTZ;
  v_cooldown_expired BOOLEAN;
BEGIN
  -- Get workflow details
  SELECT * INTO v_workflow
  FROM workflow_automations
  WHERE id = p_workflow_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND OR NOT v_workflow.is_active THEN
    RETURN false;
  END IF;
  
  -- Check daily execution limit
  IF v_workflow.max_executions_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_executions_today
    FROM workflow_executions
    WHERE workflow_automation_id = p_workflow_id
      AND created_at >= CURRENT_DATE;
    
    IF v_executions_today >= v_workflow.max_executions_per_day THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check cooldown period
  IF v_workflow.cooldown_minutes IS NOT NULL THEN
    SELECT last_executed_at INTO v_last_execution
    FROM workflow_automations
    WHERE id = p_workflow_id;
    
    IF v_last_execution IS NOT NULL THEN
      v_cooldown_expired := (now() - v_last_execution) >= (v_workflow.cooldown_minutes || ' minutes')::INTERVAL;
      IF NOT v_cooldown_expired THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Function: Evaluate workflow trigger conditions
CREATE OR REPLACE FUNCTION evaluate_trigger_conditions(
  p_trigger_id UUID,
  p_context JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trigger workflow_triggers%ROWTYPE;
  v_condition JSONB;
  v_condition_met BOOLEAN;
  v_all_met BOOLEAN := true;
  v_any_met BOOLEAN := false;
BEGIN
  -- Get trigger configuration
  SELECT * INTO v_trigger
  FROM workflow_triggers
  WHERE id = p_trigger_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Evaluate each condition
  FOR v_condition IN SELECT * FROM jsonb_array_elements(v_trigger.conditions)
  LOOP
    -- Simple condition evaluation (can be extended)
    v_condition_met := (
      p_context->>(v_condition->>'field') = v_condition->>'value'
    );
    
    -- Track results based on operator
    v_all_met := v_all_met AND v_condition_met;
    v_any_met := v_any_met OR v_condition_met;
  END LOOP;
  
  -- Return based on condition operator
  RETURN CASE v_trigger.condition_operator
    WHEN 'AND' THEN v_all_met
    WHEN 'OR' THEN v_any_met
    ELSE false
  END;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workflow_templates
CREATE POLICY "Tenant isolation for workflow_templates"
  ON workflow_templates
  FOR ALL
  USING (
    tenant_id IS NULL -- System templates visible to all
    OR tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- RLS Policies: workflow_automations
CREATE POLICY "Tenant isolation for workflow_automations"
  ON workflow_automations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- RLS Policies: workflow_triggers
CREATE POLICY "Tenant isolation for workflow_triggers"
  ON workflow_triggers
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- RLS Policies: workflow_actions
CREATE POLICY "Tenant isolation for workflow_actions"
  ON workflow_actions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- RLS Policies: workflow_executions
CREATE POLICY "Tenant isolation for workflow_executions"
  ON workflow_executions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- RLS Policies: workflow_execution_actions
CREATE POLICY "Tenant isolation for workflow_execution_actions"
  ON workflow_execution_actions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger: workflow_templates
CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: workflow_automations
CREATE TRIGGER update_workflow_automations_updated_at
  BEFORE UPDATE ON workflow_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: workflow_triggers
CREATE TRIGGER update_workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: workflow_actions
CREATE TRIGGER update_workflow_actions_updated_at
  BEFORE UPDATE ON workflow_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: workflow_executions
CREATE TRIGGER update_workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: System Workflow Templates
-- ============================================================================

-- Template: Order Confirmation Email
INSERT INTO workflow_templates (id, tenant_id, name, description, category, icon, trigger_config, action_config, is_system_template)
VALUES (
  gen_random_uuid(),
  NULL,
  'Order Confirmation Email',
  'Automatically send confirmation email when order is created',
  'notification',
  'mail-check',
  '{"trigger_type": "order_created"}'::jsonb,
  '{"action_type": "send_email", "template": "order_confirmation"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Template: Payment Reminder
INSERT INTO workflow_templates (id, tenant_id, name, description, category, icon, trigger_config, action_config, is_system_template)
VALUES (
  gen_random_uuid(),
  NULL,
  'Payment Reminder',
  'Send reminder 7 days before payment due date',
  'reminder',
  'alarm-clock',
  '{"trigger_type": "date_based", "days_before": 7, "reference_field": "payment_due_date"}'::jsonb,
  '{"action_type": "send_email", "template": "payment_reminder"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Template: Event Follow-up
INSERT INTO workflow_templates (id, tenant_id, name, description, category, icon, trigger_config, action_config, is_system_template)
VALUES (
  gen_random_uuid(),
  NULL,
  'Event Follow-up Survey',
  'Send satisfaction survey 1 day after event',
  'follow_up',
  'message-circle',
  '{"trigger_type": "date_based", "days_after": 1, "reference_field": "event_date"}'::jsonb,
  '{"action_type": "send_email", "template": "satisfaction_survey"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Template: Overdue Payment Escalation
INSERT INTO workflow_templates (id, tenant_id, name, description, category, icon, trigger_config, action_config, is_system_template)
VALUES (
  gen_random_uuid(),
  NULL,
  'Overdue Payment Escalation',
  'Escalate to manager when payment is 7 days overdue',
  'escalation',
  'alert-triangle',
  '{"trigger_type": "payment_overdue", "days_overdue": 7}'::jsonb,
  '{"action_type": "assign_task", "assignee_role": "manager", "priority": "high"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates for common automation scenarios';
COMMENT ON TABLE workflow_automations IS 'Core automation definitions linking triggers to actions';
COMMENT ON TABLE workflow_triggers IS 'Define conditions that activate workflows';
COMMENT ON TABLE workflow_actions IS 'Define actions to execute when triggers are satisfied';
COMMENT ON TABLE workflow_executions IS 'Audit trail and execution history for workflows';
COMMENT ON TABLE workflow_execution_actions IS 'Detailed action execution results within workflow executions';

COMMENT ON FUNCTION get_active_workflows(UUID) IS 'Get all active workflows with statistics for a tenant';
COMMENT ON FUNCTION get_workflow_stats(UUID, UUID, INTEGER) IS 'Get execution statistics for workflows within a time period';
COMMENT ON FUNCTION can_workflow_execute(UUID, UUID) IS 'Check if workflow can execute based on rate limits and cooldown';
COMMENT ON FUNCTION evaluate_trigger_conditions(UUID, JSONB) IS 'Evaluate if trigger conditions are met given context data';
