/**
 * Update Currency Exchange Rates
 * 
 * Fetches latest exchange rates from exchangerate-api.com
 * and updates the currency_exchange_rates table.
 * 
 * Scheduled to run daily via Supabase cron or triggered manually.
 * Free tier: 1,500 requests/month
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest';
const BASE_CURRENCY = 'USD';

// Supported currencies
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 
  'CNY', 'INR', 'MXN', 'BRL'
];

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching exchange rates from API...');

    // Fetch latest rates from exchangerate-api.com
    const response = await fetch(`${EXCHANGE_RATE_API_URL}/${BASE_CURRENCY}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    console.log(`Received rates for ${Object.keys(data.rates).length} currencies`);

    // Prepare rate updates
    const rateUpdates = [];
    const timestamp = new Date().toISOString();

    // Update rates for supported currencies
    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency === BASE_CURRENCY) continue;
      
      const rate = data.rates[currency];
      if (!rate) {
        console.warn(`Rate not found for ${currency}`);
        continue;
      }

      // Add forward rate (USD -> Currency)
      rateUpdates.push({
        from_currency: BASE_CURRENCY,
        to_currency: currency,
        rate: rate,
        source: 'exchangerate-api',
        fetched_at: timestamp,
      });

      // Add reverse rate (Currency -> USD)
      rateUpdates.push({
        from_currency: currency,
        to_currency: BASE_CURRENCY,
        rate: 1 / rate,
        source: 'exchangerate-api',
        fetched_at: timestamp,
      });
    }

    // Also add cross-rates for major currencies
    const majorCurrencies = ['EUR', 'GBP', 'JPY'];
    for (const fromCurrency of majorCurrencies) {
      for (const toCurrency of majorCurrencies) {
        if (fromCurrency === toCurrency) continue;
        
        const fromRate = data.rates[fromCurrency];
        const toRate = data.rates[toCurrency];
        
        if (fromRate && toRate) {
          rateUpdates.push({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: toRate / fromRate,
            source: 'exchangerate-api',
            fetched_at: timestamp,
          });
        }
      }
    }

    console.log(`Prepared ${rateUpdates.length} rate updates`);

    // Upsert rates into database
    const { data: upsertData, error: upsertError } = await supabase
      .from('currency_exchange_rates')
      .upsert(rateUpdates, {
        onConflict: 'from_currency,to_currency',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Error upserting rates:', upsertError);
      throw upsertError;
    }

    console.log('Successfully updated exchange rates');

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange rates updated successfully',
        base_currency: BASE_CURRENCY,
        rates_updated: rateUpdates.length,
        fetched_at: timestamp,
        source: 'exchangerate-api',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating exchange rates:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to update exchange rates',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * USAGE:
 * 
 * Manual trigger:
 * curl -X POST https://<project-ref>.supabase.co/functions/v1/update-exchange-rates \
 *   -H "Authorization: Bearer <anon-key>"
 * 
 * Scheduled via Supabase cron (pg_cron):
 * SELECT cron.schedule(
 *   'update-exchange-rates',
 *   '0 0 * * *', -- Daily at midnight UTC
 *   $$SELECT net.http_post(
 *     'https://<project-ref>.supabase.co/functions/v1/update-exchange-rates',
 *     headers:='{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *   )$$
 * );
 * 
 * ALTERNATIVE API PROVIDERS:
 * - exchangerate-api.com (Free: 1,500 req/month)
 * - exchangeratesapi.io (Free: 250 req/month)
 * - currencyapi.com (Free: 300 req/month)
 * - openexchangerates.org (Free: 1,000 req/month)
 */
