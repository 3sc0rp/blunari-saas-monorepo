/**
 * Workflow Automation Hooks
 * 
 * React hooks for managing workflow automations using TanStack Query.
 * Provides CRUD operations, execution, and statistics for workflows.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowAutomation {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  priority: number;
  is_active: boolean;
  max_executions_per_day: number | null;
  cooldown_minutes: number | null;
  schedule_type: 'immediate' | 'scheduled' | 'recurring' | 'manual';
  schedule_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_executed_at: string | null;
  execution_count: number;
  success_count: number;
  failure_count: number;
}

export interface CreateWorkflowAutomationInput {
  name: string;
  description?: string;
  template_id?: string;
  priority?: number;
  is_active?: boolean;
  max_executions_per_day?: number;
  cooldown_minutes?: number;
  schedule_type?: string;
  schedule_config?: Record<string, any>;
}

export interface UpdateWorkflowAutomationInput extends Partial<CreateWorkflowAutomationInput> {
  id: string;
}

export interface ExecuteWorkflowInput {
  workflow_id: string;
  tenant_id: string;
  trigger_data?: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
  triggered_by?: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const workflowAutomationKeys = {
  all: ['workflow-automations'] as const,
  lists: () => [...workflowAutomationKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: Record<string, any>) => 
    [...workflowAutomationKeys.lists(), tenantId, filters] as const,
  details: () => [...workflowAutomationKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowAutomationKeys.details(), id] as const,
  stats: (tenantId: string, workflowId?: string) =>
    [...workflowAutomationKeys.all, 'stats', tenantId, workflowId] as const,
};

// ============================================================================
// FETCH HOOKS
// ============================================================================

/**
 * Fetch all workflow automations for a tenant
 */
export function useWorkflowAutomations(
  tenantId: string,
  options?: {
    isActive?: boolean;
    templateId?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: workflowAutomationKeys.list(tenantId, options),
    queryFn: async () => {
      let query = supabase
        .from('workflow_automations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: false });

      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorkflowAutomation[];
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single workflow automation with full details
 */
export function useWorkflowAutomation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workflowAutomationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_automations')
        .select(`
          *,
          workflow_triggers (*),
          workflow_actions (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: options?.enabled !== false && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get active workflows with statistics
 */
export function useActiveWorkflows(tenantId: string) {
  return useQuery({
    queryKey: workflowAutomationKeys.stats(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_workflows', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get workflow statistics
 */
export function useWorkflowStats(
  tenantId: string,
  workflowId?: string,
  days: number = 30
) {
  return useQuery({
    queryKey: workflowAutomationKeys.stats(tenantId, workflowId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_workflow_stats', {
        p_tenant_id: tenantId,
        p_workflow_id: workflowId || null,
        p_days: days,
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new workflow automation
 */
export function useCreateWorkflowAutomation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkflowAutomationInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from('workflow_automations')
        .insert({
          tenant_id: tenantId,
          created_by: sessionData.session?.user?.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.lists() });
      toast.success('Workflow automation created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });
}

/**
 * Update a workflow automation
 */
export function useUpdateWorkflowAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkflowAutomationInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('workflow_automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowAutomation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.detail(data.id) });
      toast.success('Workflow automation updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}

/**
 * Delete a workflow automation
 */
export function useDeleteWorkflowAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.lists() });
      toast.success('Workflow automation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

/**
 * Toggle workflow active status
 */
export function useToggleWorkflowActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('workflow_automations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.detail(data.id) });
      toast.success(`Workflow ${data.is_active ? 'activated' : 'deactivated'}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle workflow: ${error.message}`);
    },
  });
}

/**
 * Execute a workflow manually
 */
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExecuteWorkflowInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/execute-workflow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          triggered_by: input.triggered_by || 'manual',
          triggered_by_user_id: sessionData.session.user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute workflow');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: workflowAutomationKeys.detail(variables.workflow_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workflow-executions'] 
      });
      
      if (data.success) {
        toast.success('Workflow executed successfully', {
          description: `${data.actions_succeeded}/${data.actions_executed} actions completed`,
        });
      } else {
        toast.error('Workflow execution failed', {
          description: data.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to execute workflow: ${error.message}`);
    },
  });
}

/**
 * Duplicate a workflow automation
 */
export function useDuplicateWorkflow(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      // Fetch the workflow with triggers and actions
      const { data: workflow, error: fetchError } = await supabase
        .from('workflow_automations')
        .select(`
          *,
          workflow_triggers (*),
          workflow_actions (*)
        `)
        .eq('id', workflowId)
        .single();

      if (fetchError) throw fetchError;

      const { data: sessionData } = await supabase.auth.getSession();

      // Create new workflow
      const { data: newWorkflow, error: createError } = await supabase
        .from('workflow_automations')
        .insert({
          tenant_id: tenantId,
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          priority: workflow.priority,
          is_active: false, // Start inactive
          max_executions_per_day: workflow.max_executions_per_day,
          cooldown_minutes: workflow.cooldown_minutes,
          schedule_type: workflow.schedule_type,
          schedule_config: workflow.schedule_config,
          created_by: sessionData.session?.user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy triggers
      if (workflow.workflow_triggers?.length > 0) {
        const triggers = workflow.workflow_triggers.map((t: any) => ({
          workflow_automation_id: newWorkflow.id,
          tenant_id: tenantId,
          trigger_type: t.trigger_type,
          trigger_config: t.trigger_config,
          condition_operator: t.condition_operator,
          conditions: t.conditions,
          execution_order: t.execution_order,
          is_required: t.is_required,
        }));

        const { error: triggersError } = await supabase
          .from('workflow_triggers')
          .insert(triggers);

        if (triggersError) throw triggersError;
      }

      // Copy actions
      if (workflow.workflow_actions?.length > 0) {
        const actions = workflow.workflow_actions.map((a: any) => ({
          workflow_automation_id: newWorkflow.id,
          tenant_id: tenantId,
          action_type: a.action_type,
          action_config: a.action_config,
          execution_order: a.execution_order,
          delay_minutes: a.delay_minutes,
          retry_count: a.retry_count,
          retry_delay_minutes: a.retry_delay_minutes,
          execute_if: a.execute_if,
          is_active: a.is_active,
        }));

        const { error: actionsError } = await supabase
          .from('workflow_actions')
          .insert(actions);

        if (actionsError) throw actionsError;
      }

      return newWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowAutomationKeys.lists() });
      toast.success('Workflow duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate workflow: ${error.message}`);
    },
  });
}
