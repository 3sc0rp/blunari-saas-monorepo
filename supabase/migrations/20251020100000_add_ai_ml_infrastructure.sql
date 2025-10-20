-- AI/ML Infrastructure for Intelligent Features
-- Created: October 20, 2025
-- Purpose: Add machine learning models, predictions, recommendations, and demand forecasting

-- ============================================================================
-- 1. ML MODELS REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- 'demand_forecast', 'price_optimization', 'menu_recommendation', 'sentiment_analysis'
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) DEFAULT 'training', -- 'training', 'active', 'retired', 'failed'
  accuracy_score NUMERIC(5, 4), -- 0.0000 to 1.0000
  last_trained_at TIMESTAMPTZ,
  training_data_count INTEGER DEFAULT 0,
  hyperparameters JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_model_type CHECK (model_type IN ('demand_forecast', 'price_optimization', 'menu_recommendation', 'sentiment_analysis', 'churn_prediction', 'order_value_prediction')),
  CONSTRAINT valid_model_status CHECK (status IN ('training', 'active', 'retired', 'failed')),
  CONSTRAINT valid_accuracy CHECK (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1)),
  
  -- Unique constraint for tenant/name/version
  CONSTRAINT unique_model_version UNIQUE (tenant_id, name, version)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_tenant_type ON ml_models(tenant_id, model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ml_models_trained ON ml_models(last_trained_at DESC);

-- Enable RLS
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for ml_models" ON ml_models
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Create update trigger
CREATE TRIGGER update_ml_models_updated_at
BEFORE UPDATE ON ml_models
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ML PREDICTIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ml_models(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  confidence_score NUMERIC(5, 4),
  actual_outcome JSONB,
  feedback_rating INTEGER, -- 1-5 stars from user
  was_accurate BOOLEAN,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  CONSTRAINT valid_feedback CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_created ON ml_predictions(created_at DESC);

-- Enable RLS
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for ml_predictions" ON ml_predictions
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- ============================================================================
-- 3. MENU RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  catering_package_id UUID REFERENCES catering_packages(id) ON DELETE CASCADE,
  recommended_for VARCHAR(20) DEFAULT 'general', -- 'general', 'season', 'event_type', 'dietary'
  target_audience VARCHAR(100),
  reason TEXT,
  confidence_score NUMERIC(5, 4),
  predicted_popularity INTEGER, -- 1-100
  suggested_price NUMERIC(10, 2),
  expected_orders_per_month INTEGER,
  seasonal_factor NUMERIC(5, 2), -- 0.0 to 5.0 (multiplier)
  trend_direction VARCHAR(10), -- 'rising', 'stable', 'falling'
  last_recommended_at TIMESTAMPTZ DEFAULT NOW(),
  times_shown INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,
  times_ordered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_recommended_for CHECK (recommended_for IN ('general', 'season', 'event_type', 'dietary', 'budget', 'trending')),
  CONSTRAINT valid_trend CHECK (trend_direction IN ('rising', 'stable', 'falling')),
  CONSTRAINT valid_popularity CHECK (predicted_popularity >= 1 AND predicted_popularity <= 100),
  CONSTRAINT positive_expected_orders CHECK (expected_orders_per_month >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_recs_tenant ON menu_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_recs_package ON menu_recommendations(catering_package_id);
CREATE INDEX IF NOT EXISTS idx_menu_recs_confidence ON menu_recommendations(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_menu_recs_popularity ON menu_recommendations(predicted_popularity DESC);

-- Enable RLS
ALTER TABLE menu_recommendations ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for menu_recommendations" ON menu_recommendations
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Create update trigger
CREATE TRIGGER update_menu_recommendations_updated_at
BEFORE UPDATE ON menu_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. DEMAND FORECASTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_type VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  catering_package_id UUID REFERENCES catering_packages(id) ON DELETE CASCADE,
  predicted_orders INTEGER NOT NULL,
  predicted_revenue NUMERIC(10, 2) NOT NULL,
  confidence_interval_lower INTEGER,
  confidence_interval_upper INTEGER,
  confidence_level NUMERIC(5, 4) DEFAULT 0.95, -- 95% confidence
  actual_orders INTEGER,
  actual_revenue NUMERIC(10, 2),
  forecast_error NUMERIC(10, 2), -- actual - predicted
  model_version VARCHAR(20),
  contributing_factors JSONB DEFAULT '[]'::jsonb, -- ['holiday', 'weather', 'promotion']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_forecast_type CHECK (forecast_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  CONSTRAINT positive_predicted_orders CHECK (predicted_orders >= 0),
  CONSTRAINT positive_predicted_revenue CHECK (predicted_revenue >= 0),
  
  -- Unique constraint for tenant/date/type/package
  CONSTRAINT unique_forecast UNIQUE (tenant_id, forecast_date, forecast_type, catering_package_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant_date ON demand_forecasts(tenant_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_type ON demand_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_package ON demand_forecasts(catering_package_id);

-- Enable RLS
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for demand_forecasts" ON demand_forecasts
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Create update trigger
CREATE TRIGGER update_demand_forecasts_updated_at
BEFORE UPDATE ON demand_forecasts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. DYNAMIC PRICING RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(30) NOT NULL, -- 'demand_based', 'time_based', 'inventory_based', 'competitor_based'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'expired'
  priority INTEGER DEFAULT 0, -- Higher priority rules apply first
  applies_to VARCHAR(20) DEFAULT 'all', -- 'all', 'specific_packages', 'categories'
  target_package_ids UUID[] DEFAULT ARRAY[]::UUID[],
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {'min_demand': 80, 'max_capacity': 100}
  price_adjustment_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'formula'
  adjustment_value NUMERIC(10, 2) NOT NULL,
  min_price NUMERIC(10, 2),
  max_price NUMERIC(10, 2),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  times_applied INTEGER DEFAULT 0,
  total_revenue_impact NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_rule_type CHECK (rule_type IN ('demand_based', 'time_based', 'inventory_based', 'competitor_based', 'seasonal', 'event_based')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'expired')),
  CONSTRAINT valid_applies_to CHECK (applies_to IN ('all', 'specific_packages', 'categories')),
  CONSTRAINT valid_adjustment_type CHECK (price_adjustment_type IN ('percentage', 'fixed_amount', 'formula')),
  CONSTRAINT valid_price_range CHECK (min_price IS NULL OR max_price IS NULL OR min_price <= max_price)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_status ON pricing_rules(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_valid ON pricing_rules(valid_from, valid_until);

-- Enable RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for pricing_rules" ON pricing_rules
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Create update trigger
CREATE TRIGGER update_pricing_rules_updated_at
BEFORE UPDATE ON pricing_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. PRICING HISTORY (for auditing and analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  catering_package_id UUID REFERENCES catering_packages(id) ON DELETE CASCADE,
  pricing_rule_id UUID REFERENCES pricing_rules(id) ON DELETE SET NULL,
  original_price NUMERIC(10, 2) NOT NULL,
  adjusted_price NUMERIC(10, 2) NOT NULL,
  adjustment_reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  order_id UUID, -- If this pricing led to an order
  
  -- Constraints
  CONSTRAINT positive_prices CHECK (original_price >= 0 AND adjusted_price >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_history_tenant ON pricing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_package ON pricing_history(catering_package_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_applied ON pricing_history(applied_at DESC);

-- Enable RLS
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation
CREATE POLICY "Tenant isolation for pricing_history" ON pricing_history
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get active pricing rules for a package
CREATE OR REPLACE FUNCTION get_active_pricing_rules(
  p_tenant_id UUID,
  p_package_id UUID
) RETURNS TABLE (
  rule_id UUID,
  rule_name VARCHAR(100),
  adjustment_type VARCHAR(20),
  adjustment_value NUMERIC(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    name,
    price_adjustment_type,
    adjustment_value
  FROM pricing_rules
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (
      applies_to = 'all'
      OR (applies_to = 'specific_packages' AND p_package_id = ANY(target_package_ids))
    )
  ORDER BY priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_pricing_rules TO authenticated;

-- Function to calculate recommended price based on demand
CREATE OR REPLACE FUNCTION calculate_demand_based_price(
  p_base_price NUMERIC(10, 2),
  p_current_demand INTEGER,
  p_max_capacity INTEGER
) RETURNS NUMERIC(10, 2) AS $$
DECLARE
  v_demand_ratio NUMERIC;
  v_price_multiplier NUMERIC;
BEGIN
  -- Calculate demand ratio (0.0 to 1.0+)
  v_demand_ratio := p_current_demand::NUMERIC / NULLIF(p_max_capacity, 0);
  
  -- Apply pricing curve (exponential increase as capacity fills)
  IF v_demand_ratio < 0.5 THEN
    -- Low demand: slight discount (0.9x to 1.0x)
    v_price_multiplier := 0.9 + (v_demand_ratio * 0.2);
  ELSIF v_demand_ratio < 0.8 THEN
    -- Medium demand: standard price (1.0x to 1.1x)
    v_price_multiplier := 1.0 + ((v_demand_ratio - 0.5) * 0.333);
  ELSE
    -- High demand: premium price (1.1x to 1.3x)
    v_price_multiplier := 1.1 + ((v_demand_ratio - 0.8) * 1.0);
  END IF;
  
  -- Cap at 1.3x to avoid extreme prices
  v_price_multiplier := LEAST(v_price_multiplier, 1.3);
  
  -- Return adjusted price rounded to 2 decimals
  RETURN ROUND(p_base_price * v_price_multiplier, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_demand_based_price TO authenticated;

-- Function to get top menu recommendations
CREATE OR REPLACE FUNCTION get_top_menu_recommendations(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  package_id UUID,
  package_name VARCHAR(100),
  confidence_score NUMERIC(5, 4),
  predicted_popularity INTEGER,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.catering_package_id,
    cp.name,
    mr.confidence_score,
    mr.predicted_popularity,
    mr.reason
  FROM menu_recommendations mr
  JOIN catering_packages cp ON cp.id = mr.catering_package_id
  WHERE mr.tenant_id = p_tenant_id
    AND cp.is_active = true
  ORDER BY mr.confidence_score DESC, mr.predicted_popularity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_top_menu_recommendations TO authenticated;

-- ============================================================================
-- 8. SEED DATA
-- ============================================================================

-- Note: Seed data for ML models will be generated by Edge Functions
-- after analyzing tenant's historical data

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ml_models IS 'Registry of trained ML models for each tenant';
COMMENT ON TABLE ml_predictions IS 'Log of all predictions made by ML models with feedback';
COMMENT ON TABLE menu_recommendations IS 'AI-generated menu item recommendations based on trends and data';
COMMENT ON TABLE demand_forecasts IS 'Predicted demand for catering packages by date';
COMMENT ON TABLE pricing_rules IS 'Dynamic pricing rules based on various factors';
COMMENT ON TABLE pricing_history IS 'Audit trail of price adjustments and their reasons';

COMMENT ON COLUMN ml_models.model_type IS 'Type of ML model: demand_forecast, price_optimization, menu_recommendation, etc.';
COMMENT ON COLUMN ml_models.accuracy_score IS 'Model accuracy from 0.0 to 1.0 (null if not yet evaluated)';
COMMENT ON COLUMN ml_predictions.confidence_score IS 'Confidence level of prediction from 0.0 to 1.0';
COMMENT ON COLUMN menu_recommendations.seasonal_factor IS 'Multiplier for seasonal demand (1.0 = normal, 2.0 = double demand)';
COMMENT ON COLUMN demand_forecasts.confidence_interval_lower IS 'Lower bound of 95% confidence interval';
COMMENT ON COLUMN demand_forecasts.confidence_interval_upper IS 'Upper bound of 95% confidence interval';
COMMENT ON COLUMN pricing_rules.adjustment_value IS 'Value for adjustment (percentage or fixed amount)';

COMMENT ON FUNCTION get_active_pricing_rules IS 'Returns active pricing rules applicable to a specific package';
COMMENT ON FUNCTION calculate_demand_based_price IS 'Calculates optimal price based on demand ratio (0.9x to 1.3x base price)';
COMMENT ON FUNCTION get_top_menu_recommendations IS 'Returns top N menu recommendations for a tenant';

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration adds:
-- 1. ML models registry with versioning and metrics
-- 2. Predictions log for tracking AI recommendations
-- 3. Menu recommendations with confidence scores
-- 4. Demand forecasting with confidence intervals
-- 5. Dynamic pricing rules with multiple strategies
-- 6. Pricing history audit trail
-- 7. Helper functions for pricing and recommendations
-- 8. Full tenant isolation via RLS
-- 9. Indexes for performance optimization

-- ML models will be trained using historical data from:
-- - catering_orders (order patterns, revenue)
-- - catering_packages (popular items, pricing)
-- - bookings (customer behavior, trends)
-- - analytics_events (user interactions)

-- Edge Functions will handle:
-- - Model training and updates
-- - Real-time predictions
-- - Recommendation generation
-- - Price optimization calculations
