-- Migration: Create catering system tables
-- Description: Creates comprehensive catering functionality tables for package management and order processing
-- Created: 2025-01-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create catering event types table
CREATE TABLE IF NOT EXISTS public.catering_event_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering menu categories table
CREATE TABLE IF NOT EXISTS public.catering_menu_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering menu items table
CREATE TABLE IF NOT EXISTS public.catering_menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.catering_menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'per person',
    dietary_restrictions TEXT[] DEFAULT '{}',
    allergen_info TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering packages table
CREATE TABLE IF NOT EXISTS public.catering_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_person DECIMAL(10,2) NOT NULL,
    min_guests INTEGER NOT NULL DEFAULT 1,
    max_guests INTEGER,
    includes_setup BOOLEAN DEFAULT false,
    includes_service BOOLEAN DEFAULT false,
    includes_cleanup BOOLEAN DEFAULT false,
    dietary_accommodations TEXT[] DEFAULT '{}',
    image_url TEXT,
    popular BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering package items table (junction table)
CREATE TABLE IF NOT EXISTS public.catering_package_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    package_id UUID NOT NULL REFERENCES public.catering_packages(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.catering_menu_items(id) ON DELETE CASCADE,
    quantity_per_person DECIMAL(8,2) DEFAULT 1,
    is_included BOOLEAN DEFAULT true,
    additional_cost_per_person DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering equipment table
CREATE TABLE IF NOT EXISTS public.catering_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    quantity_available INTEGER DEFAULT 1,
    rental_price_per_day DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering orders table
CREATE TABLE IF NOT EXISTS public.catering_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.catering_packages(id) ON DELETE SET NULL,
    event_type_id UUID REFERENCES public.catering_event_types(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_start_time TIME NOT NULL,
    event_end_time TIME,
    guest_count INTEGER NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('pickup', 'delivery', 'drop_off', 'full_service')),
    status VARCHAR(50) DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    venue_name VARCHAR(255),
    venue_address TEXT,
    delivery_address TEXT,
    special_instructions TEXT,
    dietary_requirements TEXT[] DEFAULT '{}',
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT false,
    balance_due DECIMAL(10,2),
    payment_terms TEXT,
    setup_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering order items table
CREATE TABLE IF NOT EXISTS public.catering_order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.catering_menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering order equipment table
CREATE TABLE IF NOT EXISTS public.catering_order_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.catering_equipment(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    rental_days INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    delivery_date DATE NOT NULL,
    pickup_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering order history table
CREATE TABLE IF NOT EXISTS public.catering_order_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering quotes table
CREATE TABLE IF NOT EXISTS public.catering_quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    quote_number VARCHAR(100) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    valid_until DATE NOT NULL,
    terms_and_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering staff assignments table
CREATE TABLE IF NOT EXISTS public.catering_staff_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    hourly_rate DECIMAL(10,2),
    total_hours DECIMAL(8,2),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catering feedback table
CREATE TABLE IF NOT EXISTS public.catering_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    presentation_rating INTEGER CHECK (presentation_rating >= 1 AND presentation_rating <= 5),
    comments TEXT,
    would_recommend BOOLEAN DEFAULT true,
    improvements_suggested TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catering_packages_tenant_active ON public.catering_packages(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_catering_packages_popular ON public.catering_packages(popular, active);
CREATE INDEX IF NOT EXISTS idx_catering_menu_items_tenant_active ON public.catering_menu_items(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_catering_menu_items_category ON public.catering_menu_items(category_id, active);
CREATE INDEX IF NOT EXISTS idx_catering_orders_tenant_status ON public.catering_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_catering_orders_event_date ON public.catering_orders(event_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_contact_email ON public.catering_orders(contact_email);
CREATE INDEX IF NOT EXISTS idx_catering_package_items_package ON public.catering_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_catering_order_items_order ON public.catering_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_catering_feedback_order ON public.catering_feedback(order_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.catering_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Public can view active catering packages for ordering
CREATE POLICY "Public can view active catering packages"
ON public.catering_packages FOR SELECT
TO public
USING (active = true);

CREATE POLICY "Public can view active menu items"
ON public.catering_menu_items FOR SELECT
TO public
USING (active = true);

CREATE POLICY "Public can view menu categories"
ON public.catering_menu_categories FOR SELECT
TO public
USING (active = true);

CREATE POLICY "Public can view event types"
ON public.catering_event_types FOR SELECT
TO public
USING (active = true);

-- Public can create catering orders (inquiries)
CREATE POLICY "Public can create catering orders"
ON public.catering_orders FOR INSERT
TO public
WITH CHECK (status = 'inquiry');

-- Authenticated users can manage their tenant's data
CREATE POLICY "Users can manage their tenant's catering data"
ON public.catering_packages FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant's menu items"
ON public.catering_menu_items FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant's categories"
ON public.catering_menu_categories FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant's event types"
ON public.catering_event_types FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant's equipment"
ON public.catering_equipment FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant's orders"
ON public.catering_orders FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage package items for their packages"
ON public.catering_package_items FOR ALL
TO authenticated
USING (
    package_id IN (
        SELECT id FROM public.catering_packages 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can manage order items for their orders"
ON public.catering_order_items FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can manage equipment for their orders"
ON public.catering_order_equipment FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can manage history for their orders"
ON public.catering_order_history FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can manage quotes for their orders"
ON public.catering_quotes FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can manage staff assignments for their orders"
ON public.catering_staff_assignments FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

CREATE POLICY "Users can view feedback for their orders"
ON public.catering_feedback FOR SELECT
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.catering_orders 
        WHERE tenant_id = public.get_current_user_tenant_id()
    )
);

-- Create functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_catering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER catering_event_types_updated_at
    BEFORE UPDATE ON public.catering_event_types
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_menu_categories_updated_at
    BEFORE UPDATE ON public.catering_menu_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_menu_items_updated_at
    BEFORE UPDATE ON public.catering_menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_packages_updated_at
    BEFORE UPDATE ON public.catering_packages
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_equipment_updated_at
    BEFORE UPDATE ON public.catering_equipment
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_orders_updated_at
    BEFORE UPDATE ON public.catering_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

CREATE TRIGGER catering_quotes_updated_at
    BEFORE UPDATE ON public.catering_quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_catering_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.catering_packages IS 'Catering packages with pricing and inclusions for tenant restaurants';
COMMENT ON TABLE public.catering_menu_items IS 'Individual menu items available for catering orders';
COMMENT ON TABLE public.catering_orders IS 'Catering orders from customers including inquiries, quotes, and confirmed orders';
COMMENT ON TABLE public.catering_package_items IS 'Junction table linking packages to their included menu items';
COMMENT ON TABLE public.catering_feedback IS 'Customer feedback and ratings for completed catering orders';

-- Create view for catering analytics
CREATE OR REPLACE VIEW public.catering_order_metrics AS
SELECT 
    tenant_id,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    ROUND(AVG(guest_count), 2) as avg_guest_count,
    ROUND(AVG(total_amount), 2) as avg_order_value,
    SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'completed')) as total_revenue,
    DATE_TRUNC('month', created_at) as month
FROM public.catering_orders
GROUP BY tenant_id, DATE_TRUNC('month', created_at);

COMMENT ON VIEW public.catering_order_metrics IS 'Monthly catering order metrics and analytics per tenant';
