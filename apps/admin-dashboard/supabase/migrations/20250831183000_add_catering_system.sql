-- Add comprehensive catering functionality to Blunari platform
-- Enhanced catering system with menu management, event types, and advanced features

-- Catering-specific enums
CREATE TYPE public.catering_status AS ENUM ('inquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.catering_service_type AS ENUM ('pickup', 'delivery', 'full_service', 'drop_off');
CREATE TYPE public.menu_item_category AS ENUM ('appetizers', 'mains', 'desserts', 'beverages', 'salads', 'sides', 'packages');
CREATE TYPE public.dietary_restriction AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'kosher', 'halal');

-- Catering event types and templates
CREATE TABLE public.catering_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  min_guests INTEGER DEFAULT 10,
  max_guests INTEGER DEFAULT 500,
  advance_notice_days INTEGER DEFAULT 3,
  base_price_per_person INTEGER DEFAULT 0, -- in cents
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catering menu categories and items
CREATE TABLE public.catering_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_type menu_item_category NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.catering_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.catering_menu_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER, -- in cents, null if part of package
  price_per_item INTEGER, -- in cents, for items sold individually
  minimum_quantity INTEGER DEFAULT 1,
  serves_people INTEGER, -- how many people this item serves
  dietary_restrictions dietary_restriction[] DEFAULT '{}',
  ingredients TEXT[],
  allergens TEXT[],
  preparation_time_minutes INTEGER DEFAULT 60,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catering packages (pre-designed menu combinations)
CREATE TABLE public.catering_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL, -- in cents
  min_guests INTEGER DEFAULT 10,
  max_guests INTEGER,
  includes_setup BOOLEAN DEFAULT false,
  includes_service BOOLEAN DEFAULT false,
  includes_cleanup BOOLEAN DEFAULT false,
  dietary_accommodations dietary_restriction[] DEFAULT '{}',
  image_url TEXT,
  popular BOOLEAN DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Package menu items (what's included in each package)
CREATE TABLE public.catering_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.catering_packages(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.catering_menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity_per_person DECIMAL(5,2) DEFAULT 1.0,
  is_included BOOLEAN DEFAULT true, -- true = included, false = optional add-on
  additional_cost_per_person INTEGER DEFAULT 0, -- in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Main catering orders/events table
CREATE TABLE public.catering_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  event_type_id UUID REFERENCES public.catering_event_types(id),
  package_id UUID REFERENCES public.catering_packages(id),
  customer_id UUID REFERENCES auth.users(id),
  
  -- Event details
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_start_time TIME NOT NULL,
  event_end_time TIME,
  event_duration_hours DECIMAL(3,1) DEFAULT 4.0,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  
  -- Customer information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  company_name TEXT,
  
  -- Event location
  venue_name TEXT,
  venue_address JSONB NOT NULL,
  delivery_instructions TEXT,
  
  -- Service details
  service_type catering_service_type NOT NULL DEFAULT 'delivery',
  setup_required BOOLEAN DEFAULT false,
  service_staff_required INTEGER DEFAULT 0,
  equipment_needed TEXT[],
  
  -- Pricing
  subtotal INTEGER NOT NULL DEFAULT 0, -- in cents
  tax_amount INTEGER DEFAULT 0,
  service_fee INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_paid_at TIMESTAMPTZ,
  
  -- Order status and tracking
  status catering_status NOT NULL DEFAULT 'inquiry',
  quoted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  -- Additional information
  special_instructions TEXT,
  dietary_requirements TEXT,
  occasion TEXT,
  referral_source TEXT,
  marketing_consent BOOLEAN DEFAULT false,
  
  -- Internal notes and tracking
  internal_notes TEXT,
  assigned_chef_id UUID REFERENCES auth.users(id),
  prep_start_time TIMESTAMPTZ,
  ready_time TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom menu items for specific orders (when not using packages)
CREATE TABLE public.catering_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.catering_menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- in cents, price at time of order
  total_price INTEGER NOT NULL, -- quantity * unit_price
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order status history for tracking
CREATE TABLE public.catering_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  status catering_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer quotes and proposals
CREATE TABLE public.catering_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  quote_number TEXT UNIQUE NOT NULL,
  valid_until DATE NOT NULL,
  terms_conditions TEXT,
  notes TEXT,
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment and resource management
CREATE TABLE public.catering_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'serving', 'cooking', 'transport', 'setup'
  quantity_available INTEGER DEFAULT 1,
  hourly_rate INTEGER DEFAULT 0, -- rental cost in cents
  requires_staff BOOLEAN DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment assignments to orders
CREATE TABLE public.catering_order_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.catering_equipment(id) ON DELETE CASCADE NOT NULL,
  quantity_needed INTEGER DEFAULT 1,
  pickup_time TIMESTAMPTZ,
  return_time TIMESTAMPTZ,
  hourly_rate INTEGER NOT NULL, -- rate at time of booking
  total_cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff scheduling for catering events
CREATE TABLE public.catering_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'chef', 'server', 'setup', 'coordinator'
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  hourly_rate INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,
  confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer feedback and reviews for catering
CREATE TABLE public.catering_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.catering_orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  presentation_rating INTEGER CHECK (presentation_rating >= 1 AND presentation_rating <= 5),
  comments TEXT,
  would_recommend BOOLEAN,
  improvements_suggested TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.catering_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for catering tables (tenant isolation)
CREATE POLICY "Tenant isolation for catering event types" ON public.catering_event_types
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering menu categories" ON public.catering_menu_categories
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering menu items" ON public.catering_menu_items
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering packages" ON public.catering_packages
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering package items" ON public.catering_package_items
  FOR ALL USING (
    package_id IN (
      SELECT id FROM public.catering_packages cp
      WHERE cp.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenant isolation for catering orders" ON public.catering_orders
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
    OR customer_id = auth.uid()
  );

CREATE POLICY "Tenant isolation for catering order items" ON public.catering_order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
      OR co.customer_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering order history" ON public.catering_order_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
      OR co.customer_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering quotes" ON public.catering_quotes
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
      OR co.customer_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering equipment" ON public.catering_equipment
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for catering order equipment" ON public.catering_order_equipment
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenant isolation for catering staff assignments" ON public.catering_staff_assignments
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
    )
    OR staff_id = auth.uid()
  );

CREATE POLICY "Tenant isolation for catering feedback" ON public.catering_feedback
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.catering_orders co
      WHERE co.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
      OR co.customer_id = auth.uid()
    )
    OR customer_id = auth.uid()
  );

-- Triggers for updated_at columns
CREATE TRIGGER update_catering_event_types_updated_at
  BEFORE UPDATE ON public.catering_event_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_menu_categories_updated_at
  BEFORE UPDATE ON public.catering_menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_menu_items_updated_at
  BEFORE UPDATE ON public.catering_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_packages_updated_at
  BEFORE UPDATE ON public.catering_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_orders_updated_at
  BEFORE UPDATE ON public.catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_catering_event_types_tenant ON public.catering_event_types(tenant_id);
CREATE INDEX idx_catering_menu_categories_tenant ON public.catering_menu_categories(tenant_id, category_type);
CREATE INDEX idx_catering_menu_items_tenant_category ON public.catering_menu_items(tenant_id, category_id);
CREATE INDEX idx_catering_packages_tenant ON public.catering_packages(tenant_id, active);
CREATE INDEX idx_catering_orders_tenant_date ON public.catering_orders(tenant_id, event_date);
CREATE INDEX idx_catering_orders_status ON public.catering_orders(status);
CREATE INDEX idx_catering_orders_customer ON public.catering_orders(customer_id);
CREATE INDEX idx_catering_order_items_order ON public.catering_order_items(order_id);
CREATE INDEX idx_catering_quotes_order ON public.catering_quotes(order_id);
CREATE INDEX idx_catering_equipment_tenant ON public.catering_equipment(tenant_id, active);

-- Functions for catering operations
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
END;
$$;

-- Auto-generate quote numbers
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := public.generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON public.catering_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_number();

-- Function to track status changes
CREATE OR REPLACE FUNCTION public.track_catering_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.catering_order_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_catering_status_change_trigger
  AFTER UPDATE ON public.catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_catering_status_change();

-- Calculate order totals function
CREATE OR REPLACE FUNCTION public.calculate_catering_order_total(_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  _subtotal INTEGER := 0;
  _tax_rate DECIMAL := 0.08; -- 8% tax rate, should be configurable per tenant
  _service_fee INTEGER := 0;
  _delivery_fee INTEGER := 0;
  _tax_amount INTEGER := 0;
  _total INTEGER := 0;
BEGIN
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(total_price), 0) INTO _subtotal
  FROM public.catering_order_items
  WHERE order_id = _order_id;
  
  -- Add package price if applicable
  SELECT COALESCE(_subtotal + (cp.price_per_person * co.guest_count), _subtotal) INTO _subtotal
  FROM public.catering_orders co
  LEFT JOIN public.catering_packages cp ON co.package_id = cp.id
  WHERE co.id = _order_id;
  
  -- Calculate service fee (10% for full service)
  SELECT CASE 
    WHEN service_type = 'full_service' THEN _subtotal * 0.10
    WHEN setup_required THEN 5000 -- $50 setup fee
    ELSE 0
  END INTO _service_fee
  FROM public.catering_orders
  WHERE id = _order_id;
  
  -- Calculate delivery fee based on service type
  SELECT CASE 
    WHEN service_type IN ('delivery', 'drop_off') THEN 1500 -- $15 delivery fee
    ELSE 0
  END INTO _delivery_fee
  FROM public.catering_orders
  WHERE id = _order_id;
  
  -- Calculate tax
  _tax_amount := (_subtotal + _service_fee + _delivery_fee) * _tax_rate;
  
  -- Calculate total
  _total := _subtotal + _service_fee + _delivery_fee + _tax_amount;
  
  -- Update the order with calculated values
  UPDATE public.catering_orders
  SET 
    subtotal = _subtotal,
    service_fee = _service_fee,
    delivery_fee = _delivery_fee,
    tax_amount = _tax_amount,
    total_amount = _total,
    updated_at = now()
  WHERE id = _order_id;
  
  RETURN _total;
END;
$$;

-- Insert default catering data for new tenants
CREATE OR REPLACE FUNCTION public.setup_default_catering_data(_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  _event_type_id UUID;
  _category_id UUID;
  _menu_item_id UUID;
  _package_id UUID;
BEGIN
  -- Create default event types
  INSERT INTO public.catering_event_types (tenant_id, name, description, min_guests, max_guests, advance_notice_days, base_price_per_person)
  VALUES 
    (_tenant_id, 'Corporate Events', 'Business meetings, conferences, and corporate gatherings', 10, 200, 3, 2500),
    (_tenant_id, 'Wedding Receptions', 'Wedding celebrations and receptions', 20, 300, 30, 5000),
    (_tenant_id, 'Private Parties', 'Birthday parties, anniversaries, and personal celebrations', 15, 100, 5, 3500),
    (_tenant_id, 'Holiday Events', 'Christmas parties, New Year celebrations, and holiday gatherings', 20, 250, 14, 4000)
  RETURNING id INTO _event_type_id;
  
  -- Create default menu categories
  INSERT INTO public.catering_menu_categories (tenant_id, name, description, category_type, display_order)
  VALUES 
    (_tenant_id, 'Appetizers & Hors d''oeuvres', 'Start your event with delicious small bites', 'appetizers', 1),
    (_tenant_id, 'Main Courses', 'Hearty entrees to satisfy your guests', 'mains', 2),
    (_tenant_id, 'Salads & Fresh Options', 'Light and healthy selections', 'salads', 3),
    (_tenant_id, 'Side Dishes', 'Perfect accompaniments to your meal', 'sides', 4),
    (_tenant_id, 'Desserts', 'Sweet endings to your event', 'desserts', 5),
    (_tenant_id, 'Beverages', 'Drinks to complement your meal', 'beverages', 6),
    (_tenant_id, 'Complete Packages', 'All-inclusive catering solutions', 'packages', 7)
  RETURNING id INTO _category_id;
  
  -- Get the appetizers category id for sample items
  SELECT id INTO _category_id 
  FROM public.catering_menu_categories 
  WHERE tenant_id = _tenant_id AND category_type = 'appetizers' 
  LIMIT 1;
  
  -- Create sample menu items
  INSERT INTO public.catering_menu_items (tenant_id, category_id, name, description, price_per_person, serves_people, dietary_restrictions, display_order)
  VALUES 
    (_tenant_id, _category_id, 'Artisan Cheese & Charcuterie Board', 'Selection of premium cheeses, cured meats, crackers, and accompaniments', 450, 8, ARRAY['gluten_free']::dietary_restriction[], 1),
    (_tenant_id, _category_id, 'Vegetarian Spring Rolls', 'Fresh vegetables wrapped in rice paper with peanut dipping sauce', 350, 10, ARRAY['vegetarian', 'gluten_free']::dietary_restriction[], 2),
    (_tenant_id, _category_id, 'Smoked Salmon Canapés', 'House-cured salmon on herb cream cheese with dill', 650, 12, NULL, 3);
  
  -- Get mains category for more items
  SELECT id INTO _category_id 
  FROM public.catering_menu_categories 
  WHERE tenant_id = _tenant_id AND category_type = 'mains' 
  LIMIT 1;
  
  INSERT INTO public.catering_menu_items (tenant_id, category_id, name, description, price_per_person, serves_people, preparation_time_minutes, display_order)
  VALUES 
    (_tenant_id, _category_id, 'Herb-Crusted Chicken Breast', 'Free-range chicken with rosemary and thyme crust, served with seasonal vegetables', 1200, 1, 45, 1),
    (_tenant_id, _category_id, 'Grilled Salmon Fillet', 'Atlantic salmon with lemon herb butter and wild rice pilaf', 1650, 1, 35, 2),
    (_tenant_id, _category_id, 'Vegetarian Pasta Primavera', 'Seasonal vegetables with penne pasta in herb cream sauce', 950, 1, 30, 3);
  
  -- Create a sample package
  INSERT INTO public.catering_packages (tenant_id, name, description, price_per_person, min_guests, includes_setup, includes_service)
  VALUES 
    (_tenant_id, 'Executive Lunch Package', 'Perfect for business meetings and corporate events. Includes appetizer, main course, dessert, and beverages with full service.', 2850, 10, true, true)
  RETURNING id INTO _package_id;
  
  -- Add items to the package (this would reference actual menu item IDs)
  -- This is a simplified example - in practice, you'd reference the actual menu items created above
  
END;
$$;

-- Add catering feature to tenant features
INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, config)
SELECT 
  id as tenant_id,
  'catering' as feature_key,
  true as enabled,
  '{"max_advance_days": 365, "min_advance_days": 1, "default_deposit_percentage": 25, "auto_quote_enabled": true}'::jsonb as config
FROM public.tenants
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_features tf 
  WHERE tf.tenant_id = tenants.id AND tf.feature_key = 'catering'
);

-- Comments for documentation
COMMENT ON TABLE public.catering_orders IS 'Main table for catering orders and event requests';
COMMENT ON TABLE public.catering_menu_items IS 'Menu items available for catering with pricing and dietary information';
COMMENT ON TABLE public.catering_packages IS 'Pre-designed catering packages with bundled pricing';
COMMENT ON COLUMN public.catering_orders.total_amount IS 'Total order amount in cents including tax and fees';
COMMENT ON COLUMN public.catering_orders.guest_count IS 'Number of guests expected at the event';
COMMENT ON COLUMN public.catering_orders.service_type IS 'Type of catering service: pickup, delivery, drop_off, or full_service';
