import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SMSHistory {
  id: string;
  tenant_id: string;
  order_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  message: string;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  error_message?: string;
  twilio_sid?: string;
  twilio_status?: string;
  segments: number;
  cost_cents?: number;
  sent_by?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

interface SendSMSRequest {
  tenantId: string;
  orderId?: string;
  to: string;
  message: string;
  recipientName?: string;
}

interface SMSFilters {
  orderId?: string;
  status?: SMSHistory['status'];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Hook for Twilio SMS integration
 * 
 * Provides functionality for:
 * - Sending SMS messages
 * - Fetching SMS history
 * - Tracking delivery status
 * - Cost calculation
 */
export function useTwilioSMS(tenantId: string, filters?: SMSFilters) {
  const queryClient = useQueryClient();

  // Fetch SMS history
  const { data: smsHistory, isLoading, error } = useQuery({
    queryKey: ['sms-history', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('sms_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SMSHistory[];
    },
    enabled: !!tenantId,
  });

  // Get SMS stats
  const { data: stats } = useQuery({
    queryKey: ['sms-stats', tenantId],
    queryFn: async () => {
      const { data: allSMS, error } = await supabase
        .from('sms_history')
        .select('status, cost_cents, segments')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const totalSent = allSMS?.filter(s => 
        ['sent', 'delivered'].includes(s.status)
      ).length || 0;

      const totalFailed = allSMS?.filter(s => 
        ['failed', 'undelivered'].includes(s.status)
      ).length || 0;

      const totalCost = allSMS?.reduce((sum, s) => 
        sum + (s.cost_cents || 0), 0
      ) || 0;

      const totalSegments = allSMS?.reduce((sum, s) => 
        sum + (s.segments || 0), 0
      ) || 0;

      return {
        totalSent,
        totalFailed,
        totalCost: totalCost / 100, // Convert cents to dollars
        totalSegments,
        deliveryRate: totalSent > 0 
          ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1)
          : '0',
      };
    },
    enabled: !!tenantId,
  });

  // Send SMS mutation (via Edge Function)
  const sendSMSMutation = useMutation({
    mutationFn: async (smsRequest: SendSMSRequest) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(smsRequest),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send SMS');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-history', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats', tenantId] });
      toast.success(`SMS sent successfully (${data.segments} segment${data.segments > 1 ? 's' : ''})`);
    },
    onError: (error: any) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });

  // Refresh delivery status for a specific SMS
  const refreshStatusMutation = useMutation({
    mutationFn: async (twilioSid: string) => {
      // This would typically call a Twilio status check endpoint
      // For now, we'll just refetch from our database
      const { data, error } = await supabase
        .from('sms_history')
        .select('*')
        .eq('twilio_sid', twilioSid)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-history', tenantId] });
      toast.success('Status refreshed');
    },
    onError: (error: any) => {
      toast.error(`Failed to refresh status: ${error.message}`);
    },
  });

  // Calculate message segments
  const calculateSegments = (message: string): number => {
    // GSM-7 encoding: 160 chars per segment for single, 153 for multi-part
    // UCS-2 encoding: 70 chars per segment for single, 67 for multi-part
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const length = message.length;

    if (hasUnicode) {
      // UCS-2 encoding
      if (length <= 70) return 1;
      return Math.ceil(length / 67);
    } else {
      // GSM-7 encoding
      if (length <= 160) return 1;
      return Math.ceil(length / 153);
    }
  };

  // Estimate cost (US rates: ~$0.0075 per segment)
  const estimateCost = (message: string): number => {
    const segments = calculateSegments(message);
    return segments * 0.0075; // in dollars
  };

  return {
    smsHistory: smsHistory || [],
    stats: stats || {
      totalSent: 0,
      totalFailed: 0,
      totalCost: 0,
      totalSegments: 0,
      deliveryRate: '0',
    },
    isLoading,
    error,
    sendSMS: sendSMSMutation.mutate,
    refreshStatus: refreshStatusMutation.mutate,
    isSending: sendSMSMutation.isPending,
    calculateSegments,
    estimateCost,
  };
}

/**
 * Pre-built SMS templates
 */
export const SMS_TEMPLATES = {
  order_confirmation: {
    name: 'Order Confirmation',
    message: 'Hi {{customer_name}}, your catering order for {{event_date}} has been confirmed! Order #{{order_number}}. Questions? Reply or call {{contact_phone}}.',
  },
  event_reminder: {
    name: 'Event Reminder',
    message: 'Reminder: Your {{restaurant_name}} catering event is tomorrow at {{event_time}}! Location: {{venue_address}}. See you soon!',
  },
  payment_link: {
    name: 'Payment Link',
    message: 'Hi {{customer_name}}, complete your payment for order #{{order_number}}: {{payment_link}}',
  },
  quote_sent: {
    name: 'Quote Sent',
    message: 'Your {{restaurant_name}} catering quote for {{event_date}} is ready! Check your email or visit {{quote_link}} to review.',
  },
  thank_you: {
    name: 'Thank You',
    message: 'Thank you for choosing {{restaurant_name}} for your event! We hope your guests enjoyed the meal. Share feedback: {{feedback_link}}',
  },
};

/**
 * Replace placeholders in SMS template
 */
export function replaceSMSPlaceholders(
  template: string,
  data: Record<string, any>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  return e164Regex.test(cleanPhone);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code
    return `+1 (${cleaned.substr(1, 3)}) ${cleaned.substr(4, 3)}-${cleaned.substr(7)}`;
  } else if (cleaned.length === 10) {
    // US number without country code
    return `(${cleaned.substr(0, 3)}) ${cleaned.substr(3, 3)}-${cleaned.substr(6)}`;
  }
  
  return phone; // Return as-is if not a standard US format
}
