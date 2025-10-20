import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCateringMessages } from '@/hooks/useCateringMessages';
import { toast } from 'sonner';
import {
  Mail,
  MailOpen,
  Search,
  Filter,
  Plus,
  Archive,
  Trash2,
  Reply,
  Clock,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InboxPanelProps {
  tenantId: string;
}

/**
 * InboxPanel Component
 * 
 * In-app messaging dashboard for catering management.
 * Features:
 * - Message list with threads
 * - Unread count badge
 * - Filter by: All, Unread, Archived
 * - Search messages
 * - Compose new message
 * - Reply to thread
 * - Mark as read/unread
 * - Archive messages
 */
export function InboxPanel({ tenantId }: InboxPanelProps) {
  const [view, setView] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    recipientEmail: '',
    subject: '',
    body: '',
  });

  // Fetch messages with filters
  const filters = useMemo(() => ({
    unreadOnly: view === 'unread',
    archived: view === 'archived',
    searchTerm: searchTerm || undefined,
  }), [view, searchTerm]);

  const {
    messages,
    messageThreads,
    unreadCount,
    isLoading,
    createMessage,
    markAsRead,
    markAsUnread,
    archiveMessage,
    deleteMessage,
    isCreating,
  } = useCateringMessages(tenantId, filters);

  // Get selected message details
  const selectedMessageData = messages.find(m => m.id === selectedMessage);

  // Handle message selection
  const handleSelectMessage = (messageId: string) => {
    setSelectedMessage(messageId);
    const message = messages.find(m => m.id === messageId);
    if (message && !message.is_read) {
      markAsRead(messageId);
    }
  };

  // Handle compose new message
  const handleCompose = () => {
    setReplyTo(null);
    setComposeForm({
      recipientEmail: '',
      subject: '',
      body: '',
    });
    setShowComposeDialog(true);
  };

  // Handle reply to message
  const handleReply = (message: any) => {
    setReplyTo(message.id);
    setComposeForm({
      recipientEmail: message.sender_email,
      subject: `Re: ${message.subject}`,
      body: '',
    });
    setShowComposeDialog(true);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!composeForm.recipientEmail || !composeForm.subject || !composeForm.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Get current user info (this would come from auth context in real implementation)
    const senderName = 'Staff Member'; // Placeholder
    const senderEmail = 'staff@restaurant.com'; // Placeholder

    createMessage({
      sender_name: senderName,
      sender_email: senderEmail,
      recipient_email: composeForm.recipientEmail,
      subject: composeForm.subject,
      body: composeForm.body,
      reply_to_id: replyTo || undefined,
      thread_id: replyTo ? selectedMessageData?.thread_id || replyTo : undefined,
    });

    setShowComposeDialog(false);
    setComposeForm({ recipientEmail: '', subject: '', body: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Inbox
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                In-app messages for catering orders
              </CardDescription>
            </div>
            <Button onClick={handleCompose}>
              <Plus className="w-4 h-4 mr-2" />
              Compose
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleSelectMessage(message.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMessage === message.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted border border-transparent'
                      } ${!message.is_read ? 'font-semibold' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {!message.is_read ? (
                            <Mail className="w-4 h-4 text-primary" />
                          ) : (
                            <MailOpen className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm truncate max-w-[150px]">
                            {message.sender_email}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mb-1">
                        {message.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {message.body.substring(0, 60)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Message Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessageData ? (
              <div>
                {/* Message Header */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {selectedMessageData.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {selectedMessageData.sender_name} ({selectedMessageData.sender_email})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(selectedMessageData.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReply(selectedMessageData)}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveMessage({ 
                          messageId: selectedMessageData.id, 
                          archived: !selectedMessageData.is_archived 
                        })}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {selectedMessageData.is_archived ? 'Unarchive' : 'Archive'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMessage(selectedMessageData.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <ScrollArea className="h-[450px]">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessageData.body}</p>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[550px] text-muted-foreground">
                <Mail className="w-16 h-16 mb-4 opacity-50" />
                <p>Select a message to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{replyTo ? 'Reply to Message' : 'Compose New Message'}</DialogTitle>
            <DialogDescription>
              Send a message to a customer about their catering order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email *</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="customer@example.com"
                value={composeForm.recipientEmail}
                onChange={(e) => setComposeForm({ ...composeForm, recipientEmail: e.target.value })}
                disabled={!!replyTo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Message subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Type your message here..."
                value={composeForm.body}
                onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={isCreating}>
              {isCreating ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
