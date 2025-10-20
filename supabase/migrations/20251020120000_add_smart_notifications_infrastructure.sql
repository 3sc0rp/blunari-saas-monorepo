-- Week 17-18: Smart Notifications Infrastructure
-- Complete multi-channel notification system with intelligent routing
-- Author: AI Agent
-- Date: October 20, 2025

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'push',
  'in_app',
  'webhook'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'read'
);

CREATE TYPE notification_category AS ENUM (
  'system',
  'booking',
  'payment',
  'marketing',
  'alert',
  'reminder',
  'update',
  'social'
);

-- =====================================================
-- TABLE: notification_channels
-- Purpose: Define available notification channels per tenant
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  
  -- Channel-specific configuration (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',
  -- For email: { smtp_host, smtp_port, from_address, from_name }
  -- For sms: { provider, api_key, sender_id }
  -- For push: { fcm_server_key, vapid_public_key }
  -- For webhook: { url, headers, method }
  
  -- Rate limiting
  max_sends_per_hour INTEGER,
  max_sends_per_day INTEGER,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,
  last_reset_hour TIMESTAMPTZ DEFAULT NOW(),
  last_reset_day TIMESTAMPTZ DEFAULT NOW(),
  
  -- Statistics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, channel)
);

-- Indexes
CREATE INDEX idx_notification_channels_tenant ON notification_channels(tenant_id);
CREATE INDEX idx_notification_channels_enabled ON notification_channels(tenant_id, is_enabled);

-- RLS Policies
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for notification_channels"
  ON notification_channels
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- =====================================================
-- TABLE: notification_preferences
-- Purpose: User-level notification preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Global preferences
  is_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  
  -- Channel preferences (JSONB for flexibility)
  channel_preferences JSONB NOT NULL DEFAULT '{
    "email": {"enabled": true, "categories": ["system", "booking", "payment"]},
    "sms": {"enabled": true, "categories": ["booking", "alert"]},
    "push": {"enabled": true, "categories": ["booking", "alert", "reminder"]},
    "in_app": {"enabled": true, "categories": ["system", "booking", "payment", "update"]}
  }',
  
  -- Category preferences (which categories to receive)
  category_preferences JSONB NOT NULL DEFAULT '{
    "system": {"enabled": true, "priority_threshold": "normal"},
    "booking": {"enabled": true, "priority_threshold": "normal"},
    "payment": {"enabled": true, "priority_threshold": "normal"},
    "marketing": {"enabled": false, "priority_threshold": "normal"},
    "alert": {"enabled": true, "priority_threshold": "low"},
    "reminder": {"enabled": true, "priority_threshold": "normal"},
    "update": {"enabled": true, "priority_threshold": "normal"},
    "social": {"enabled": false, "priority_threshold": "normal"}
  }',
  
  -- Digest preferences
  enable_digest BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily', -- daily, weekly, never
  digest_time TIME DEFAULT '09:00:00',
  digest_day_of_week INTEGER, -- 0-6 for weekly digest
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_digest ON notification_preferences(tenant_id, enable_digest, digest_frequency);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- TABLE: notification_templates
-- Purpose: Reusable notification templates
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system templates
  name TEXT NOT NULL,
  description TEXT,
  category notification_category NOT NULL,
  
  -- Template content per channel (JSONB for multi-channel support)
  templates JSONB NOT NULL,
  -- {
  --   "email": {
  --     "subject": "Order Confirmation - {{order_number}}",
  --     "html": "<html>...",
  --     "text": "Plain text version..."
  --   },
  --   "sms": {
  --     "body": "Your order {{order_number}} is confirmed"
  --   },
  --   "push": {
  --     "title": "Order Confirmed",
  --     "body": "Order {{order_number}} confirmed"
  --   }
  -- }
  
  -- Variable definitions for validation
  variables JSONB NOT NULL DEFAULT '[]',
  -- [{"name": "order_number", "type": "string", "required": true}]
  
  -- Metadata
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_template_name_per_tenant UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_system ON notification_templates(is_system_template, is_active);

-- RLS Policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for notification_templates"
  ON notification_templates
  FOR ALL
  USING (
    tenant_id IS NULL OR -- System templates readable by all
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Only tenant can modify own templates"
  ON notification_templates
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Cannot modify system templates"
  ON notification_templates
  FOR UPDATE
  USING (NOT is_system_template);

-- =====================================================
-- TABLE: notification_groups
-- Purpose: Group notifications for digest delivery
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Group details
  name TEXT NOT NULL,
  category notification_category,
  
  -- Digest configuration
  digest_frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly
  next_digest_at TIMESTAMPTZ NOT NULL,
  last_digest_sent_at TIMESTAMPTZ,
  
  -- Statistics
  notification_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_groups_tenant ON notification_groups(tenant_id);
CREATE INDEX idx_notification_groups_user ON notification_groups(user_id);
CREATE INDEX idx_notification_groups_digest ON notification_groups(next_digest_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification groups"
  ON notification_groups
  FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- TABLE: notifications
-- Purpose: Core notification records
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Recipients
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_device_token TEXT, -- For push notifications
  
  -- Notification details
  category notification_category NOT NULL,
  priority notification_priority DEFAULT 'normal',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Optional rich content
  data JSONB DEFAULT '{}', -- Custom data payload
  action_url TEXT, -- Deep link or action URL
  image_url TEXT,
  
  -- Template reference
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_variables JSONB, -- Variables used to render template
  
  -- Delivery configuration
  channels notification_channel[] NOT NULL, -- Array of channels to use
  channel_priority JSONB, -- {"primary": ["push", "in_app"], "fallback": ["email", "sms"]}
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ, -- NULL for immediate send
  expires_at TIMESTAMPTZ, -- Don't send after this time
  
  -- Grouping for digest
  group_id UUID REFERENCES notification_groups(id) ON DELETE SET NULL,
  is_digest_eligible BOOLEAN DEFAULT true,
  
  -- Status tracking
  status notification_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_recipient CHECK (
    user_id IS NOT NULL OR 
    recipient_email IS NOT NULL OR 
    recipient_phone IS NOT NULL OR
    recipient_device_token IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_notifications_priority ON notifications(tenant_id, priority, created_at);
CREATE INDEX idx_notifications_category ON notifications(tenant_id, category);
CREATE INDEX idx_notifications_group ON notifications(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Tenant can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TABLE: notification_deliveries
-- Purpose: Track delivery attempts per channel
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel notification_channel NOT NULL,
  status notification_status NOT NULL,
  
  -- Tracking IDs from external services
  external_id TEXT, -- Message ID from email provider, SMS provider, etc.
  
  -- Delivery metadata
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Cost tracking (optional)
  cost_amount DECIMAL(10, 6),
  cost_currency TEXT DEFAULT 'USD',
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Provider-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_deliveries_notification ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_tenant ON notification_deliveries(tenant_id);
CREATE INDEX idx_notification_deliveries_channel ON notification_deliveries(tenant_id, channel);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_external ON notification_deliveries(external_id);

-- RLS Policies
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for notification_deliveries"
  ON notification_deliveries
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS notification_preferences AS $$
DECLARE
  v_prefs notification_preferences;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
  
  -- Create default preferences if not exists
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (tenant_id, user_id)
    VALUES (p_tenant_id, p_user_id)
    RETURNING * INTO v_prefs;
  END IF;
  
  RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if channel is enabled for user
CREATE OR REPLACE FUNCTION is_channel_enabled_for_user(
  p_user_id UUID,
  p_tenant_id UUID,
  p_channel notification_channel,
  p_category notification_category,
  p_priority notification_priority
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences;
  v_channel_pref JSONB;
  v_category_pref JSONB;
  v_priority_threshold TEXT;
BEGIN
  -- Get user preferences
  v_prefs := get_user_notification_preferences(p_user_id, p_tenant_id);
  
  -- Check global enabled
  IF NOT v_prefs.is_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check channel preferences
  v_channel_pref := v_prefs.channel_preferences->p_channel::text;
  IF v_channel_pref IS NULL OR NOT (v_channel_pref->>'enabled')::boolean THEN
    RETURN FALSE;
  END IF;
  
  -- Check if category is enabled for this channel
  IF NOT (v_channel_pref->'categories' ? p_category::text) THEN
    RETURN FALSE;
  END IF;
  
  -- Check category preferences
  v_category_pref := v_prefs.category_preferences->p_category::text;
  IF v_category_pref IS NULL OR NOT (v_category_pref->>'enabled')::boolean THEN
    RETURN FALSE;
  END IF;
  
  -- Check priority threshold
  v_priority_threshold := v_category_pref->>'priority_threshold';
  IF p_priority::text = 'low' AND v_priority_threshold != 'low' THEN
    RETURN FALSE;
  END IF;
  IF p_priority::text = 'normal' AND v_priority_threshold = 'high' THEN
    RETURN FALSE;
  END IF;
  IF p_priority::text = 'normal' AND v_priority_threshold = 'urgent' THEN
    RETURN FALSE;
  END IF;
  IF p_priority::text = 'high' AND v_priority_threshold = 'urgent' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences;
  v_current_time TIME;
BEGIN
  v_prefs := get_user_notification_preferences(p_user_id, p_tenant_id);
  
  -- No quiet hours set
  IF v_prefs.quiet_hours_start IS NULL OR v_prefs.quiet_hours_end IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current time in user's timezone
  v_current_time := (NOW() AT TIME ZONE v_prefs.timezone)::TIME;
  
  -- Check if current time is within quiet hours
  IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
    -- Normal case: quiet hours within same day (e.g., 22:00 to 08:00)
    RETURN v_current_time >= v_prefs.quiet_hours_start 
       AND v_current_time <= v_prefs.quiet_hours_end;
  ELSE
    -- Overnight case: quiet hours span midnight (e.g., 22:00 to 08:00)
    RETURN v_current_time >= v_prefs.quiet_hours_start 
        OR v_current_time <= v_prefs.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get pending notifications for processing
CREATE OR REPLACE FUNCTION get_pending_notifications(
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF notifications AS $$
BEGIN
  RETURN QUERY
  SELECT n.*
  FROM notifications n
  WHERE n.status = 'pending'
    AND (n.scheduled_at IS NULL OR n.scheduled_at <= NOW())
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
  ORDER BY n.priority DESC, n.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_notifications BIGINT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_read BIGINT,
  delivery_rate NUMERIC,
  read_rate NUMERIC,
  avg_delivery_time_seconds NUMERIC,
  by_channel JSONB,
  by_category JSONB,
  by_priority JSONB
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as sent,
      COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'read') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as failed,
      COUNT(*) FILTER (WHERE status = 'read') as read_count,
      AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) FILTER (WHERE delivered_at IS NOT NULL) as avg_delivery_seconds
    FROM notifications
    WHERE tenant_id = p_tenant_id
      AND created_at >= v_start_date
  ),
  channel_stats AS (
    SELECT jsonb_object_agg(
      channel::text,
      jsonb_build_object(
        'total', count,
        'delivered', delivered_count,
        'failed', failed_count
      )
    ) as channel_data
    FROM (
      SELECT 
        nd.channel,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE nd.status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE nd.status = 'failed') as failed_count
      FROM notification_deliveries nd
      WHERE nd.tenant_id = p_tenant_id
        AND nd.created_at >= v_start_date
      GROUP BY nd.channel
    ) channel_counts
  ),
  category_stats AS (
    SELECT jsonb_object_agg(
      category::text,
      count
    ) as category_data
    FROM (
      SELECT category, COUNT(*) as count
      FROM notifications
      WHERE tenant_id = p_tenant_id
        AND created_at >= v_start_date
      GROUP BY category
    ) category_counts
  ),
  priority_stats AS (
    SELECT jsonb_object_agg(
      priority::text,
      count
    ) as priority_data
    FROM (
      SELECT priority, COUNT(*) as count
      FROM notifications
      WHERE tenant_id = p_tenant_id
        AND created_at >= v_start_date
      GROUP BY priority
    ) priority_counts
  )
  SELECT 
    s.total,
    s.sent,
    s.delivered,
    s.failed,
    s.read_count,
    ROUND((s.delivered::NUMERIC / NULLIF(s.sent, 0)) * 100, 2) as delivery_rate,
    ROUND((s.read_count::NUMERIC / NULLIF(s.delivered, 0)) * 100, 2) as read_rate,
    ROUND(s.avg_delivery_seconds, 2) as avg_delivery_time,
    COALESCE(cs.channel_data, '{}'::jsonb),
    COALESCE(cat.category_data, '{}'::jsonb),
    COALESCE(ps.priority_data, '{}'::jsonb)
  FROM stats s
  CROSS JOIN channel_stats cs
  CROSS JOIN category_stats cat
  CROSS JOIN priority_stats ps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update channel rate limits
CREATE OR REPLACE FUNCTION update_channel_rate_limits(
  p_channel_id UUID
)
RETURNS void AS $$
DECLARE
  v_channel notification_channels;
BEGIN
  SELECT * INTO v_channel
  FROM notification_channels
  WHERE id = p_channel_id;
  
  -- Reset hourly count if needed
  IF v_channel.last_reset_hour < NOW() - INTERVAL '1 hour' THEN
    UPDATE notification_channels
    SET current_hour_count = 0,
        last_reset_hour = NOW()
    WHERE id = p_channel_id;
  END IF;
  
  -- Reset daily count if needed
  IF v_channel.last_reset_day < NOW() - INTERVAL '1 day' THEN
    UPDATE notification_channels
    SET current_day_count = 0,
        last_reset_day = NOW()
    WHERE id = p_channel_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if channel has capacity
CREATE OR REPLACE FUNCTION can_send_via_channel(
  p_tenant_id UUID,
  p_channel notification_channel
)
RETURNS BOOLEAN AS $$
DECLARE
  v_channel notification_channels;
BEGIN
  SELECT * INTO v_channel
  FROM notification_channels
  WHERE tenant_id = p_tenant_id
    AND channel = p_channel
    AND is_enabled = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update rate limits first
  PERFORM update_channel_rate_limits(v_channel.id);
  
  -- Reload channel data
  SELECT * INTO v_channel
  FROM notification_channels
  WHERE id = v_channel.id;
  
  -- Check hourly limit
  IF v_channel.max_sends_per_hour IS NOT NULL 
     AND v_channel.current_hour_count >= v_channel.max_sends_per_hour THEN
    RETURN FALSE;
  END IF;
  
  -- Check daily limit
  IF v_channel.max_sends_per_day IS NOT NULL 
     AND v_channel.current_day_count >= v_channel.max_sends_per_day THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at on record change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_deliveries_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_groups_updated_at
  BEFORE UPDATE ON notification_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: System Templates
-- =====================================================

INSERT INTO notification_templates (tenant_id, name, description, category, templates, variables, is_system_template, is_active)
VALUES
  (
    NULL,
    'Booking Confirmation',
    'Sent when a booking is confirmed',
    'booking',
    '{
      "email": {
        "subject": "Booking Confirmed - {{booking_number}}",
        "html": "<h1>Booking Confirmed</h1><p>Your booking <strong>{{booking_number}}</strong> has been confirmed for {{date}} at {{time}}.</p><p>Party size: {{party_size}}</p><p>Location: {{location}}</p>",
        "text": "Booking Confirmed\n\nYour booking {{booking_number}} has been confirmed for {{date}} at {{time}}.\nParty size: {{party_size}}\nLocation: {{location}}"
      },
      "sms": {
        "body": "Booking {{booking_number}} confirmed for {{date}} at {{time}}. Party: {{party_size}}. See you soon!"
      },
      "push": {
        "title": "Booking Confirmed",
        "body": "{{booking_number}} confirmed for {{date}} at {{time}}"
      },
      "in_app": {
        "title": "Booking Confirmed",
        "body": "Your booking {{booking_number}} has been confirmed for {{date}} at {{time}}."
      }
    }',
    '[
      {"name": "booking_number", "type": "string", "required": true},
      {"name": "date", "type": "string", "required": true},
      {"name": "time", "type": "string", "required": true},
      {"name": "party_size", "type": "number", "required": true},
      {"name": "location", "type": "string", "required": true}
    ]',
    true,
    true
  ),
  (
    NULL,
    'Payment Receipt',
    'Sent when payment is received',
    'payment',
    '{
      "email": {
        "subject": "Payment Receipt - {{transaction_id}}",
        "html": "<h1>Payment Received</h1><p>Thank you for your payment of <strong>{{amount}}</strong>.</p><p>Transaction ID: {{transaction_id}}</p><p>Payment method: {{payment_method}}</p><p>Date: {{date}}</p>",
        "text": "Payment Received\n\nThank you for your payment of {{amount}}.\nTransaction ID: {{transaction_id}}\nPayment method: {{payment_method}}\nDate: {{date}}"
      },
      "sms": {
        "body": "Payment of {{amount}} received. Transaction ID: {{transaction_id}}. Thank you!"
      },
      "in_app": {
        "title": "Payment Received",
        "body": "Your payment of {{amount}} has been processed successfully."
      }
    }',
    '[
      {"name": "transaction_id", "type": "string", "required": true},
      {"name": "amount", "type": "string", "required": true},
      {"name": "payment_method", "type": "string", "required": true},
      {"name": "date", "type": "string", "required": true}
    ]',
    true,
    true
  ),
  (
    NULL,
    'Booking Reminder',
    'Sent 24 hours before booking',
    'reminder',
    '{
      "email": {
        "subject": "Reminder: Booking Tomorrow - {{booking_number}}",
        "html": "<h1>Booking Reminder</h1><p>This is a reminder for your booking <strong>{{booking_number}}</strong> tomorrow at {{time}}.</p><p>Party size: {{party_size}}</p><p>Location: {{location}}</p>",
        "text": "Booking Reminder\n\nThis is a reminder for your booking {{booking_number}} tomorrow at {{time}}.\nParty size: {{party_size}}\nLocation: {{location}}"
      },
      "sms": {
        "body": "Reminder: Booking {{booking_number}} tomorrow at {{time}}. Party: {{party_size}}."
      },
      "push": {
        "title": "Booking Tomorrow",
        "body": "{{booking_number}} at {{time}}"
      }
    }',
    '[
      {"name": "booking_number", "type": "string", "required": true},
      {"name": "time", "type": "string", "required": true},
      {"name": "party_size", "type": "number", "required": true},
      {"name": "location", "type": "string", "required": true}
    ]',
    true,
    true
  ),
  (
    NULL,
    'System Alert',
    'Critical system notifications',
    'alert',
    '{
      "email": {
        "subject": "Alert: {{alert_title}}",
        "html": "<h1>System Alert</h1><p><strong>{{alert_title}}</strong></p><p>{{alert_message}}</p><p>Severity: {{severity}}</p><p>Time: {{timestamp}}</p>",
        "text": "System Alert\n\n{{alert_title}}\n\n{{alert_message}}\n\nSeverity: {{severity}}\nTime: {{timestamp}}"
      },
      "sms": {
        "body": "ALERT: {{alert_title}} - {{alert_message}}"
      },
      "push": {
        "title": "System Alert",
        "body": "{{alert_title}}"
      },
      "in_app": {
        "title": "{{alert_title}}",
        "body": "{{alert_message}}"
      }
    }',
    '[
      {"name": "alert_title", "type": "string", "required": true},
      {"name": "alert_message", "type": "string", "required": true},
      {"name": "severity", "type": "string", "required": true},
      {"name": "timestamp", "type": "string", "required": true}
    ]',
    true,
    true
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notification_channels IS 'Available notification channels per tenant with rate limiting';
COMMENT ON TABLE notification_preferences IS 'User-level notification preferences and quiet hours';
COMMENT ON TABLE notification_templates IS 'Reusable multi-channel notification templates';
COMMENT ON TABLE notifications IS 'Core notification records with multi-channel support';
COMMENT ON TABLE notification_deliveries IS 'Per-channel delivery tracking and analytics';
COMMENT ON TABLE notification_groups IS 'Notification grouping for digest delivery';

COMMENT ON FUNCTION get_user_notification_preferences IS 'Get or create user notification preferences';
COMMENT ON FUNCTION is_channel_enabled_for_user IS 'Check if notification channel is enabled for user based on preferences';
COMMENT ON FUNCTION is_in_quiet_hours IS 'Check if current time is within user quiet hours';
COMMENT ON FUNCTION get_pending_notifications IS 'Get notifications ready for processing';
COMMENT ON FUNCTION get_notification_stats IS 'Calculate notification delivery statistics';
COMMENT ON FUNCTION can_send_via_channel IS 'Check if channel has capacity based on rate limits';
