import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Clock,
  User,
  Mail,
  Phone,
  Building,
  Send,
  Eye,
  EyeOff,
  UserCheck,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SupportTicketDetailProps {
  ticketId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface TicketMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string;
  sender_email?: string;
  message_type: string;
  is_internal: boolean;
  created_at: string;
  metadata: any;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  category: {
    name: string;
    color: string;
  };
  tenant?: {
    name: string;
    slug: string;
  };
  assignee?: {
    id: string;
    user_id: string;
  };
}

export const SupportTicketDetail: React.FC<SupportTicketDetailProps> = ({
  ticketId,
  open,
  onClose,
  onUpdate,
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const loadTicketDetail = async () => {
    try {
      setLoading(true);

      // Try to load ticket details using admin function first
      let ticketData;
      try {
        const { data: allTickets, error: rpcError } = await supabase
          .rpc('get_all_support_tickets_admin' as any);
        
        if (rpcError) throw rpcError;
        
        // Find the specific ticket
        ticketData = allTickets?.find((t: any) => t.id === ticketId);
        
        if (!ticketData) {
          throw new Error('Ticket not found');
        }
        
        console.log("Loaded ticket via admin RPC:", ticketData);
      } catch {
        // Fallback to direct query
        console.log("Using direct query fallback for ticket detail...");
        const { data: directTicketData, error: ticketError } = await supabase
          .from("support_tickets")
          .select(
            `
            *,
            category:support_categories!category_id(name, color),
            tenant:tenants!tenant_id(name, slug),
            assignee:employees!assigned_to(id, user_id)
          `,
          )
          .eq("id", ticketId)
          .single();

        if (ticketError) throw ticketError;
        ticketData = directTicketData;
      }

      setTicket(ticketData);
      setNewStatus(ticketData.status);
      setNewPriority(ticketData.priority);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);
    } catch (error) {
      console.error("Error loading ticket detail:", error);
      toast({
        title: "Error",
        description: "Failed to load ticket details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ticketId) {
      loadTicketDetail();
    }
  }, [open, ticketId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);

      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticketId,
        sender_type: "agent",
        sender_name: user.email?.split("@")[0] || "Agent",
        sender_email: user.email,
        content: newMessage,
        is_internal: isInternal,
        message_type: "message",
      });

      if (error) throw error;

      // Update ticket's updated_at timestamp
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      setNewMessage("");
      setIsInternal(false);
      loadTicketDetail();
      onUpdate();

      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async () => {
    if (
      !ticket ||
      (newStatus === ticket.status && newPriority === ticket.priority)
    )
      return;

    try {
      const updates: any = { updated_at: new Date().toISOString() };

      if (newStatus !== ticket.status) {
        updates.status = newStatus;
        if (newStatus === "resolved") {
          updates.resolved_at = new Date().toISOString();
        } else if (newStatus === "closed") {
          updates.closed_at = new Date().toISOString();
        }
      }

      if (newPriority !== ticket.priority) {
        updates.priority = newPriority;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Add system message for status/priority changes
      if (newStatus !== ticket.status || newPriority !== ticket.priority) {
        const changes = [];
        if (newStatus !== ticket.status) changes.push(`status to ${newStatus}`);
        if (newPriority !== ticket.priority)
          changes.push(`priority to ${newPriority}`);

        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticketId,
          sender_type: "system",
          sender_name: "System",
          content: `Updated ${changes.join(" and ")}`,
          is_internal: false,
          message_type: "status_change",
        });
      }

      loadTicketDetail();
      onUpdate();

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageIcon = (message: TicketMessage) => {
    if (message.sender_type === "system")
      return <Clock className="h-4 w-4 text-blue-500" />;
    if (message.sender_type === "agent")
      return <UserCheck className="h-4 w-4 text-green-500" />;
    return <User className="h-4 w-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Loading Ticket Details</DialogTitle>
            <DialogDescription>Please wait while we load the ticket information.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <span>{ticket.subject}</span>
          </DialogTitle>
          <DialogDescription>
            Support ticket details, messages, and management options.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Ticket Info */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    ticket.priority === "urgent" ? "destructive" : "secondary"
                  }
                >
                  {ticket.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {ticket.status.replace("_", " ").toUpperCase()}
                </Badge>
                {ticket.category && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: ticket.category.color }}
                  >
                    {ticket.category.name}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {ticket.description}
              </p>
            </div>

            <Separator className="mb-4" />

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <h3 className="font-semibold mb-4">Conversation</h3>
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(message.created_at)}
                          </span>
                          {message.is_internal && (
                            <Badge variant="outline" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`text-sm p-3 rounded-lg ${
                            message.is_internal
                              ? "bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                              : "bg-muted"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Reply Section */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="reply" className="text-sm font-medium">
                  Reply
                </Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  <EyeOff className="h-3 w-3" />
                  Internal note
                </label>
              </div>
              <Textarea
                id="reply"
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Customer Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Customer Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.contact_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.contact_email}</span>
                </div>
                {ticket.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{ticket.contact_phone}</span>
                  </div>
                )}
                {ticket.tenant && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{ticket.tenant.name}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Ticket Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Ticket Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Created
                  </Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Last Updated
                  </Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(ticket.updated_at)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Actions</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_customer">
                        Waiting Customer
                      </SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Priority
                  </Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newStatus !== ticket.status ||
                  newPriority !== ticket.priority) && (
                  <Button onClick={updateTicketStatus} className="w-full">
                    Update Ticket
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
