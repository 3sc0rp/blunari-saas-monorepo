import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CateringMessage {
  id: string;
  tenant_id: string;
  order_id?: string;
  sender_id?: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_archived: boolean;
  thread_id?: string;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
}

interface NewMessage {
  order_id?: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  thread_id?: string;
  reply_to_id?: string;
}

interface MessageFilters {
  unreadOnly?: boolean;
  archived?: boolean;
  orderId?: string;
  searchTerm?: string;
}

/**
 * Hook for managing catering messages
 * 
 * Provides functionality for:
 * - Fetching messages with filters
 * - Creating new messages
 * - Marking messages as read/unread
 * - Archiving messages
 * - Grouping messages by thread
 */
export function useCateringMessages(tenantId: string, filters?: MessageFilters) {
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['catering-messages', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('catering_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.unreadOnly) {
        query = query.eq('is_read', false);
      }
      if (filters?.archived !== undefined) {
        query = query.eq('is_archived', filters.archived);
      }
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter in memory (for subject/body search)
      let filteredData = data || [];
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (msg) =>
            msg.subject.toLowerCase().includes(term) ||
            msg.body.toLowerCase().includes(term) ||
            msg.sender_email.toLowerCase().includes(term) ||
            msg.recipient_email.toLowerCase().includes(term)
        );
      }

      return filteredData as CateringMessage[];
    },
    enabled: !!tenantId,
  });

  // Get unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['catering-messages-unread-count', tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('catering_messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
  });

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (newMessage: NewMessage) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('catering_messages')
        .insert({
          ...newMessage,
          tenant_id: tenantId,
          sender_id: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-messages', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['catering-messages-unread-count', tenantId] });
      toast.success('Message sent successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('catering_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-messages', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['catering-messages-unread-count', tenantId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to mark as read: ${error.message}`);
    },
  });

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('catering_messages')
        .update({ is_read: false })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-messages', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['catering-messages-unread-count', tenantId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to mark as unread: ${error.message}`);
    },
  });

  // Archive message mutation
  const archiveMessageMutation = useMutation({
    mutationFn: async ({ messageId, archived }: { messageId: string; archived: boolean }) => {
      const { error } = await supabase
        .from('catering_messages')
        .update({ is_archived: archived })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-messages', tenantId] });
      toast.success('Message archived');
    },
    onError: (error: any) => {
      toast.error(`Failed to archive message: ${error.message}`);
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('catering_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-messages', tenantId] });
      toast.success('Message deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });

  // Group messages by thread
  const messageThreads = messages?.reduce((threads, message) => {
    const threadId = message.thread_id || message.id;
    if (!threads[threadId]) {
      threads[threadId] = [];
    }
    threads[threadId].push(message);
    return threads;
  }, {} as Record<string, CateringMessage[]>);

  return {
    messages: messages || [],
    messageThreads: messageThreads || {},
    unreadCount,
    isLoading,
    error,
    createMessage: createMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    markAsUnread: markAsUnreadMutation.mutate,
    archiveMessage: archiveMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    isCreating: createMessageMutation.isPending,
  };
}
