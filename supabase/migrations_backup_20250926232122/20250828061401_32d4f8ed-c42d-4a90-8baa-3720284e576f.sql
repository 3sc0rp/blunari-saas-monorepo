-- Create comprehensive multi-tenant restaurant booking platform
-- Enhanced user roles system
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'staff', 'customer');
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'pending');
CREATE TYPE public.subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');

-- Enhanced tenants table for multi-tenant architecture
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  address JSONB,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
  status tenant_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles system (avoiding recursive RLS)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

-- User profiles with tenant association
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  default_tenant_id UUID REFERENCES public.tenants(id),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced restaurant tables with advanced features
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER,
  table_type TEXT DEFAULT 'standard',
  location_zone TEXT,
  position_x DOUBLE PRECISION,
  position_y DOUBLE PRECISION,
  status table_status NOT NULL DEFAULT 'available',
  features TEXT[] DEFAULT '{}',
  hourly_rate INTEGER DEFAULT 0,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advanced bookings system
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id),
  customer_id UUID REFERENCES auth.users(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  status booking_status NOT NULL DEFAULT 'pending',
  special_requests TEXT,
  dietary_requirements TEXT[],
  occasion TEXT,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount INTEGER DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  total_amount INTEGER DEFAULT 0,
  confirmation_code TEXT UNIQUE,
  source TEXT DEFAULT 'website',
  marketing_consent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Booking holds for reservation flow
CREATE TABLE public.booking_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id),
  session_id TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant features management
CREATE TABLE public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, feature_key)
);

-- Analytics and metrics
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Waitlist management
CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  party_size INTEGER NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
  )
$$;

-- Helper function to get user's tenant access
CREATE OR REPLACE FUNCTION public.get_user_tenant_access(_user_id UUID)
RETURNS TABLE (tenant_id UUID, role app_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ur.tenant_id, ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
$$;

-- RLS Policies
-- Tenants: Super admins can see all, users can see their associated tenants
CREATE POLICY "Super admins can manage all tenants" ON public.tenants
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their associated tenants" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- User roles: Users can see their own roles, admins can manage roles in their tenant
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their tenant" ON public.user_roles
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Profiles: Users can manage their own profile
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (user_id = auth.uid());

-- Tenant-scoped policies for operational tables
CREATE POLICY "Tenant isolation for tables" ON public.restaurant_tables
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for bookings" ON public.bookings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
    OR customer_id = auth.uid()
  );

CREATE POLICY "Tenant isolation for booking holds" ON public.booking_holds
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for features" ON public.tenant_features
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for analytics" ON public.analytics_events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for waitlist" ON public.waitlist_entries
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_features_updated_at
  BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_restaurant_tables_tenant ON public.restaurant_tables(tenant_id);
CREATE INDEX idx_bookings_tenant_date ON public.bookings(tenant_id, booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_booking_holds_tenant_expires ON public.booking_holds(tenant_id, expires_at);
CREATE INDEX idx_analytics_events_tenant_type ON public.analytics_events(tenant_id, event_type);

-- Generate confirmation codes for bookings
CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$;

-- Auto-generate confirmation codes
CREATE OR REPLACE FUNCTION public.set_booking_confirmation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := public.generate_confirmation_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_confirmation_code_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_confirmation_code();