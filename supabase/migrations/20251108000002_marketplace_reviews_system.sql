-- ============================================================================
-- CONSUMER MARKETPLACE: Reviews & Ratings System
-- Purpose: User reviews for restaurants with photos and verification
-- ============================================================================

-- Reviews table
CREATE TABLE IF NOT EXISTS public.restaurant_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  visit_date DATE,
  party_size INTEGER,
  occasion TEXT, -- 'date-night', 'business', 'family', 'celebration'
  
  -- Verification
  is_verified BOOLEAN DEFAULT false, -- Verified diner (had actual booking)
  is_anonymous BOOLEAN DEFAULT false,
  reviewer_name TEXT, -- For anonymous or guest reviews
  reviewer_email TEXT, -- For guest reviews
  
  -- Restaurant response
  restaurant_response TEXT,
  restaurant_responded_at TIMESTAMP WITH TIME ZONE,
  restaurant_responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Moderation
  is_published BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  -- Engagement
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Review helpfulness tracking
CREATE TABLE IF NOT EXISTS public.review_helpfulness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.restaurant_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON public.restaurant_reviews(tenant_id, is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.restaurant_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.restaurant_reviews(tenant_id, rating) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON public.restaurant_reviews(tenant_id, is_verified) WHERE is_verified = true AND is_published = true;
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.restaurant_reviews(created_at DESC);

-- RLS Policies for reviews
ALTER TABLE public.restaurant_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

-- Public can read published reviews
CREATE POLICY "Public can view published reviews"
ON public.restaurant_reviews FOR SELECT
USING (is_published = true);

-- Users can create reviews
CREATE POLICY "Users can create reviews"
ON public.restaurant_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.restaurant_reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Tenant owners can respond to reviews
CREATE POLICY "Tenant owners can respond to reviews"
ON public.restaurant_reviews FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Users can mark reviews helpful
CREATE POLICY "Users can mark reviews helpful"
ON public.review_helpfulness FOR ALL
USING (auth.uid() = user_id);

-- Function to update restaurant average rating
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tenants SET
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM restaurant_reviews
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
        AND is_published = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM restaurant_reviews
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
        AND is_published = true
    )
  WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update ratings automatically
DROP TRIGGER IF EXISTS trigger_update_restaurant_rating ON public.restaurant_reviews;
CREATE TRIGGER trigger_update_restaurant_rating
AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_rating();

-- Function to update helpfulness counts
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurant_reviews SET
    helpful_count = (
      SELECT COUNT(*) FROM review_helpfulness 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) AND is_helpful = true
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM review_helpfulness 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) AND is_helpful = false
    )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for helpfulness
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness ON public.review_helpfulness;
CREATE TRIGGER trigger_update_review_helpfulness
AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
FOR EACH ROW
EXECUTE FUNCTION update_review_helpfulness();

COMMENT ON TABLE public.restaurant_reviews IS 'User reviews and ratings for restaurants';
COMMENT ON TABLE public.review_helpfulness IS 'Tracks which users found reviews helpful';
