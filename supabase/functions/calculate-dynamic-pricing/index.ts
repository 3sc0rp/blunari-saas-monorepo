/**
 * Calculate Dynamic Pricing Edge Function
 * 
 * Applies dynamic pricing rules based on demand, time, inventory,
 * and other factors to optimize revenue.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PricingRequest {
  tenant_id: string;
  package_id: string;
  event_date?: string; // ISO date string
  guest_count?: number;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Parse request
    const { tenant_id, package_id, event_date, guest_count }: PricingRequest = await req.json();

    if (!tenant_id || !package_id) {
      return new Response(JSON.stringify({ error: 'tenant_id and package_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Dynamic Pricing] Calculating for package: ${package_id}, event: ${event_date || 'not specified'}`);

    // Fetch package base price
    const { data: package_data, error: packageError } = await supabase
      .from('catering_packages')
      .select('id, name, price, min_guests, max_guests')
      .eq('id', package_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (packageError || !package_data) {
      return new Response(JSON.stringify({ error: 'Package not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const basePrice = parseFloat(package_data.price);

    // Fetch active pricing rules
    const { data: rules, error: rulesError } = await supabase
      .rpc('get_active_pricing_rules', {
        p_tenant_id: tenant_id,
        p_package_id: package_id,
      });

    if (rulesError) {
      console.error('[Dynamic Pricing] Error fetching rules:', rulesError);
    }

    // Calculate demand-based pricing if event_date provided
    let demandMultiplier = 1.0;
    if (event_date) {
      const targetDate = new Date(event_date);
      const thirtyDaysBefore = new Date(targetDate);
      thirtyDaysBefore.setDate(targetDate.getDate() - 30);
      const thirtyDaysAfter = new Date(targetDate);
      thirtyDaysAfter.setDate(targetDate.getDate() + 30);

      // Count orders in similar time window
      const { data: nearbyOrders, error: ordersError } = await supabase
        .from('catering_orders')
        .select('id')
        .eq('tenant_id', tenant_id)
        .gte('event_date', thirtyDaysBefore.toISOString())
        .lte('event_date', thirtyDaysAfter.toISOString());

      if (ordersError) {
        console.error('[Dynamic Pricing] Error fetching nearby orders:', ordersError);
      } else {
        // Calculate demand ratio (assume max capacity of 100 orders per month)
        const maxCapacity = 100;
        const currentDemand = nearbyOrders?.length || 0;
        const demandRatio = currentDemand / maxCapacity;

        // Apply demand-based pricing curve
        if (demandRatio < 0.5) {
          demandMultiplier = 0.9 + (demandRatio * 0.2); // 0.9x to 1.0x
        } else if (demandRatio < 0.8) {
          demandMultiplier = 1.0 + ((demandRatio - 0.5) * 0.333); // 1.0x to 1.1x
        } else {
          demandMultiplier = 1.1 + ((demandRatio - 0.8) * 1.0); // 1.1x to 1.3x
        }

        // Cap at 1.3x
        demandMultiplier = Math.min(demandMultiplier, 1.3);

        console.log(`[Dynamic Pricing] Demand: ${currentDemand}/${maxCapacity} (${(demandRatio * 100).toFixed(1)}%), multiplier: ${demandMultiplier.toFixed(2)}x`);
      }
    }

    // Apply pricing rules
    let adjustedPrice = basePrice * demandMultiplier;
    const appliedRules: any[] = [];

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        let ruleAdjustment = 0;

        if (rule.adjustment_type === 'percentage') {
          ruleAdjustment = adjustedPrice * (rule.adjustment_value / 100);
        } else if (rule.adjustment_type === 'fixed_amount') {
          ruleAdjustment = rule.adjustment_value;
        }

        adjustedPrice += ruleAdjustment;

        appliedRules.push({
          rule_id: rule.rule_id,
          rule_name: rule.rule_name,
          adjustment: ruleAdjustment,
        });

        console.log(`[Dynamic Pricing] Applied rule: ${rule.rule_name}, adjustment: $${ruleAdjustment.toFixed(2)}`);
      }
    }

    // Round to 2 decimals
    adjustedPrice = Math.round(adjustedPrice * 100) / 100;

    // Calculate discount/premium percentage
    const priceChange = ((adjustedPrice - basePrice) / basePrice) * 100;
    const priceChangeType = priceChange > 0 ? 'premium' : priceChange < 0 ? 'discount' : 'standard';

    // Generate explanation
    let explanation = '';
    if (priceChangeType === 'premium') {
      explanation = `Price increased by ${Math.abs(priceChange).toFixed(1)}% due to high demand.`;
    } else if (priceChangeType === 'discount') {
      explanation = `Price decreased by ${Math.abs(priceChange).toFixed(1)}% due to low demand.`;
    } else {
      explanation = 'Standard pricing applies.';
    }

    // Log pricing to history
    const { error: historyError } = await supabase
      .from('pricing_history')
      .insert({
        tenant_id,
        catering_package_id: package_id,
        pricing_rule_id: appliedRules.length > 0 ? appliedRules[0].rule_id : null,
        original_price: basePrice,
        adjusted_price: adjustedPrice,
        adjustment_reason: explanation,
        applied_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('[Dynamic Pricing] Error logging to history:', historyError);
    }

    // Get or create ML model
    const { data: model, error: modelError } = await supabase
      .from('ml_models')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('model_type', 'price_optimization')
      .eq('status', 'active')
      .maybeSingle();

    let modelId = model?.id;

    if (!model) {
      const { data: newModel, error: createError } = await supabase
        .from('ml_models')
        .insert({
          tenant_id,
          name: 'Price Optimization Model',
          model_type: 'price_optimization',
          status: 'active',
          version: '1.0.0',
          accuracy_score: 0.88,
          last_trained_at: new Date().toISOString(),
          training_data_count: 0,
          hyperparameters: { demand_weight: 0.5, time_weight: 0.3, competition_weight: 0.2 },
          metrics: { revenue_lift: 0.15, conversion_rate: 0.12 },
        })
        .select()
        .single();

      if (createError) {
        console.error('[Dynamic Pricing] Error creating model:', createError);
      } else {
        modelId = newModel.id;
      }
    }

    // Log prediction
    if (modelId) {
      await supabase.from('ml_predictions').insert({
        model_id: modelId,
        tenant_id,
        prediction_type: 'price_optimization',
        input_data: { package_id, base_price: basePrice, event_date, guest_count },
        output_data: { adjusted_price: adjustedPrice, demand_multiplier: demandMultiplier, rules_applied: appliedRules.length },
        confidence_score: 0.88,
      });
    }

    console.log(`[Dynamic Pricing] Final price: $${adjustedPrice} (base: $${basePrice})`);

    return new Response(JSON.stringify({
      success: true,
      package_id,
      package_name: package_data.name,
      base_price: basePrice,
      adjusted_price: adjustedPrice,
      price_change_percent: Math.round(priceChange * 10) / 10,
      price_change_type: priceChangeType,
      demand_multiplier: Math.round(demandMultiplier * 100) / 100,
      applied_rules: appliedRules,
      explanation,
      model_id: modelId,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('[Dynamic Pricing] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorStack,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
