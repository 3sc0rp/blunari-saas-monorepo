/**
 * Workflow Executions Hooks
 * 
 * React hooks for managing workflow execution history and monitoring.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowExecution {
  id: string;
  workflow_automation_id: string;
  tenant_id: string;
  trigger_id: string | null;
  triggered_by: string;
  triggered_by_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  trigger_data: Record<string, any> | null;
  execution_log: any[];
  error_message: string | null;
  error_stack: string | null;
  actions_executed: number;
  actions_succeeded: number;
  actions_failed: number;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionFilters {
  workflowId?: string;
  status?: string;
  triggeredBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const workflowExecutionKeys = {
  all: ['workflow-executions'] as const,
  lists: () => [...workflowExecutionKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: WorkflowExecutionFilters) =>
    [...workflowExecutionKeys.lists(), tenantId, filters] as const,
  details: () => [...workflowExecutionKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowExecutionKeys.details(), id] as const,
  actions: (executionId: string) =>
    [...workflowExecutionKeys.all, 'actions', executionId] as const,
};

// ============================================================================
// FETCH HOOKS
// ============================================================================

/**
 * Fetch workflow executions with filters
 */
export function useWorkflowExecutions(
  tenantId: string,
  filters?: WorkflowExecutionFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: workflowExecutionKeys.list(tenantId, filters),
    queryFn: async () => {
      let query = supabase
        .from('workflow_executions')
        .select('*, workflow_automations(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.workflowId) {
        query = query.eq('workflow_automation_id', filters.workflowId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.triggeredBy) {
        query = query.eq('triggered_by', filters.triggeredBy);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorkflowExecution[];
    },
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds for monitoring
  });
}

/**
 * Fetch a single workflow execution with full details
 */
export function useWorkflowExecution(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workflowExecutionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_automations(name, description),
          workflow_execution_actions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: options?.enabled !== false && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch execution actions for a workflow execution
 */
export function useExecutionActions(executionId: string) {
  return useQuery({
    queryKey: workflowExecutionKeys.actions(executionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_execution_actions')
        .select('*')
        .eq('workflow_execution_id', executionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!executionId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get recent executions (last 24 hours)
 */
export function useRecentExecutions(tenantId: string, limit: number = 10) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return useWorkflowExecutions(
    tenantId,
    {
      startDate: yesterday,
      limit,
    }
  );
}

/**
 * Get failed executions that need attention
 */
export function useFailedExecutions(tenantId: string) {
  return useWorkflowExecutions(
    tenantId,
    {
      status: 'failed',
      limit: 20,
    }
  );
}

/**
 * Get executions that are currently running
 */
export function useRunningExecutions(tenantId: string) {
  return useWorkflowExecutions(
    tenantId,
    {
      status: 'running',
    },
    {
      enabled: true, // Always enabled for real-time monitoring
    }
  );
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Retry a failed execution
 */
export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      // Fetch the original execution
      const { data: execution, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (fetchError) throw fetchError;

      // Execute the workflow again with the same data
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
          workflow_id: execution.workflow_automation_id,
          tenant_id: execution.tenant_id,
          trigger_data: execution.trigger_data,
          entity_type: execution.entity_type,
          entity_id: execution.entity_id,
          triggered_by: 'manual_retry',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry execution');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowExecutionKeys.lists() });
      toast.success('Workflow execution retried successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry execution: ${error.message}`);
    },
  });
}

/**
 * Cancel a running execution
 */
export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
        .eq('status', 'running')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowExecutionKeys.lists() });
      toast.success('Execution cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel execution: ${error.message}`);
    },
  });
}

/**
 * Delete old execution records
 */
export function useDeleteExecutions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, beforeDate }: { tenantId: string; beforeDate: string }) => {
      const { error } = await supabase
        .from('workflow_executions')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('created_at', beforeDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowExecutionKeys.lists() });
      toast.success('Old execution records deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete executions: ${error.message}`);
    },
  });
}

// ============================================================================
// COMPUTED QUERIES
// ============================================================================

/**
 * Get execution statistics
 */
export function useExecutionStats(tenantId: string, days: number = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: ['execution-stats', tenantId, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('status, duration_ms, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate);

      if (error) throw error;

      // Calculate statistics
      const total = data.length;
      const completed = data.filter(e => e.status === 'completed').length;
      const failed = data.filter(e => e.status === 'failed').length;
      const cancelled = data.filter(e => e.status === 'cancelled').length;
      const running = data.filter(e => e.status === 'running').length;

      const successRate = total > 0 ? (completed / total) * 100 : 0;

      const durations = data
        .filter(e => e.duration_ms !== null)
        .map(e => e.duration_ms!);
      
      const avgDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      return {
        total,
        completed,
        failed,
        cancelled,
        running,
        successRate,
        avgDuration,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
