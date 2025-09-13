import { renderHook, act } from '@testing-library/react';
import { useWidgetAnalytics } from '../../useWidgetAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsError, AnalyticsErrorCode } from '../errors';
import { analyticsErrorReporter } from '../errorReporting';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    },
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    }))
  }
}));

describe('useWidgetAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsErrorReporter.clearErrors();
  });

  it('should handle missing tenant data gracefully', async () => {
    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: null,
      tenantSlug: null,
      widgetType: 'booking'
    }));

    expect(result.current.error).toBe('Tenant information required for real analytics');
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle successful edge function response', async () => {
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

    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: mockData },
      error: null
    });

    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
      error: null
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: 'test-tenant',
      tenantSlug: 'test-slug',
      widgetType: 'booking'
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
    // Mock edge function error
    (supabase.functions.invoke as jest.Mock).mockRejectedValueOnce(
      new AnalyticsError(
        'Edge function failed',
        AnalyticsErrorCode.EDGE_FUNCTION_ERROR
      )
    );

    // Mock successful database query
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValueOnce({
        data: [{ status: 'completed', total_amount: 100 }],
        error: null
      })
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: 'test-tenant',
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

  it('should prevent concurrent fetches', async () => {
    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: 'test-tenant',
      tenantSlug: 'test-slug',
      widgetType: 'booking'
    }));

    // Attempt multiple concurrent fetches
    await act(async () => {
      const fetch1 = result.current.refresh();
      const fetch2 = result.current.refresh();
      const fetch3 = result.current.refresh();
      await Promise.all([fetch1, fetch2, fetch3]);
    });

    // Should only have made one edge function call
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('should handle complete failure gracefully', async () => {
    // Mock both edge function and database failures
    (supabase.functions.invoke as jest.Mock).mockRejectedValueOnce(
      new AnalyticsError(
        'Edge function failed',
        AnalyticsErrorCode.EDGE_FUNCTION_ERROR
      )
    );

    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockRejectedValueOnce(
        new AnalyticsError(
          'Database query failed',
          AnalyticsErrorCode.DATABASE_ERROR
        )
      )
    });

    const { result } = renderHook(() => useWidgetAnalytics({
      tenantId: 'test-tenant',
      tenantSlug: 'test-slug',
      widgetType: 'booking'
    }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Unable to load analytics data - please try again later');
    expect(result.current.mode).toBe('synthetic');
  });
});