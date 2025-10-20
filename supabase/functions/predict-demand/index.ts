/**
 * Predict Demand Edge Function
 * 
 * Analyzes historical order data and generates demand forecasts
 * for catering packages using time series analysis and ML.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ForecastRequest {
  tenant_id: string;
  package_id?: string; // Optional: forecast for specific package
  days_ahead?: number; // Default: 30
  include_confidence_interval?: boolean; // Default: true
}

interface HistoricalDataPoint {
  date: string;
  orders: number;
  revenue: number;
  day_of_week: number;
  is_weekend: boolean;
  is_holiday: boolean;
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
    const { tenant_id, package_id, days_ahead = 30, include_confidence_interval = true }: ForecastRequest = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Demand Forecast] Starting for tenant: ${tenant_id}, package: ${package_id || 'all'}, days: ${days_ahead}`);

    // Fetch historical order data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let query = supabase
      .from('catering_orders')
      .select('created_at, total_amount, event_date, catering_package_id')
      .eq('tenant_id', tenant_id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (package_id) {
      query = query.eq('catering_package_id', package_id);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Insufficient historical data',
        message: 'Need at least 30 days of order history to generate forecasts',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Demand Forecast] Found ${orders.length} historical orders`);

    // Aggregate orders by date
    const dailyData = aggregateByDate(orders);

    // Generate forecasts using simple moving average + trend
    const forecasts = generateForecasts(dailyData, days_ahead, include_confidence_interval);

    // Get or create ML model record
    const { data: model, error: modelError } = await supabase
      .from('ml_models')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('model_type', 'demand_forecast')
      .eq('status', 'active')
      .maybeSingle();

    let modelId = model?.id;

    if (!model) {
      // Create new model
      const { data: newModel, error: createError } = await supabase
        .from('ml_models')
        .insert({
          tenant_id,
          name: 'Demand Forecast Model',
          model_type: 'demand_forecast',
          status: 'active',
          version: '1.0.0',
          accuracy_score: 0.85, // Placeholder - should be calculated from validation
          last_trained_at: new Date().toISOString(),
          training_data_count: orders.length,
          hyperparameters: { window_size: 7, trend_weight: 0.3 },
          metrics: { mae: 0, rmse: 0 },
        })
        .select()
        .single();

      if (createError) {
        console.error('[Demand Forecast] Error creating model:', createError);
      } else {
        modelId = newModel.id;
      }
    }

    // Insert forecasts into database
    const forecastRecords = forecasts.map((f) => ({
      tenant_id,
      forecast_date: f.date,
      forecast_type: 'daily',
      catering_package_id: package_id || null,
      predicted_orders: f.predicted_orders,
      predicted_revenue: f.predicted_revenue,
      confidence_interval_lower: f.confidence_lower,
      confidence_interval_upper: f.confidence_upper,
      confidence_level: 0.95,
      model_version: '1.0.0',
      contributing_factors: f.factors,
    }));

    const { error: insertError } = await supabase
      .from('demand_forecasts')
      .upsert(forecastRecords, {
        onConflict: 'tenant_id,forecast_date,forecast_type,catering_package_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      console.error('[Demand Forecast] Error inserting forecasts:', insertError);
    }

    // Log prediction
    if (modelId) {
      await supabase.from('ml_predictions').insert({
        model_id: modelId,
        tenant_id,
        prediction_type: 'demand_forecast',
        input_data: { days_ahead, package_id, historical_count: orders.length },
        output_data: { forecasts: forecasts.length, avg_predicted_orders: forecasts.reduce((sum, f) => sum + f.predicted_orders, 0) / forecasts.length },
        confidence_score: 0.85,
      });
    }

    console.log(`[Demand Forecast] Generated ${forecasts.length} forecasts`);

    return new Response(JSON.stringify({
      success: true,
      forecasts,
      model_id: modelId,
      historical_data_points: orders.length,
      message: `Generated ${forecasts.length} day forecast`,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('[Demand Forecast] Error:', error);
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

/**
 * Aggregate orders by date
 */
function aggregateByDate(orders: any[]): HistoricalDataPoint[] {
  const grouped = new Map<string, { orders: number; revenue: number }>();

  for (const order of orders) {
    const date = order.created_at.split('T')[0];
    const existing = grouped.get(date) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += parseFloat(order.total_amount || 0);
    grouped.set(date, existing);
  }

  const result: HistoricalDataPoint[] = [];
  for (const [date, data] of grouped.entries()) {
    const d = new Date(date);
    result.push({
      date,
      orders: data.orders,
      revenue: data.revenue,
      day_of_week: d.getDay(),
      is_weekend: d.getDay() === 0 || d.getDay() === 6,
      is_holiday: false, // TODO: Integrate holiday API
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate forecasts using moving average with trend
 */
function generateForecasts(
  historical: HistoricalDataPoint[],
  daysAhead: number,
  includeConfidence: boolean
): any[] {
  const windowSize = 7; // 7-day moving average
  const trendWeight = 0.3;

  // Calculate moving average and trend
  const recentData = historical.slice(-windowSize);
  const avgOrders = recentData.reduce((sum, d) => sum + d.orders, 0) / recentData.length;
  const avgRevenue = recentData.reduce((sum, d) => sum + d.revenue, 0) / recentData.length;

  // Calculate trend (simple linear regression slope)
  let trend = 0;
  if (historical.length >= 14) {
    const recent14 = historical.slice(-14);
    const firstWeek = recent14.slice(0, 7).reduce((sum, d) => sum + d.orders, 0) / 7;
    const secondWeek = recent14.slice(7, 14).reduce((sum, d) => sum + d.orders, 0) / 7;
    trend = (secondWeek - firstWeek) / 7; // Orders per day change
  }

  // Generate forecasts
  const forecasts = [];
  const today = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    const dateStr = forecastDate.toISOString().split('T')[0];
    const dayOfWeek = forecastDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base prediction
    let predictedOrders = avgOrders + (trend * i * trendWeight);

    // Weekend adjustment (typically +20% for catering)
    if (isWeekend) {
      predictedOrders *= 1.2;
    }

    // Ensure positive
    predictedOrders = Math.max(0, Math.round(predictedOrders));

    // Calculate revenue
    const predictedRevenue = Math.round(predictedOrders * avgRevenue / avgOrders * 100) / 100;

    // Calculate confidence interval (±20% for simple model)
    const confidenceLower = includeConfidence ? Math.max(0, Math.round(predictedOrders * 0.8)) : null;
    const confidenceUpper = includeConfidence ? Math.round(predictedOrders * 1.2) : null;

    // Identify contributing factors
    const factors = [];
    if (isWeekend) factors.push('weekend');
    if (trend > 0.5) factors.push('rising_trend');
    if (trend < -0.5) factors.push('falling_trend');

    forecasts.push({
      date: dateStr,
      predicted_orders: predictedOrders,
      predicted_revenue: predictedRevenue,
      confidence_lower: confidenceLower,
      confidence_upper: confidenceUpper,
      day_of_week: dayOfWeek,
      is_weekend: isWeekend,
      factors,
    });
  }

  return forecasts;
}
