import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTenant } from '@/hooks/useTenant';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { SkeletonMessagesDashboard } from '@/components/ui/skeleton-dashboard';
import { InboxList } from '@/components/messages/InboxList';
import { ConversationPane } from '@/components/messages/ConversationPane';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { NewConversationDialog } from '@/components/messages/NewConversationDialog';
import { Conversation, Message, MessageTemplate } from '@/types/messages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MessageSquare, Users, Clock } from 'lucide-react';
import { toast } from '@/lib/toast';

const Messages: React.FC = () => {
  const { tenant } = useTenant();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Sample data - replace with real API calls
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      customer_id: 'cust_1',
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah.johnson@email.com',
      customer_phone: '+1 (555) 123-4567',
      customer_avatar: '',
      subject: 'Reservation Inquiry',
      last_message: 'Hi, I would like to make a reservation for tonight at 7 PM for 4 people.',
      last_message_at: '2024-01-15T14:30:00Z',
      unread_count: 2,
      status: 'active',
      participants: [
        { id: 'cust_1', name: 'Sarah Johnson', type: 'customer' },
        { id: 'staff_1', name: 'You', type: 'staff' }
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z'
    },
    {
      id: '2',
      customer_id: 'cust_2',
      customer_name: 'Mike Chen',
      customer_email: 'mike.chen@email.com',
      customer_phone: '+1 (555) 987-6543',
      customer_avatar: '',
      subject: 'Special Dietary Requirements',
      last_message: 'Thank you for accommodating our gluten-free request!',
      last_message_at: '2024-01-15T13:45:00Z',
      unread_count: 0,
      status: 'active',
      participants: [
        { id: 'cust_2', name: 'Mike Chen', type: 'customer' },
        { id: 'staff_1', name: 'You', type: 'staff' }
      ],
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T13:45:00Z'
    },
    {
      id: '3',
      customer_id: 'cust_3',
      customer_name: 'Emma Rodriguez',
      customer_email: 'emma.r@email.com',
      customer_avatar: '',
      subject: 'Birthday Celebration',
      last_message: 'Can you help us organize a surprise birthday dinner?',
      last_message_at: '2024-01-15T12:15:00Z',
      unread_count: 1,
      status: 'active',
      participants: [
        { id: 'cust_3', name: 'Emma Rodriguez', type: 'customer' },
        { id: 'staff_1', name: 'You', type: 'staff' }
      ],
      created_at: '2024-01-15T08:30:00Z',
      updated_at: '2024-01-15T12:15:00Z'
    }
  ]);

  const [messages] = useState<Message[]>([
    {
      id: 'msg_1',
      conversation_id: '1',
      sender_id: 'cust_1',
      sender_type: 'customer',
      sender_name: 'Sarah Johnson',
      content: 'Hi, I would like to make a reservation for tonight at 7 PM for 4 people.',
      message_type: 'text',
      status: 'read',
      created_at: '2024-01-15T14:30:00Z'
    },
    {
      id: 'msg_2',
      conversation_id: '1',
      sender_id: 'cust_1',
      sender_type: 'customer',
      sender_name: 'Sarah Johnson',
      content: 'Do you have any tables available by the window?',
      message_type: 'text',
      status: 'delivered',
      created_at: '2024-01-15T14:32:00Z'
    },
    {
      id: 'msg_3',
      conversation_id: '2',
      sender_id: 'cust_2',
      sender_type: 'customer',
      sender_name: 'Mike Chen',
      content: 'Hi, we have a dinner reservation tomorrow but one of our guests has celiac disease. Can you accommodate gluten-free options?',
      message_type: 'text',
      status: 'read',
      created_at: '2024-01-15T13:00:00Z'
    },
    {
      id: 'msg_4',
      conversation_id: '2',
      sender_id: 'staff_1',
      sender_type: 'staff',
      sender_name: 'Restaurant Staff',
      content: 'Absolutely! We have several gluten-free options available. I\'ll make sure to note this on your reservation and our chef will be informed.',
      message_type: 'text',
      status: 'read',
      created_at: '2024-01-15T13:15:00Z'
    },
    {
      id: 'msg_5',
      conversation_id: '2',
      sender_id: 'cust_2',
      sender_type: 'customer',
      sender_name: 'Mike Chen',
      content: 'Thank you for accommodating our gluten-free request!',
      message_type: 'text',
      status: 'read',
      created_at: '2024-01-15T13:45:00Z'
    }
  ]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversation(id);
  }, []);

  const handleArchiveConversation = useCallback((id: string) => {
    toast.success('Conversation archived');
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    toast.success('Message sent');
  }, []);

  const handleNewConversation = useCallback((data: { to: string; subject: string; content: string; templateId?: string }) => {
    toast.success('New conversation started');
    setShowNewConversation(false);
  }, []);

  const currentConversation = conversations.find(c => c.id === selectedConversation);
  const conversationMessages = messages.filter(m => m.conversation_id === selectedConversation);

  // Loading state
  if (isLoading) {
    return <SkeletonMessagesDashboard />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          variant="server-error"
          title="Failed to load messages"
          description="We encountered an error while loading your messages. Please try again."
          error={error}
          action={{
            label: "Retry",
            onClick: () => window.location.reload()
          }}
        />
      </div>
    );
  }

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-5rem)] flex flex-col gap-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-text">Messages</h1>
          <p className="text-body-sm text-text-muted">
            Manage customer conversations and inquiries
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-body-sm">
            <MessageSquare className="h-4 w-4 text-brand" />
            <span className="text-text-muted">{conversations.length} conversations</span>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 text-body-sm">
              <div className="w-2 h-2 bg-brand rounded-full" />
              <span className="text-text font-medium">{totalUnread} unread</span>
            </div>
          )}
          <Button onClick={() => setShowNewConversation(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* Inbox List */}
        <div className={isMobile && selectedConversation ? 'hidden' : 'block'}>
          <InboxList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onArchiveConversation={handleArchiveConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Conversation View */}
        <div className={`col-span-2 flex flex-col gap-4 ${!selectedConversation && !isMobile ? 'lg:flex' : selectedConversation ? 'flex' : 'hidden'}`}>
          {selectedConversation && currentConversation ? (
            <>
              <ConversationPane
                conversation={currentConversation}
                messages={conversationMessages}
                currentUserId="staff_1"
              />
              <MessageComposer
                onSendMessage={handleSendMessage}
              />
            </>
          ) : (
            <Card className="h-full bg-surface border-surface-2">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="h-8 w-8 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-h4 font-semibold text-text mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-body-sm text-text-muted max-w-sm">
                      Choose a conversation from the list to view messages and respond to customers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onCreateConversation={handleNewConversation}
      />
    </motion.div>
  );
};

export default Messages;