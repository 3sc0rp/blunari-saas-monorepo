-- ============================================================================
-- CONSUMER MARKETPLACE: Consumer Profiles & Guest Bookings
-- Purpose: Support guest checkout and optional account creation
-- ============================================================================

-- Consumer profiles table (for marketplace users, separate from tenant employees)
CREATE TABLE IF NOT EXISTS public.consumer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Preferences
  favorite_cuisines TEXT[] DEFAULT ARRAY[]::TEXT[],
  dietary_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_price_range TEXT,
  default_party_size INTEGER DEFAULT 2,
  
  -- Location
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Engagement
  total_bookings INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  member_since DATE DEFAULT CURRENT_DATE,
  last_booking_date DATE,
  
  -- Notifications
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  
  -- Account status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Favorite restaurants (wishlists)
CREATE TABLE IF NOT EXISTS public.consumer_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_profile_id UUID NOT NULL REFERENCES public.consumer_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  list_name TEXT DEFAULT 'My Favorites', -- Allow multiple lists
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consumer_profile_id, tenant_id, list_name)
);

-- Recent searches (for personalization)
CREATE TABLE IF NOT EXISTS public.consumer_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_profile_id UUID REFERENCES public.consumer_profiles(id) ON DELETE CASCADE,
  session_id TEXT, -- For non-logged-in users
  
  -- Search params
  search_query TEXT,
  cuisine_types TEXT[],
  price_range TEXT,
  location_city TEXT,
  party_size INTEGER,
  search_date DATE,
  
  -- Results
  clicked_restaurant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  resulted_in_booking BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumer_profiles_email ON public.consumer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_consumer_profiles_user ON public.consumer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_consumer ON public.consumer_favorites(consumer_profile_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tenant ON public.consumer_favorites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_history_consumer ON public.consumer_search_history(consumer_profile_id);
CREATE INDEX IF NOT EXISTS idx_search_history_session ON public.consumer_search_history(session_id);

-- RLS Policies
ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_search_history ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users manage own profile"
ON public.consumer_profiles FOR ALL
USING (auth.uid() = user_id);

-- Users manage their own favorites
CREATE POLICY "Users manage own favorites"
ON public.consumer_favorites FOR ALL
USING (
  consumer_profile_id IN (
    SELECT id FROM consumer_profiles WHERE user_id = auth.uid()
  )
);

-- Users view their own search history
CREATE POLICY "Users view own search history"
ON public.consumer_search_history FOR SELECT
USING (
  consumer_profile_id IN (
    SELECT id FROM consumer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow inserting search history
CREATE POLICY "Anyone can log searches"
ON public.consumer_search_history FOR INSERT
WITH CHECK (true);

-- Function to create consumer profile on user signup
CREATE OR REPLACE FUNCTION create_consumer_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create consumer profile for users with role 'consumer' or no role
  IF NEW.raw_user_meta_data->>'role' IS NULL 
     OR NEW.raw_user_meta_data->>'role' = 'consumer' THEN
    INSERT INTO public.consumer_profiles (
      user_id,
      email,
      first_name,
      last_name,
      phone
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.phone
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create consumer profiles
DROP TRIGGER IF EXISTS trigger_create_consumer_profile ON auth.users;
CREATE TRIGGER trigger_create_consumer_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_consumer_profile_on_signup();

-- Extend bookings table to support guest bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS consumer_profile_id UUID REFERENCES public.consumer_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN DEFAULT false;

-- Index for consumer bookings
CREATE INDEX IF NOT EXISTS idx_bookings_consumer ON public.bookings(consumer_profile_id);

-- Update RLS for bookings to allow guest access
CREATE POLICY "Guests can view their bookings by email"
ON public.bookings FOR SELECT
USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email' OR guest_email IS NULL);

COMMENT ON TABLE public.consumer_profiles IS 'Consumer/diner profiles for marketplace users';
COMMENT ON TABLE public.consumer_favorites IS 'User favorite restaurants and wishlists';
COMMENT ON TABLE public.consumer_search_history IS 'Search history for personalization';
