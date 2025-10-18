-- Create support categories table
CREATE TABLE public.support_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  priority_level INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
  auto_assign_team TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID, -- References auth.users but no FK constraint
  category_id UUID REFERENCES public.support_categories(id),
  assigned_to UUID REFERENCES public.employees(id),
  
  -- Ticket details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  
  -- Contact info
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'email', 'phone', 'chat')),
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- SLA tracking
  due_at TIMESTAMP WITH TIME ZONE,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalation_level INTEGER DEFAULT 0
);

-- Create support ticket messages table for communication
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_id UUID, -- employee_id for agents, user_id for customers
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  
  message_type TEXT DEFAULT 'message' CHECK (message_type IN ('message', 'note', 'status_change', 'assignment')),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customer
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support attachments table
CREATE TABLE public.support_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  
  filename TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  file_path TEXT NOT NULL, -- Storage path
  
  uploaded_by UUID, -- employee_id or user_id
  uploaded_by_type TEXT CHECK (uploaded_by_type IN ('customer', 'agent')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default support categories
INSERT INTO public.support_categories (name, description, color, priority_level) VALUES
  ('Technical Issues', 'System bugs, integration problems, platform errors', '#EF4444', 1),
  ('Account & Billing', 'Payment issues, subscription questions, account changes', '#F59E0B', 2),
  ('Feature Requests', 'New feature suggestions and enhancement requests', '#10B981', 3),
  ('Training & Support', 'How-to questions and training requests', '#3B82F6', 3),
  ('Integration Help', 'POS system setup and integration assistance', '#8B5CF6', 2),
  ('General Inquiry', 'General questions and other topics', '#6B7280', 3);

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_created_at ON public.support_ticket_messages(created_at);

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SUP-' || to_char(now(), 'YYYYMMDD') || '-' || 
         lpad(floor(random() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = NEW.ticket_number) LOOP
      NEW.ticket_number := generate_ticket_number();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Create trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_categories_updated_at
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_categories
CREATE POLICY "Anyone can view support categories" ON public.support_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage support categories" ON public.support_categories
  FOR ALL USING (has_employee_role('ADMIN'::employee_role));

-- RLS Policies for support_tickets
CREATE POLICY "Support staff can view all tickets" ON public.support_tickets
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Support staff can manage tickets" ON public.support_tickets
  FOR ALL USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Tenants can view their own tickets" ON public.support_tickets
  FOR SELECT USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id() OR auth.uid() = user_id);

-- RLS Policies for support_ticket_messages
CREATE POLICY "Support staff can view all messages" ON public.support_ticket_messages
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Support staff can create messages" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Tenants can view non-internal messages for their tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    NOT is_internal AND 
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.tenant_id = get_current_user_tenant_id()
    )
  );

CREATE POLICY "Users can create messages for their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND (st.tenant_id = get_current_user_tenant_id() OR st.user_id = auth.uid())
    )
  );

-- RLS Policies for support_attachments
CREATE POLICY "Support staff can view all attachments" ON public.support_attachments
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Support staff can manage attachments" ON public.support_attachments
  FOR ALL USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Tenants can view attachments for their tickets" ON public.support_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.tenant_id = get_current_user_tenant_id()
    )
  );