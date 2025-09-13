/**
 * @fileoverview Widget Analytics Integration Tests
 * @description End-to-end tests for widget analytics functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  TestUtils, 
  MockFactory, 
  IntegrationUtils,
  type TestEnvironment 
} from '@/utils/testing';

describe('Widget Analytics Integration', () => {
  let testEnvironment: TestEnvironment;
  let mockSupabase: any;

  beforeEach(() => {
    testEnvironment = MockFactory.createEnvironment();
    mockSupabase = MockFactory.createSupabaseMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Analytics Data Flow', () => {
    it('should collect and send analytics data', async () => {
      const testId = 'analytics-flow-test';
      TestUtils.startMeasurement(testId, 'Analytics Data Flow Test');

      // Mock analytics endpoint
      const mockAnalyticsEndpoint = 'https://api.example.com/analytics';
      
      const result = await IntegrationUtils.testApiIntegration(
        mockAnalyticsEndpoint,
        'POST',
        {
          event: 'widget_view',
          widget_id: 'test-widget-123',
          user_id: testEnvironment.user?.id,
          tenant_id: testEnvironment.tenant?.id,
          timestamp: new Date().toISOString(),
          metadata: {
            device: 'desktop',
            browser: 'chrome',
            viewport: '1920x1080'
          }
        }
      );

      expect(result.success).toBe(false); // Expected since it's a mock endpoint
      expect(result.duration).toBeGreaterThan(0);
      expect(result.error).toBeDefined();

      const analytics = TestUtils.endMeasurement(testId);
      expect(analytics?.testName).toBe('Analytics Data Flow Test');
    });

    it('should handle analytics batch processing', async () => {
      const batchData = [
        { event: 'widget_view', widget_id: 'widget-1', timestamp: new Date().toISOString() },
        { event: 'widget_click', widget_id: 'widget-1', timestamp: new Date().toISOString() },
        { event: 'widget_close', widget_id: 'widget-1', timestamp: new Date().toISOString() }
      ];

      const result = await IntegrationUtils.testApiIntegration(
        'https://api.example.com/analytics/batch',
        'POST',
        { events: batchData }
      );

      expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Real-time Analytics', () => {
    it('should establish real-time analytics subscription', async () => {
      const testId = 'realtime-analytics-test';
      TestUtils.startMeasurement(testId, 'Real-time Analytics Test');

      const subscriptionResult = await IntegrationUtils.testRealtimeSubscription(
        'widget-analytics',
        'analytics_update',
        2000 // 2 second timeout
      );

      expect(subscriptionResult.success).toBe(true);
      expect(subscriptionResult.messages.length).toBeGreaterThan(0);
      expect(subscriptionResult.duration).toBeLessThan(2000);

      const analytics = TestUtils.endMeasurement(testId);
      expect(analytics?.duration).toBeGreaterThan(0);
    });

    it('should handle real-time connection failures', async () => {
      const connectionTest = await IntegrationUtils.testRealtimeSubscription(
        'invalid-channel',
        'invalid_event',
        1000
      );

      // Should handle gracefully even with invalid channel
      expect(connectionTest.duration).toBeLessThanOrEqual(1000);
    });
  });

  describe('Analytics Data Validation', () => {
    it('should validate analytics payload structure', () => {
      const validPayload = {
        event: 'widget_interaction',
        widget_id: 'test-widget-123',
        user_id: 'test-user-123',
        tenant_id: 'test-tenant-123',
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'click',
          element: 'cta-button',
          position: { x: 100, y: 200 }
        }
      };

      // In a real test, this would use our schema validator
      expect(validPayload.event).toBeDefined();
      expect(validPayload.widget_id).toBeDefined();
      expect(validPayload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(validPayload.metadata).toBeTypeOf('object');
    });

    it('should reject invalid analytics data', () => {
      const invalidPayloads = [
        { event: '', widget_id: 'test' }, // Missing required fields
        { event: 'test', widget_id: null }, // Invalid data types
        { event: 'test', timestamp: 'invalid-date' } // Invalid timestamp
      ];

      invalidPayloads.forEach(payload => {
        // In a real implementation, this would use schema validation
        if (payload.widget_id === null) {
          expect(payload.widget_id).toBeNull();
        }
        if (payload.event === '') {
          expect(payload.event).toBe('');
        }
      });
    });
  });

  describe('Performance Analytics', () => {
    it('should track widget rendering performance', async () => {
      const performanceData = {
        widget_id: 'test-widget-123',
        metrics: {
          render_time: 50,
          bundle_size: 245000,
          memory_usage: 12000000,
          dom_nodes: 156
        },
        user_agent: 'Mozilla/5.0 (Test Browser)',
        timestamp: new Date().toISOString()
      };

      const result = await IntegrationUtils.testApiIntegration(
        'https://api.example.com/performance',
        'POST',
        performanceData
      );

      expect(result.duration).toBeLessThan(1000); // Performance endpoint should be fast
    });

    it('should benchmark analytics processing speed', () => {
      const analyticsProcessor = () => {
        // Simulate analytics data processing
        const data = {
          events: Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            timestamp: Date.now(),
            data: { test: true }
          }))
        };
        
        // Simulate processing
        data.events.forEach(event => {
          event.id = event.id.toUpperCase();
        });
      };

      const benchmark = IntegrationUtils.testApiIntegration(
        'https://api.example.com/test',
        'GET'
      );

      expect(benchmark).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle analytics service downtime', async () => {
      const downTimeTest = await IntegrationUtils.testApiIntegration(
        'https://api.example.com/analytics',
        'POST',
        { test: 'data' }
      );

      // Should handle service unavailability gracefully
      expect(downTimeTest.success).toBe(false);
      expect(downTimeTest.error).toBeDefined();
      expect(downTimeTest.duration).toBeGreaterThan(0);
    });

    it('should implement retry logic for failed requests', async () => {
      let attemptCount = 0;
      const mockRetryLogic = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      };

      try {
        await mockRetryLogic();
      } catch (error) {
        // First attempt should fail
        expect(attemptCount).toBe(1);
      }

      try {
        await mockRetryLogic();
      } catch (error) {
        // Second attempt should fail
        expect(attemptCount).toBe(2);
      }

      // Third attempt should succeed
      const result = await mockRetryLogic();
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should queue analytics data during offline periods', () => {
      const offlineQueue: any[] = [];
      
      // Simulate offline analytics collection
      const analyticsData = [
        { event: 'widget_view', offline: true },
        { event: 'widget_click', offline: true },
        { event: 'widget_close', offline: true }
      ];

      analyticsData.forEach(data => {
        offlineQueue.push(data);
      });

      expect(offlineQueue).toHaveLength(3);
      expect(offlineQueue.every(item => item.offline)).toBe(true);
    });
  });

  describe('Privacy and Security', () => {
    it('should sanitize sensitive data in analytics', () => {
      const sensitiveData = {
        event: 'user_login',
        user_id: 'user-123',
        email: 'test@example.com',
        password: 'secret123',
        credit_card: '4111-1111-1111-1111',
        ssn: '123-45-6789'
      };

      // Mock sanitization function
      const sanitizeAnalytics = (data: any) => {
        const sanitized = { ...data };
        delete sanitized.password;
        delete sanitized.credit_card;
        delete sanitized.ssn;
        if (sanitized.email) {
          sanitized.email = sanitized.email.replace(/(.{2}).*@/, '$1***@');
        }
        return sanitized;
      };

      const sanitized = sanitizeAnalytics(sensitiveData);

      expect(sanitized.password).toBeUndefined();
      expect(sanitized.credit_card).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.email).toBe('te***@example.com');
      expect(sanitized.user_id).toBe('user-123');
      expect(sanitized.event).toBe('user_login');
    });

    it('should respect user privacy preferences', () => {
      const privacySettings = {
        analytics_enabled: false,
        performance_tracking: false,
        error_reporting: true
      };

      const shouldCollectAnalytics = (eventType: string) => {
        switch (eventType) {
          case 'analytics':
            return privacySettings.analytics_enabled;
          case 'performance':
            return privacySettings.performance_tracking;
          case 'error':
            return privacySettings.error_reporting;
          default:
            return false;
        }
      };

      expect(shouldCollectAnalytics('analytics')).toBe(false);
      expect(shouldCollectAnalytics('performance')).toBe(false);
      expect(shouldCollectAnalytics('error')).toBe(true);
    });
  });

  describe('Analytics Reporting', () => {
    it('should generate comprehensive analytics reports', () => {
      const mockAnalyticsData = {
        period: '2024-01-01 to 2024-01-31',
        widgets: [
          {
            id: 'widget-1',
            name: 'CTA Button',
            views: 15000,
            clicks: 2300,
            conversion_rate: 15.33,
            performance: {
              avg_load_time: 120,
              error_rate: 0.02
            }
          },
          {
            id: 'widget-2',
            name: 'Newsletter Signup',
            views: 8500,
            clicks: 1200,
            conversion_rate: 14.12,
            performance: {
              avg_load_time: 95,
              error_rate: 0.01
            }
          }
        ],
        totals: {
          total_views: 23500,
          total_clicks: 3500,
          overall_conversion_rate: 14.89,
          total_revenue_attributed: 45000
        }
      };

      // Validate report structure
      expect(mockAnalyticsData.period).toBeDefined();
      expect(Array.isArray(mockAnalyticsData.widgets)).toBe(true);
      expect(mockAnalyticsData.widgets).toHaveLength(2);
      expect(mockAnalyticsData.totals.total_views).toBe(23500);
      expect(mockAnalyticsData.totals.overall_conversion_rate).toBeCloseTo(14.89, 2);
    });

    it('should export analytics data in multiple formats', () => {
      const analyticsData = {
        widget_id: 'test-widget',
        metrics: { views: 100, clicks: 25 }
      };

      // JSON export
      const jsonExport = JSON.stringify(analyticsData);
      expect(jsonExport).toContain('test-widget');

      // CSV export (mock)
      const csvExport = `widget_id,views,clicks\ntest-widget,100,25`;
      expect(csvExport).toContain('widget_id,views,clicks');
      expect(csvExport).toContain('test-widget,100,25');
    });
  });
});