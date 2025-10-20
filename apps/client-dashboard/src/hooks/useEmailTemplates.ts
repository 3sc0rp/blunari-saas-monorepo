import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  placeholders: string[];
  category: 'confirmation' | 'quote' | 'reminder' | 'thank_you' | 'custom';
  is_active: boolean;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface NewTemplate {
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  placeholders?: string[];
  category: EmailTemplate['category'];
  is_active?: boolean;
}

interface SendEmailRequest {
  to: string | string[];
  templateId?: string;
  templateData?: Record<string, any>;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Hook for managing email templates and sending emails
 * 
 * Provides functionality for:
 * - Fetching templates by category
 * - Creating/updating/deleting templates
 * - Sending emails using templates
 * - Placeholder variable replacement
 */
export function useEmailTemplates(tenantId: string) {
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['email-templates', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
    enabled: !!tenantId,
  });

  // Fetch single template
  const fetchTemplate = async (templateId: string) => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  };

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (newTemplate: NewTemplate) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...newTemplate,
          tenant_id: tenantId,
          created_by: user.user?.id,
          placeholders: newTemplate.placeholders || extractPlaceholders(newTemplate.body_html),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', tenantId] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, updates }: { templateId: string; updates: Partial<NewTemplate> }) => {
      const updateData = {
        ...updates,
        placeholders: updates.body_html 
          ? extractPlaceholders(updates.body_html)
          : undefined,
      };

      const { data, error } = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', tenantId] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('is_default', false); // Prevent deletion of default templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', tenantId] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  // Send email mutation (via Edge Function)
  const sendEmailMutation = useMutation({
    mutationFn: async (emailRequest: SendEmailRequest) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailRequest),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Email sent successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = await fetchTemplate(templateId);
      
      return createTemplateMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text,
        placeholders: template.placeholders,
        category: template.category,
        is_active: false, // Duplicates start as inactive
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to duplicate template: ${error.message}`);
    },
  });

  // Group templates by category
  const templatesByCategory = templates?.reduce((groups, template) => {
    if (!groups[template.category]) {
      groups[template.category] = [];
    }
    groups[template.category].push(template);
    return groups;
  }, {} as Record<string, EmailTemplate[]>);

  return {
    templates: templates || [],
    templatesByCategory: templatesByCategory || {},
    isLoading,
    error,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    duplicateTemplate: duplicateTemplateMutation.mutate,
    sendEmail: sendEmailMutation.mutate,
    fetchTemplate,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isSending: sendEmailMutation.isPending,
  };
}

/**
 * Extract placeholder variables from HTML template
 * Matches {{variable_name}} pattern
 */
function extractPlaceholders(html: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Preview template with sample data
 */
export function previewTemplate(template: EmailTemplate, sampleData: Record<string, any>): string {
  let preview = template.body_html;
  
  template.placeholders.forEach((placeholder) => {
    const value = sampleData[placeholder] || `[${placeholder}]`;
    preview = preview.replace(
      new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'),
      String(value)
    );
  });

  return preview;
}

/**
 * Common placeholder definitions
 */
export const COMMON_PLACEHOLDERS = {
  customer_name: 'Customer Name',
  customer_email: 'Customer Email',
  customer_phone: 'Customer Phone',
  order_number: 'Order Number',
  event_name: 'Event Name',
  event_date: 'Event Date',
  event_time: 'Event Time',
  venue_address: 'Venue Address',
  package_name: 'Package Name',
  guest_count: 'Guest Count',
  total_amount: 'Total Amount',
  amount_due: 'Amount Due',
  restaurant_name: 'Restaurant Name',
  contact_phone: 'Contact Phone',
  contact_email: 'Contact Email',
  quote_expires_date: 'Quote Expiration Date',
  payment_link: 'Payment Link',
  feedback_link: 'Feedback Link',
  review_link: 'Review Link',
};
