/**
 * Workflow Templates Hooks
 * 
 * React hooks for managing workflow templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  is_system_template: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
}

export interface CreateFromTemplateInput {
  template_id: string;
  tenant_id: string;
  name?: string;
  customize?: {
    triggers?: any[];
    actions?: any[];
  };
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const workflowTemplateKeys = {
  all: ['workflow-templates'] as const,
  lists: () => [...workflowTemplateKeys.all, 'list'] as const,
  list: (tenantId?: string, category?: string) =>
    [...workflowTemplateKeys.lists(), tenantId, category] as const,
  details: () => [...workflowTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowTemplateKeys.details(), id] as const,
  system: () => [...workflowTemplateKeys.all, 'system'] as const,
};

// ============================================================================
// FETCH HOOKS
// ============================================================================

/**
 * Fetch all workflow templates (system + tenant)
 */
export function useWorkflowTemplates(
  tenantId?: string,
  category?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: workflowTemplateKeys.list(tenantId, category),
    queryFn: async () => {
      let query = supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter to show system templates + tenant-specific templates
      return (data as WorkflowTemplate[]).filter(
        template => template.is_system_template || template.tenant_id === tenantId
      );
    },
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch system templates only
 */
export function useSystemTemplates(category?: string) {
  return useQuery({
    queryKey: workflowTemplateKeys.system(),
    queryFn: async () => {
      let query = supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_system_template', true)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorkflowTemplate[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour (system templates rarely change)
  });
}

/**
 * Fetch a single template
 */
export function useWorkflowTemplate(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workflowTemplateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as WorkflowTemplate;
    },
    enabled: options?.enabled !== false && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get template categories
 */
export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map(t => t.category))];
      return categories;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new template from existing workflow
 */
export function useCreateTemplate(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data: sessionData } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('workflow_templates')
        .insert({
          tenant_id: tenantId,
          created_by: sessionData.session?.user?.id,
          is_system_template: false,
          is_active: true,
          usage_count: 0,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.lists() });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

/**
 * Create workflow from template
 */
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFromTemplateInput) => {
      // Fetch the template
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', input.template_id)
        .single();

      if (templateError) throw templateError;

      const { data: sessionData } = await supabase.auth.getSession();

      // Create workflow from template
      const { data: workflow, error: workflowError } = await supabase
        .from('workflow_automations')
        .insert({
          tenant_id: input.tenant_id,
          name: input.name || template.name,
          description: template.description,
          template_id: template.id,
          is_active: false, // Start inactive for review
          created_by: sessionData.session?.user?.id,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create trigger from template config
      const triggerConfig = input.customize?.triggers?.[0] || template.trigger_config;
      
      const { error: triggerError } = await supabase
        .from('workflow_triggers')
        .insert({
          workflow_automation_id: workflow.id,
          tenant_id: input.tenant_id,
          trigger_type: triggerConfig.trigger_type,
          trigger_config: triggerConfig,
          conditions: [],
          condition_operator: 'AND',
          execution_order: 0,
          is_required: true,
        });

      if (triggerError) throw triggerError;

      // Create action from template config
      const actionConfig = input.customize?.actions?.[0] || template.action_config;
      
      const { error: actionError } = await supabase
        .from('workflow_actions')
        .insert({
          workflow_automation_id: workflow.id,
          tenant_id: input.tenant_id,
          action_type: actionConfig.action_type,
          action_config: actionConfig,
          execution_order: 0,
          is_active: true,
        });

      if (actionError) throw actionError;

      // Increment template usage count
      await supabase.rpc('increment', {
        row_id: template.id,
        table_name: 'workflow_templates',
        column_name: 'usage_count',
      });

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-automations'] });
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.lists() });
      toast.success('Workflow created from template', {
        description: 'You can now customize and activate it',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow from template: ${error.message}`);
    },
  });
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .update(updates)
        .eq('id', id)
        .eq('is_system_template', false) // Can't update system templates
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.detail(data.id) });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', id)
        .eq('is_system_template', false); // Can't delete system templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.lists() });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

/**
 * Save workflow as template
 */
export function useSaveAsTemplate(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      name,
      description,
      category,
      icon,
    }: {
      workflowId: string;
      name: string;
      description?: string;
      category: string;
      icon?: string;
    }) => {
      // Fetch workflow with triggers and actions
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

      // Extract first trigger and action as template config
      const triggerConfig = workflow.workflow_triggers?.[0] || {};
      const actionConfig = workflow.workflow_actions?.[0] || {};

      const { data: sessionData } = await supabase.auth.getSession();

      // Create template
      const { data, error } = await supabase
        .from('workflow_templates')
        .insert({
          tenant_id: tenantId,
          name,
          description,
          category,
          icon,
          trigger_config: {
            trigger_type: triggerConfig.trigger_type,
            trigger_config: triggerConfig.trigger_config,
            conditions: triggerConfig.conditions,
          },
          action_config: {
            action_type: actionConfig.action_type,
            action_config: actionConfig.action_config,
          },
          is_system_template: false,
          is_active: true,
          usage_count: 0,
          created_by: sessionData.session?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.lists() });
      toast.success('Workflow saved as template');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save as template: ${error.message}`);
    },
  });
}
