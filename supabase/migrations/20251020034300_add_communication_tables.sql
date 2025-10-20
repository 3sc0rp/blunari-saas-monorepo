-- Migration: Add communication system tables for catering management
-- Created: 2025-10-20
-- Purpose: Enable in-app messaging, email templates, and SMS history

-- ============================================================================
-- Table: catering_messages
-- Purpose: Store in-app messages between staff and customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS catering_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catering_orders(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  thread_id UUID, -- For grouping conversations
  reply_to_id UUID REFERENCES catering_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_catering_messages_tenant_id ON catering_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_catering_messages_order_id ON catering_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_catering_messages_thread_id ON catering_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_catering_messages_is_read ON catering_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_catering_messages_created_at ON catering_messages(created_at DESC);

-- RLS Policies for catering_messages
ALTER TABLE catering_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for catering messages"
  ON catering_messages
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Users can insert their own messages"
  ON catering_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- ============================================================================
-- Table: email_templates
-- Purpose: Store reusable email templates with placeholders
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  placeholders TEXT[], -- Array of placeholder names: ['customer_name', 'event_date', etc.]
  category TEXT NOT NULL, -- 'confirmation', 'quote', 'reminder', 'thank_you', 'custom'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System-provided templates
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- RLS Policies for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for email templates"
  ON email_templates
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- ============================================================================
-- Table: sms_history
-- Purpose: Track SMS messages sent via Twilio integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catering_orders(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  error_message TEXT,
  twilio_sid TEXT UNIQUE, -- Twilio message SID for tracking
  twilio_status TEXT, -- Twilio's delivery status
  segments INTEGER DEFAULT 1, -- Number of SMS segments (160 chars each)
  cost_cents INTEGER, -- Cost in cents
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for sms_history
CREATE INDEX IF NOT EXISTS idx_sms_history_tenant_id ON sms_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_history_order_id ON sms_history(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_history_status ON sms_history(status);
CREATE INDEX IF NOT EXISTS idx_sms_history_twilio_sid ON sms_history(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_history_created_at ON sms_history(created_at DESC);

-- RLS Policies for sms_history
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for sms history"
  ON sms_history
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- ============================================================================
-- Function: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_catering_messages_updated_at
  BEFORE UPDATE ON catering_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_history_updated_at
  BEFORE UPDATE ON sms_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed: Default Email Templates
-- ============================================================================

-- Note: These will be inserted with tenant_id from the application
-- This is a reference for the default templates that should be created

-- Template 1: Order Confirmation
-- category: 'confirmation'
-- subject: 'Your Catering Order Confirmation - {{order_number}}'
-- placeholders: ['customer_name', 'order_number', 'event_date', 'event_time', 'package_name', 'guest_count', 'total_amount', 'restaurant_name']

-- Template 2: Quote Sent
-- category: 'quote'
-- subject: 'Your Catering Quote from {{restaurant_name}}'
-- placeholders: ['customer_name', 'event_date', 'package_name', 'guest_count', 'total_amount', 'quote_expires_date', 'restaurant_name', 'contact_phone']

-- Template 3: Event Reminder
-- category: 'reminder'
-- subject: 'Reminder: Your Event Tomorrow - {{event_name}}'
-- placeholders: ['customer_name', 'event_name', 'event_date', 'event_time', 'venue_address', 'package_name', 'guest_count', 'restaurant_name', 'contact_phone']

-- Template 4: Payment Reminder
-- category: 'reminder'
-- subject: 'Payment Reminder for {{event_name}}'
-- placeholders: ['customer_name', 'event_name', 'event_date', 'total_amount', 'amount_due', 'payment_link', 'restaurant_name']

-- Template 5: Thank You & Feedback
-- category: 'thank_you'
-- subject: 'Thank You for Choosing {{restaurant_name}}!'
-- placeholders: ['customer_name', 'event_name', 'event_date', 'restaurant_name', 'feedback_link', 'review_link']

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE catering_messages IS 'In-app messages between staff and customers for catering orders';
COMMENT ON TABLE email_templates IS 'Reusable email templates with placeholder support for automated communications';
COMMENT ON TABLE sms_history IS 'SMS message history with Twilio integration for delivery tracking';

COMMENT ON COLUMN catering_messages.thread_id IS 'Groups messages into conversation threads';
COMMENT ON COLUMN catering_messages.reply_to_id IS 'References the message being replied to';
COMMENT ON COLUMN email_templates.placeholders IS 'Array of placeholder variables used in template (e.g., customer_name, event_date)';
COMMENT ON COLUMN email_templates.is_default IS 'System-provided templates that cannot be deleted';
COMMENT ON COLUMN sms_history.segments IS 'Number of 160-character SMS segments (affects cost)';
COMMENT ON COLUMN sms_history.twilio_sid IS 'Twilio message SID for delivery tracking and status updates';
