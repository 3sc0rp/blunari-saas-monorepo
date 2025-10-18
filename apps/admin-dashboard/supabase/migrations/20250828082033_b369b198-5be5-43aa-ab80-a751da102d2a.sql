-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- Price in cents
  price_yearly INTEGER, -- Price in cents (optional for annual discount)
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_tenants INTEGER,
  max_users_per_tenant INTEGER,
  storage_limit_gb INTEGER,
  api_calls_limit INTEGER,
  priority_support BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  advanced_analytics BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, canceled, past_due, trialing
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- api_calls, storage_used_gb, users_count, etc.
  current_value BIGINT NOT NULL DEFAULT 0,
  limit_value BIGINT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  overage_units BIGINT DEFAULT 0,
  overage_cost INTEGER DEFAULT 0, -- Cost in cents
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, metric_name, period_start)
);

-- Create billing history table
CREATE TABLE public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- paid, pending, failed, refunded
  description TEXT,
  invoice_url TEXT,
  invoice_pdf_url TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create revenue analytics view
CREATE VIEW public.revenue_analytics AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
  SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as monthly_recurring_revenue,
  AVG(CASE WHEN status = 'active' THEN amount ELSE NULL END) as average_revenue_per_user,
  COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_subscriptions_this_month,
  COUNT(CASE WHEN canceled_at IS NOT NULL AND DATE_TRUNC('month', canceled_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as churned_this_month
FROM public.subscriptions
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read access)
CREATE POLICY "Public can view active subscription plans" ON public.subscription_plans
  FOR SELECT
  USING (active = true);

CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans
  FOR ALL
  USING (has_employee_role('SUPER_ADMIN'));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own tenant subscriptions" ON public.subscriptions
  FOR SELECT
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
  FOR ALL
  USING (has_employee_role('ADMIN'));

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view own tenant usage" ON public.usage_tracking
  FOR SELECT
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "System can update usage tracking" ON public.usage_tracking
  FOR ALL
  USING (true);

-- RLS Policies for billing_history
CREATE POLICY "Users can view own tenant billing history" ON public.billing_history
  FOR SELECT
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Admins can manage billing history" ON public.billing_history
  FOR ALL
  USING (has_employee_role('ADMIN'));

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_history_updated_at
  BEFORE UPDATE ON public.billing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, features, max_tenants, max_users_per_tenant, storage_limit_gb, api_calls_limit, priority_support, custom_branding, advanced_analytics, display_order) VALUES
('Starter', 'starter', 'Perfect for small restaurants getting started', 8900, 80100, '["Basic booking system", "Email notifications", "Standard support", "Up to 3 staff accounts", "Basic analytics"]'::jsonb, 1, 3, 5, 10000, false, false, false, 1),
('Professional', 'professional', 'Ideal for growing restaurants with advanced needs', 22900, 206100, '["Advanced booking system", "SMS & Email notifications", "Priority support", "Up to 15 staff accounts", "Advanced analytics", "Custom branding", "API access"]'::jsonb, 3, 15, 20, 50000, true, true, true, 2),
('Enterprise', 'enterprise', 'Complete solution for restaurant chains and large operations', 39900, 359100, '["Enterprise booking system", "Multi-location support", "24/7 dedicated support", "Unlimited staff accounts", "Enterprise analytics", "White-label solution", "Custom integrations", "SLA guarantee"]'::jsonb, 999, 999, 100, 500000, true, true, true, 3);

-- Create function to get current subscription for tenant
CREATE OR REPLACE FUNCTION public.get_current_subscription(p_tenant_id UUID)
RETURNS TABLE(
  subscription_id UUID,
  plan_name TEXT,
  plan_slug TEXT,
  status TEXT,
  billing_cycle TEXT,
  amount INTEGER,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    sp.name as plan_name,
    sp.slug as plan_slug,
    s.status,
    s.billing_cycle,
    s.amount,
    s.current_period_end,
    s.trial_end
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION public.check_subscription_limit(p_tenant_id UUID, p_metric TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_usage BIGINT;
  usage_limit BIGINT;
BEGIN
  SELECT current_value, limit_value
  INTO current_usage, usage_limit
  FROM public.usage_tracking
  WHERE tenant_id = p_tenant_id
    AND metric_name = p_metric
    AND period_start <= now()
    AND period_end >= now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF usage_limit IS NULL THEN
    RETURN true; -- No limit set
  END IF;
  
  RETURN COALESCE(current_usage, 0) < usage_limit;
END;
$$;