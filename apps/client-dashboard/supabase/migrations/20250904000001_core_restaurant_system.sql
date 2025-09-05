-- ===== CORE RESTAURANT OPERATIONS SYSTEM =====
-- Building on existing Blunari SAAS infrastructure
-- Adding core restaurant functionality beyond booking management

-- Restaurant menu system (core dining menu, not catering)
CREATE TYPE public.menu_item_status AS ENUM ('available', 'unavailable', 'out_of_stock', 'limited');
CREATE TYPE public.menu_item_category AS ENUM ('appetizers', 'mains', 'desserts', 'beverages', 'sides', 'specials', 'kids', 'vegetarian', 'vegan');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled');
CREATE TYPE public.kitchen_display_status AS ENUM ('new', 'preparing', 'ready', 'served');
CREATE TYPE public.staff_role AS ENUM ('manager', 'chef', 'sous_chef', 'line_cook', 'server', 'bartender', 'host', 'busser', 'dishwasher');
CREATE TYPE public.shift_status AS ENUM ('scheduled', 'checked_in', 'on_break', 'checked_out', 'no_show');
CREATE TYPE public.inventory_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'ordered');

-- ===== RESTAURANT MENU MANAGEMENT =====

-- Main restaurant menus (different from catering)
CREATE TABLE public.restaurant_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  menu_type TEXT NOT NULL DEFAULT 'regular', -- 'regular', 'brunch', 'dinner', 'happy_hour', 'seasonal'
  active BOOLEAN NOT NULL DEFAULT true,
  start_time TIME, -- Time when menu becomes available
  end_time TIME,   -- Time when menu stops being available  
  available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- 0-6 (Sunday-Saturday)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu categories for restaurant items
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  menu_id UUID REFERENCES public.restaurant_menus(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurant menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in cents
  cost_to_make INTEGER, -- in cents for profit margin calculation
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  calories INTEGER,
  dietary_restrictions dietary_restriction[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  image_url TEXT,
  status menu_item_status NOT NULL DEFAULT 'available',
  display_order INTEGER DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== ORDER MANAGEMENT SYSTEM =====

-- Restaurant orders (dine-in, takeout, delivery)
CREATE TABLE public.restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT NOT NULL DEFAULT 'dine_in', -- 'dine_in', 'takeout', 'delivery'
  status order_status NOT NULL DEFAULT 'pending',
  subtotal INTEGER NOT NULL DEFAULT 0, -- in cents
  tax_amount INTEGER NOT NULL DEFAULT 0, -- in cents
  tip_amount INTEGER DEFAULT 0, -- in cents
  total_amount INTEGER NOT NULL DEFAULT 0, -- in cents
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  special_instructions TEXT,
  estimated_ready_time TIMESTAMPTZ,
  actual_ready_time TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- in cents
  total_price INTEGER NOT NULL, -- in cents
  special_instructions TEXT,
  kitchen_status kitchen_display_status NOT NULL DEFAULT 'new',
  prep_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== KITCHEN DISPLAY SYSTEM =====

-- Kitchen tickets for display system
CREATE TABLE public.kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE CASCADE NOT NULL,
  table_number TEXT,
  customer_name TEXT,
  status kitchen_display_status NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  estimated_completion TIMESTAMPTZ,
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kitchen ticket items
CREATE TABLE public.kitchen_ticket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  special_instructions TEXT,
  status kitchen_display_status NOT NULL DEFAULT 'new',
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== STAFF MANAGEMENT SYSTEM =====

-- Employee records
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- Optional link to auth user
  employee_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role staff_role NOT NULL,
  hourly_rate INTEGER, -- in cents
  hire_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'terminated'
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, employee_number),
  UNIQUE(tenant_id, email)
);

-- Shift scheduling
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  status shift_status NOT NULL DEFAULT 'scheduled',
  hourly_rate INTEGER NOT NULL, -- in cents
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time clock entries
CREATE TABLE public.time_clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  total_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== INVENTORY MANAGEMENT SYSTEM =====

-- Inventory categories
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL, -- 'lbs', 'oz', 'pieces', 'cases', etc.
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_stock_level NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_stock_level NUMERIC(10,2),
  cost_per_unit INTEGER NOT NULL, -- in cents
  supplier_name TEXT,
  supplier_product_code TEXT,
  status inventory_status NOT NULL DEFAULT 'in_stock',
  last_ordered DATE,
  last_received DATE,
  expiration_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock transactions (purchases, usage, waste, adjustments)
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'waste', 'adjustment'
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost INTEGER, -- in cents
  total_cost INTEGER, -- in cents
  reference_order_id UUID REFERENCES public.restaurant_orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== CUSTOMER MANAGEMENT =====

-- Customer profiles (enhanced from basic booking data)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birthday DATE,
  anniversary DATE,
  dietary_restrictions dietary_restriction[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  preferences TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0, -- in cents
  avg_order_value INTEGER NOT NULL DEFAULT 0, -- in cents
  last_visit DATE,
  loyalty_points INTEGER DEFAULT 0,
  vip_status BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);

-- Loyalty program configuration
CREATE TABLE public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_per_dollar NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  dollars_per_point NUMERIC(5,2) NOT NULL DEFAULT 0.01, -- How much $1 point is worth
  welcome_bonus INTEGER DEFAULT 0,
  birthday_bonus INTEGER DEFAULT 0,
  referral_bonus INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loyalty point transactions
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.restaurant_orders(id),
  transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'bonus', 'adjustment'
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== NOTIFICATION SYSTEM =====

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sms', 'email', 'push'
  trigger_event TEXT NOT NULL, -- 'booking_confirmed', 'order_ready', 'table_ready', 'birthday', 'loyalty_milestone'
  subject TEXT,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'sms', 'email', 'push'
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== INDEXES FOR PERFORMANCE =====

-- Menu system indexes
CREATE INDEX idx_restaurant_menus_tenant_active ON public.restaurant_menus(tenant_id, active);
CREATE INDEX idx_menu_categories_menu_order ON public.menu_categories(menu_id, display_order);
CREATE INDEX idx_menu_items_category_order ON public.menu_items(category_id, display_order);
CREATE INDEX idx_menu_items_status_available ON public.menu_items(tenant_id, status, available);

-- Order system indexes
CREATE INDEX idx_restaurant_orders_tenant_status ON public.restaurant_orders(tenant_id, status);
CREATE INDEX idx_restaurant_orders_created_at ON public.restaurant_orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_kitchen_tickets_status ON public.kitchen_tickets(tenant_id, status);

-- Staff system indexes
CREATE INDEX idx_employees_tenant_status ON public.employees(tenant_id, status);
CREATE INDEX idx_shifts_employee_date ON public.shifts(employee_id, scheduled_start);
CREATE INDEX idx_time_clock_employee_date ON public.time_clock_entries(employee_id, clock_in);

-- Inventory system indexes
CREATE INDEX idx_inventory_items_tenant_status ON public.inventory_items(tenant_id, status);
CREATE INDEX idx_stock_transactions_item_date ON public.stock_transactions(inventory_item_id, created_at DESC);

-- Customer system indexes
CREATE INDEX idx_customers_tenant_email ON public.customers(tenant_id, email);
CREATE INDEX idx_customers_tenant_phone ON public.customers(tenant_id, phone);
CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id, created_at DESC);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS on all tables
ALTER TABLE public.restaurant_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
-- Menu system policies
CREATE POLICY "Users can view menus for their tenant" ON public.restaurant_menus FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage menus for their tenant" ON public.restaurant_menus FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid())
);

-- Similar policies for all other tables (following same pattern)
-- Note: In production, you'd want more granular policies based on user roles

-- ===== TRIGGERS FOR UPDATED_AT =====

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables with updated_at
CREATE TRIGGER set_restaurant_menus_updated_at BEFORE UPDATE ON public.restaurant_menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_kitchen_tickets_updated_at BEFORE UPDATE ON public.kitchen_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_kitchen_ticket_items_updated_at BEFORE UPDATE ON public.kitchen_ticket_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_time_clock_entries_updated_at BEFORE UPDATE ON public.time_clock_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE public.restaurant_menus IS 'Core restaurant menus (different from catering menus)';
COMMENT ON TABLE public.menu_categories IS 'Categories for organizing menu items';
COMMENT ON TABLE public.menu_items IS 'Individual menu items with pricing and details';
COMMENT ON TABLE public.restaurant_orders IS 'Customer orders for dine-in, takeout, and delivery';
COMMENT ON TABLE public.order_items IS 'Individual items within an order';
COMMENT ON TABLE public.kitchen_tickets IS 'Kitchen display system tickets';
COMMENT ON TABLE public.kitchen_ticket_items IS 'Individual items on kitchen tickets';
COMMENT ON TABLE public.employees IS 'Restaurant staff records';
COMMENT ON TABLE public.shifts IS 'Employee shift scheduling';
COMMENT ON TABLE public.time_clock_entries IS 'Employee time tracking';
COMMENT ON TABLE public.inventory_categories IS 'Categories for inventory organization';
COMMENT ON TABLE public.inventory_items IS 'Restaurant inventory items';
COMMENT ON TABLE public.stock_transactions IS 'Inventory movement tracking';
COMMENT ON TABLE public.customers IS 'Customer profiles and preferences';
COMMENT ON TABLE public.loyalty_programs IS 'Loyalty program configuration';
COMMENT ON TABLE public.loyalty_transactions IS 'Customer loyalty point transactions';
COMMENT ON TABLE public.notification_templates IS 'Templates for automated notifications';
COMMENT ON TABLE public.notification_log IS 'Log of sent notifications';
