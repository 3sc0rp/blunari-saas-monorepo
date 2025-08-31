export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'confirmation' | 'reminder' | 'promotion' | 'update' | 'custom';
  variables: string[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'staff' | 'customer' | 'system';
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'template';
  template_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  read_at?: string;
}

export interface Conversation {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_avatar?: string;
  subject: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'active' | 'archived' | 'draft';
  participants: {
    id: string;
    name: string;
    type: 'staff' | 'customer';
    avatar?: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface MessageComposer {
  to: string;
  subject: string;
  content: string;
  template_id?: string;
  scheduled_at?: string;
}