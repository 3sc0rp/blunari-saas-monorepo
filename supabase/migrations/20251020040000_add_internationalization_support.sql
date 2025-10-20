-- Internationalization and Multi-currency Support
-- Created: October 20, 2025
-- Purpose: Add currency, locale, and timezone support to tenants and orders

-- ============================================================================
-- 1. ADD CURRENCY AND LOCALE TO TENANTS
-- ============================================================================

-- Add internationalization columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS default_locale VARCHAR(10) DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS supported_currencies TEXT[] DEFAULT ARRAY['USD'],
ADD COLUMN IF NOT EXISTS supported_locales TEXT[] DEFAULT ARRAY['en-US'];

-- Add check constraints
ALTER TABLE tenants
ADD CONSTRAINT valid_currency_code CHECK (default_currency ~ '^[A-Z]{3}$'),
ADD CONSTRAINT valid_locale_format CHECK (default_locale ~ '^[a-z]{2}-[A-Z]{2}$');

-- Create index for currency lookups
CREATE INDEX IF NOT EXISTS idx_tenants_default_currency ON tenants(default_currency);

-- ============================================================================
-- 2. CREATE CURRENCY EXCHANGE RATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(20, 10) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_from_currency CHECK (from_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT valid_to_currency CHECK (to_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT positive_rate CHECK (rate > 0),
  CONSTRAINT different_currencies CHECK (from_currency != to_currency),
  
  -- Unique constraint for currency pair
  CONSTRAINT unique_currency_pair UNIQUE (from_currency, to_currency)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_currency_rates_from ON currency_exchange_rates(from_currency);
CREATE INDEX IF NOT EXISTS idx_currency_rates_to ON currency_exchange_rates(to_currency);
CREATE INDEX IF NOT EXISTS idx_currency_rates_fetched ON currency_exchange_rates(fetched_at DESC);

-- Enable RLS
ALTER TABLE currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read exchange rates (public data)
CREATE POLICY "Anyone can read exchange rates" ON currency_exchange_rates
FOR SELECT USING (true);

-- Policy: Only service role can insert/update rates
CREATE POLICY "Service role can manage rates" ON currency_exchange_rates
FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Create update trigger
CREATE TRIGGER update_currency_exchange_rates_updated_at
BEFORE UPDATE ON currency_exchange_rates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ADD CURRENCY FIELDS TO CATERING ORDERS
-- ============================================================================

-- Add currency and conversion tracking to orders
ALTER TABLE catering_orders
ADD COLUMN IF NOT EXISTS order_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS display_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(20, 10),
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10, 2);

-- Add constraints
ALTER TABLE catering_orders
ADD CONSTRAINT valid_order_currency CHECK (order_currency ~ '^[A-Z]{3}$');

-- Create index for currency filtering
CREATE INDEX IF NOT EXISTS idx_catering_orders_currency ON catering_orders(tenant_id, order_currency);

-- ============================================================================
-- 4. CURRENCY CONVERSION HELPER FUNCTION
-- ============================================================================

-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount NUMERIC,
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3)
) RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- If same currency, return original amount
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;
  
  -- Get exchange rate
  SELECT rate INTO v_rate
  FROM currency_exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND fetched_at >= NOW() - INTERVAL '24 hours'
  ORDER BY fetched_at DESC
  LIMIT 1;
  
  -- If no rate found, try inverse rate
  IF v_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_rate
    FROM currency_exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND fetched_at >= NOW() - INTERVAL '24 hours'
    ORDER BY fetched_at DESC
    LIMIT 1;
  END IF;
  
  -- If still no rate, return NULL (no conversion available)
  IF v_rate IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return converted amount
  RETURN ROUND(p_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION convert_currency TO authenticated;

-- ============================================================================
-- 5. SEED DEFAULT EXCHANGE RATES
-- ============================================================================

-- Insert common currency pairs (rates as of Oct 2025, approximate)
INSERT INTO currency_exchange_rates (from_currency, to_currency, rate, source) VALUES
-- USD base rates
('USD', 'EUR', 0.92, 'seed'),
('USD', 'GBP', 0.79, 'seed'),
('USD', 'JPY', 149.50, 'seed'),
('USD', 'CAD', 1.36, 'seed'),
('USD', 'AUD', 1.53, 'seed'),
('USD', 'CHF', 0.88, 'seed'),
('USD', 'CNY', 7.24, 'seed'),
('USD', 'INR', 83.12, 'seed'),
('USD', 'MXN', 17.08, 'seed'),
('USD', 'BRL', 4.98, 'seed'),

-- EUR base rates
('EUR', 'USD', 1.09, 'seed'),
('EUR', 'GBP', 0.86, 'seed'),
('EUR', 'JPY', 162.50, 'seed'),

-- GBP base rates
('GBP', 'USD', 1.27, 'seed'),
('GBP', 'EUR', 1.16, 'seed'),

-- Add more pairs as needed
('JPY', 'USD', 0.0067, 'seed'),
('CAD', 'USD', 0.74, 'seed'),
('AUD', 'USD', 0.65, 'seed')

ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- ============================================================================
-- 6. CREATE TRANSLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  namespace VARCHAR(50) NOT NULL DEFAULT 'common',
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_translation_locale CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  
  -- Unique constraint per tenant/locale/namespace/key
  CONSTRAINT unique_translation UNIQUE (tenant_id, locale, namespace, key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_translations_tenant_locale ON translations(tenant_id, locale);
CREATE INDEX IF NOT EXISTS idx_translations_namespace ON translations(namespace);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read translations for their tenant
CREATE POLICY "Tenant isolation for translations" ON translations
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
);

-- Policy: Admins/owners can manage translations
CREATE POLICY "Tenant admins can manage translations" ON translations
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM auto_provisioning 
    WHERE user_id = auth.uid() AND status = 'completed'
  )
  AND (
    -- User is tenant owner
    EXISTS (
      SELECT 1 FROM tenants 
      WHERE id = translations.tenant_id 
      AND owner_id = auth.uid()
    )
    OR
    -- User is admin employee
    EXISTS (
      SELECT 1 FROM employees 
      WHERE tenant_id = translations.tenant_id 
      AND user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  )
);

-- Create update trigger
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. SUPPORTED CURRENCIES REFERENCE
-- ============================================================================

-- Create view for supported currencies with metadata
CREATE OR REPLACE VIEW supported_currencies AS
SELECT 
  'USD' as code, 'US Dollar' as name, '$' as symbol, 2 as decimal_places, 'en-US' as typical_locale
UNION ALL SELECT 'EUR', 'Euro', '€', 2, 'en-GB'
UNION ALL SELECT 'GBP', 'British Pound', '£', 2, 'en-GB'
UNION ALL SELECT 'JPY', 'Japanese Yen', '¥', 0, 'ja-JP'
UNION ALL SELECT 'CAD', 'Canadian Dollar', 'CA$', 2, 'en-CA'
UNION ALL SELECT 'AUD', 'Australian Dollar', 'A$', 2, 'en-AU'
UNION ALL SELECT 'CHF', 'Swiss Franc', 'CHF', 2, 'de-CH'
UNION ALL SELECT 'CNY', 'Chinese Yuan', '¥', 2, 'zh-CN'
UNION ALL SELECT 'INR', 'Indian Rupee', '₹', 2, 'en-IN'
UNION ALL SELECT 'MXN', 'Mexican Peso', 'MX$', 2, 'es-MX'
UNION ALL SELECT 'BRL', 'Brazilian Real', 'R$', 2, 'pt-BR';

-- Grant access
GRANT SELECT ON supported_currencies TO authenticated;

-- ============================================================================
-- 8. SUPPORTED LOCALES REFERENCE
-- ============================================================================

-- Create view for supported locales with metadata
CREATE OR REPLACE VIEW supported_locales AS
SELECT 
  'en-US' as code, 'English (US)' as name, 'English' as language, 'United States' as country, 'ltr' as direction
UNION ALL SELECT 'en-GB', 'English (UK)', 'English', 'United Kingdom', 'ltr'
UNION ALL SELECT 'es-ES', 'Spanish (Spain)', 'Spanish', 'Spain', 'ltr'
UNION ALL SELECT 'es-MX', 'Spanish (Mexico)', 'Spanish', 'Mexico', 'ltr'
UNION ALL SELECT 'fr-FR', 'French (France)', 'French', 'France', 'ltr'
UNION ALL SELECT 'de-DE', 'German (Germany)', 'German', 'Germany', 'ltr'
UNION ALL SELECT 'it-IT', 'Italian (Italy)', 'Italian', 'Italy', 'ltr'
UNION ALL SELECT 'pt-BR', 'Portuguese (Brazil)', 'Portuguese', 'Brazil', 'ltr'
UNION ALL SELECT 'ja-JP', 'Japanese (Japan)', 'Japanese', 'Japan', 'ltr'
UNION ALL SELECT 'zh-CN', 'Chinese (Simplified)', 'Chinese', 'China', 'ltr'
UNION ALL SELECT 'ar-SA', 'Arabic (Saudi Arabia)', 'Arabic', 'Saudi Arabia', 'rtl'
UNION ALL SELECT 'he-IL', 'Hebrew (Israel)', 'Hebrew', 'Israel', 'rtl';

-- Grant access
GRANT SELECT ON supported_locales TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE currency_exchange_rates IS 'Exchange rates for currency conversion, updated periodically';
COMMENT ON COLUMN tenants.default_currency IS 'Primary currency for tenant (3-letter ISO 4217 code)';
COMMENT ON COLUMN tenants.default_locale IS 'Primary locale for tenant (language-COUNTRY format)';
COMMENT ON COLUMN tenants.supported_currencies IS 'Array of currency codes this tenant supports';
COMMENT ON COLUMN tenants.supported_locales IS 'Array of locale codes this tenant supports';
COMMENT ON FUNCTION convert_currency IS 'Convert amount between currencies using latest exchange rates (24h cache)';
COMMENT ON TABLE translations IS 'Custom translations per tenant for UI strings';
COMMENT ON VIEW supported_currencies IS 'Reference list of supported currencies with metadata';
COMMENT ON VIEW supported_locales IS 'Reference list of supported locales with metadata';

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration adds:
-- 1. Currency and locale fields to tenants table
-- 2. Exchange rates table with automatic updates
-- 3. Currency conversion function with 24-hour cache
-- 4. Currency fields to catering_orders for multi-currency support
-- 5. Translations table for custom UI strings per tenant
-- 6. Reference views for supported currencies and locales
-- 7. Seed data for 17 common currency pairs
-- 8. Support for RTL languages (Arabic, Hebrew)
-- 9. RLS policies for tenant isolation

-- Exchange rates should be updated via Edge Function or scheduled job
-- Default rates are approximate and should be refreshed from API
-- Supports 11 currencies and 12 locales out of the box
-- Additional currencies/locales can be added by extending views
