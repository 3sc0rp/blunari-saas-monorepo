-- Create subscribers table for restaurant billing
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_id TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create billing history table
CREATE TABLE public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- paid, pending, failed, refunded
  billing_reason TEXT, -- subscription_cycle, subscription_create, subscription_update
  invoice_pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment reminders table
CREATE TABLE public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- overdue, failed, upcoming
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  email_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Admins can view all subscribers" ON public.subscribers
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Admins can manage subscribers" ON public.subscribers
  FOR ALL USING (has_employee_role('ADMIN'::employee_role))
  WITH CHECK (has_employee_role('ADMIN'::employee_role));

CREATE POLICY "Tenants can view own subscription" ON public.subscribers
  FOR SELECT USING (tenant_id = get_current_user_tenant_id());

-- Create RLS policies for billing history
CREATE POLICY "Admins can view all billing history" ON public.billing_history
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Tenants can view own billing history" ON public.billing_history
  FOR SELECT USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "System can insert billing records" ON public.billing_history
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for payment reminders
CREATE POLICY "Admins can manage payment reminders" ON public.payment_reminders
  FOR ALL USING (has_employee_role('SUPPORT'::employee_role))
  WITH CHECK (has_employee_role('SUPPORT'::employee_role));

-- Create indexes for performance
CREATE INDEX idx_subscribers_tenant_id ON public.subscribers(tenant_id);
CREATE INDEX idx_subscribers_stripe_customer_id ON public.subscribers(stripe_customer_id);
CREATE INDEX idx_billing_history_tenant_id ON public.billing_history(tenant_id);
CREATE INDEX idx_billing_history_status ON public.billing_history(status);
CREATE INDEX idx_payment_reminders_tenant_id ON public.payment_reminders(tenant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();