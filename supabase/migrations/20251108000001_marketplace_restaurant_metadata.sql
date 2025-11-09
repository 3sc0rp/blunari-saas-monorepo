-- ============================================================================
-- CONSUMER MARKETPLACE: Restaurant Metadata Schema
-- Target City: Atlanta, GA
-- Purpose: Transform tenants table into rich restaurant listings
-- ============================================================================

-- Add restaurant discovery and marketplace columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS cuisine_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS price_range TEXT CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT DEFAULT 'Atlanta',
ADD COLUMN IF NOT EXISTS location_state TEXT DEFAULT 'GA',
ADD COLUMN IF NOT EXISTS location_zip TEXT,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_reservations BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_catering BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_walkins BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS private_dining BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_music BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wifi_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS menu_url TEXT,
ADD COLUMN IF NOT EXISTS dietary_options TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['vegetarian', 'vegan', 'gluten-free']
ADD COLUMN IF NOT EXISTS special_features TEXT[] DEFAULT ARRAY[]::TEXT[]; -- ['happy-hour', 'brunch', 'late-night']

-- Add indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_tenants_location_city ON public.tenants(location_city) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tenants_cuisine_types ON public.tenants USING GIN(cuisine_types);
CREATE INDEX IF NOT EXISTS idx_tenants_price_range ON public.tenants(price_range) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tenants_featured ON public.tenants(is_featured) WHERE is_featured = true AND is_published = true;
CREATE INDEX IF NOT EXISTS idx_tenants_location ON public.tenants(location_lat, location_lng) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tenants_rating ON public.tenants(average_rating DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tenants_dietary ON public.tenants USING GIN(dietary_options);

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.description IS 'Restaurant description for marketplace listing';
COMMENT ON COLUMN public.tenants.cuisine_types IS 'Array of cuisine types (e.g., Italian, Japanese, American)';
COMMENT ON COLUMN public.tenants.price_range IS 'Price indicator: $ (under $15), $$ ($15-30), $$$ ($30-60), $$$$ (over $60)';
COMMENT ON COLUMN public.tenants.hero_image_url IS 'Main restaurant image for listings and profile pages';
COMMENT ON COLUMN public.tenants.gallery_images IS 'Array of additional restaurant photos';
COMMENT ON COLUMN public.tenants.location_city IS 'City for geographic filtering (default: Atlanta)';
COMMENT ON COLUMN public.tenants.location_state IS 'State abbreviation (default: GA)';
COMMENT ON COLUMN public.tenants.is_featured IS 'Featured restaurants appear in prominent positions';
COMMENT ON COLUMN public.tenants.is_published IS 'Controls visibility in public marketplace';
COMMENT ON COLUMN public.tenants.average_rating IS 'Calculated from reviews (0.00 to 5.00)';
COMMENT ON COLUMN public.tenants.dietary_options IS 'Dietary options available (vegetarian, vegan, gluten-free, etc.)';
