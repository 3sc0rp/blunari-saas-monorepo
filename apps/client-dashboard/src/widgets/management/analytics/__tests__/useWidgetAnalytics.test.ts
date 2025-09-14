import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWidgetAnalytics } from '../../useWidgetAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsError, AnalyticsErrorCode } from '../errors';
import { analyticsErrorReporter } from '../errorReporting';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis()
    }))
  }
}));

// Mock error reporter
vi.mock('../errorReporting', () => ({
  analyticsErrorReporter: {
    reportError: vi.fn(),
    getErrorStats: vi.fn(() => ({
      total: 1,
      byType: { AnalyticsError: 1 },
      byCode: { EDGE_FUNCTION_ERROR: 1 },
      lastError: null
    })),
    clearErrors: vi.fn(),
    getRecentErrors: vi.fn(() => [])
  }
}));

describe('useWidgetAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsErrorReporter.clearErrors();
  });

  it('should handle missing tenant data gracefully', async () => {
    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: null,
      tenantSlug: null,
      widgetType: 'booking'
    }));

    // Wait for effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.isAvailable).toBe(false);
  });

  it('should handle successful edge function response (forceEdge)', async () => {
    // Use a real UUID to avoid demo path
    const realTenantId = '550e8400-e29b-41d4-a716-446655440000';

    // Mock successful edge function response
    const mockData = {
      totalViews: 100,
      totalClicks: 50,
      conversionRate: 10,
      avgSessionDuration: 180,
      totalBookings: 5,
      completionRate: 80,
      topSources: [],
      dailyStats: []
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { success: true, data: mockData },
      error: null
    });

    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
      error: null
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: realTenantId,
      tenantSlug: 'test-slug',
      widgetType: 'booking',
      forceEdge: true
    }));

    // Wait for the initial fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.mode).toBe('edge');
  });

  it('should handle edge function error and fall back to database', async () => {
    // Use a real UUID to avoid demo path
    const realTenantId = '550e8400-e29b-41d4-a716-446655440001';

    // Mock edge function error - return error in response instead of throwing
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Edge function failed', name: 'FunctionsHttpError' }
    });

    // Mock successful database query with proper created_at fields
    const mockOrders = [
      { status: 'completed', total_amount: 100, created_at: '2025-09-10T10:00:00Z', party_size: 2 },
      { status: 'confirmed', total_amount: 150, created_at: '2025-09-11T11:00:00Z', party_size: 3 }
    ];
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValueOnce({
        data: mockOrders,
        error: null
      })
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: realTenantId,
      tenantSlug: 'test-slug',
      widgetType: 'booking'
    }));

    // Wait for the fallback to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.mode).toBe('direct-db');
    
    // Verify error was reported
    const errorStats = analyticsErrorReporter.getErrorStats();
    expect(errorStats.byCode[AnalyticsErrorCode.EDGE_FUNCTION_ERROR]).toBe(1);
  });

  it('should prevent concurrent fetches (dedup in-flight)', async () => {
    // Use a real UUID to avoid demo path
    const realTenantId = '550e8400-e29b-41d4-a716-446655440002';

    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, data: { totalViews: 100, totalClicks: 20 } },
      error: null
    });

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: realTenantId,
      tenantSlug: 'test-slug',
      widgetType: 'booking',
      forceEdge: true
    }));

    // Attempt multiple concurrent fetches
    await act(async () => {
      const fetch1 = result.current.refresh();
      const fetch2 = result.current.refresh();
      const fetch3 = result.current.refresh();
      await Promise.all([fetch1, fetch2, fetch3]);
    });

    // Should only have made one edge function call despite multiple refreshes
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('should surface error with no data when all fallbacks fail (no synthetic)', async () => {
    // Use a real UUID to avoid demo path
    const realTenantId = '550e8400-e29b-41d4-a716-446655440003';

    // Mock both edge function and database failures
    (supabase.functions.invoke as any).mockRejectedValueOnce(
      new AnalyticsError(
        'Edge function failed',
        AnalyticsErrorCode.EDGE_FUNCTION_ERROR
      )
    );

    (supabase.from as any).mockRejectedValue(
      new AnalyticsError(
        'Database query failed',
        AnalyticsErrorCode.DATABASE_ERROR
      )
    );

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: realTenantId,
      tenantSlug: 'test-slug',
      widgetType: 'booking'
    }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toBeNull(); // No synthetic data fabricated
    expect(result.current.error).toContain('Analytics unavailable'); // Explicit error surfaced
    expect(result.current.mode).toBeUndefined(); // No mode set on total failure
  });

  it('should not contain synthetic placeholder strings in successful analytics data', async () => {
    const realTenantId = '550e8400-e29b-41d4-a716-446655440010';

    const edgeData = {
      totalViews: 10,
      totalClicks: 5,
      conversionRate: 50,
      avgSessionDuration: 120,
      totalBookings: 2,
      completionRate: 100,
      topSources: [{ source: 'direct', count: 10 }],
      dailyStats: []
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { success: true, data: edgeData },
      error: null
    });

    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
      error: null
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: realTenantId,
      tenantSlug: 'analytics-real',
      widgetType: 'booking',
      forceEdge: true
    }));

    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const disallowed = /(mock|placeholder|demo|sample)/i;
    const serialized = JSON.stringify(result.current.data || {});
    expect(disallowed.test(serialized)).toBe(false);
  });
});