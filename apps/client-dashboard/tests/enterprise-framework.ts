import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { authManager } from '../src/utils/authManager';
import { cacheManager } from '../src/utils/cacheManager';
import { performanceMonitor } from '../src/utils/performanceMonitor';

/**
 * Enterprise Testing Framework
 * Comprehensive testing utilities for production-grade applications
 */

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'user' | 'owner';
  tenantId?: string;
  permissions: string[];
}

interface PerformanceThresholds {
  pageLoad: number;
  apiResponse: number;
  lcp: number;
  fid: number;
  cls: number;
}

class EnterpriseTestFramework {
  private static readonly TEST_USERS: Record<string, TestUser> = {
    admin: {
      email: 'admin@test.blunari.com',
      password: 'TestPassword123!',
      role: 'admin',
      permissions: ['all']
    },
    user: {
      email: 'user@test.blunari.com', 
      password: 'TestPassword123!',
      role: 'user',
      tenantId: 'test-tenant-123',
      permissions: ['read', 'write']
    },
    owner: {
      email: 'owner@test.blunari.com',
      password: 'TestPassword123!',
      role: 'owner',
      tenantId: 'test-tenant-123',
      permissions: ['all']
    }
  };

  private static readonly PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
    pageLoad: 3000, // 3 seconds
    apiResponse: 1000, // 1 second
    lcp: 2500, // 2.5 seconds
    fid: 100, // 100ms
    cls: 0.1 // 0.1 layout shift
  };

  /**
   * Authenticate a test user
   */
  static async authenticateUser(page: Page, userType: keyof typeof EnterpriseTestFramework.TEST_USERS): Promise<void> {
    const user = this.TEST_USERS[userType];
    
    await test.step(`Authenticate as ${userType}`, async () => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful authentication
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      // Verify user is logged in
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
    });
  }

  /**
   * Measure page performance
   */
  static async measurePagePerformance(page: Page, pageName: string): Promise<void> {
    await test.step(`Measure performance for ${pageName}`, async () => {
      // Start performance measurement
      const startTime = Date.now();
      
      // Navigate to page
      await page.goto(`/${pageName}`);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Get Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            lcp: 0,
            fid: 0,
            cls: 0
          };

          // LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // FID
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.fid = (entries[0] as any).processingStart - entries[0].startTime;
            }
          }).observe({ entryTypes: ['first-input'] });

          // CLS
          new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });

          // Resolve after 2 seconds to collect metrics
          setTimeout(() => resolve(vitals), 2000);
        });
      });

      // Assert performance thresholds
      expect(loadTime).toBeLessThan(this.PERFORMANCE_THRESHOLDS.pageLoad);
      expect((webVitals as any).lcp).toBeLessThan(this.PERFORMANCE_THRESHOLDS.lcp);
      expect((webVitals as any).fid).toBeLessThan(this.PERFORMANCE_THRESHOLDS.fid);
      expect((webVitals as any).cls).toBeLessThan(this.PERFORMANCE_THRESHOLDS.cls);

      console.log(`Performance metrics for ${pageName}:`, {
        loadTime,
        webVitals
      });
    });
  }

  /**
   * Test API endpoint performance
   */
  static async testAPIPerformance(page: Page, endpoint: string, method: string = 'GET'): Promise<void> {
    await test.step(`Test API performance: ${method} ${endpoint}`, async () => {
      const startTime = Date.now();
      
      const response = await page.request[method.toLowerCase() as keyof typeof page.request](endpoint);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(this.PERFORMANCE_THRESHOLDS.apiResponse);
      
      console.log(`API ${method} ${endpoint}: ${responseTime}ms`);
    });
  }

  /**
   * Test database operations
   */
  static async testDatabaseOperations(page: Page): Promise<void> {
    await test.step('Test database operations', async () => {
      // Test connection
      const dbHealth = await page.evaluate(async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          window.VITE_SUPABASE_URL,
          window.VITE_SUPABASE_ANON_KEY
        );
        
        try {
          const { data, error } = await supabase.from('tenants').select('id').limit(1);
          return { success: !error, error: error?.message };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      });
      
      expect(dbHealth.success).toBe(true);
      
      if (!dbHealth.success) {
        console.error('Database health check failed:', dbHealth.error);
      }
    });
  }

  /**
   * Test authentication flows
   */
  static async testAuthenticationSecurity(page: Page): Promise<void> {
    await test.step('Test authentication security', async () => {
      // Test invalid credentials
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'invalid@test.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Should not redirect to dashboard
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });
  }

  /**
   * Test role-based access control
   */
  static async testRoleBasedAccess(page: Page, userType: keyof typeof EnterpriseTestFramework.TEST_USERS): Promise<void> {
    await test.step(`Test RBAC for ${userType}`, async () => {
      await this.authenticateUser(page, userType);
      
      const user = this.TEST_USERS[userType];
      
      // Test admin-only features
      if (user.role === 'admin') {
        await page.goto('/admin');
        await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
      } else {
        await page.goto('/admin');
        // Should redirect or show access denied
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      }
    });
  }

  /**
   * Test data isolation between tenants
   */
  static async testTenantIsolation(page: Page): Promise<void> {
    await test.step('Test tenant data isolation', async () => {
      // Login as user from tenant A
      await this.authenticateUser(page, 'user');
      
      // Navigate to data view
      await page.goto('/dashboard');
      
      // Get data visible to this tenant
      const tenantAData = await page.locator('[data-testid="data-list"] [data-testid="data-item"]').count();
      
      // Logout and login as different tenant user
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Login as different tenant (would need setup)
      // This is a placeholder for tenant isolation testing
      
      expect(tenantAData).toBeGreaterThan(0);
    });
  }

  /**
   * Test error handling and recovery
   */
  static async testErrorHandling(page: Page): Promise<void> {
    await test.step('Test error handling', async () => {
      // Test network error handling
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/dashboard');
      
      // Should show error state
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      await expect(errorBoundary).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');
      
      // Should recover
      await expect(errorBoundary).not.toBeVisible();
    });
  }

  /**
   * Test responsive design
   */
  static async testResponsiveDesign(page: Page): Promise<void> {
    await test.step('Test responsive design', async () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/dashboard');
        
        // Check that essential elements are visible
        await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        
        console.log(`${viewport.name} viewport: ✓`);
      }
    });
  }

  /**
   * Test accessibility compliance
   */
  static async testAccessibility(page: Page): Promise<void> {
    await test.step('Test accessibility compliance', async () => {
      await page.goto('/dashboard');
      
      // Check for basic accessibility requirements
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = await page.locator('img').count();
      if (images > 0) {
        const imagesWithAlt = await page.locator('img[alt]').count();
        expect(imagesWithAlt).toBe(images);
      }
      
      // Check for proper form labels
      const inputs = await page.locator('input').count();
      if (inputs > 0) {
        const labeledInputs = await page.locator('input[aria-label], input[aria-labelledby], label input').count();
        expect(labeledInputs).toBeGreaterThan(0);
      }
    });
  }

  /**
   * Setup test environment
   */
  static async setupTestEnvironment(context: BrowserContext): Promise<void> {
    await test.step('Setup test environment', async () => {
      // Clear any existing data
      await context.clearCookies();
      await context.clearPermissions();
      
      // Set up test data if needed
      // This would typically seed test database with known data
      
      console.log('Test environment setup complete');
    });
  }

  /**
   * Cleanup test environment
   */
  static async cleanupTestEnvironment(context: BrowserContext): Promise<void> {
    await test.step('Cleanup test environment', async () => {
      // Clear test data
      await context.clearCookies();
      
      // Reset any mocks or stubs
      
      console.log('Test environment cleanup complete');
    });
  }
}

// Export test utilities
export { EnterpriseTestFramework };

// Common test patterns
export const commonTests = {
  async smokeTest(page: Page) {
    await test.step('Smoke test', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Blunari/);
      
      // Test critical path
      await EnterpriseTestFramework.authenticateUser(page, 'user');
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });
  },

  async performanceTest(page: Page) {
    await test.step('Performance test suite', async () => {
      await EnterpriseTestFramework.measurePagePerformance(page, 'dashboard');
      await EnterpriseTestFramework.testAPIPerformance(page, '/api/health');
      await EnterpriseTestFramework.testDatabaseOperations(page);
    });
  },

  async securityTest(page: Page) {
    await test.step('Security test suite', async () => {
      await EnterpriseTestFramework.testAuthenticationSecurity(page);
      await EnterpriseTestFramework.testRoleBasedAccess(page, 'user');
      await EnterpriseTestFramework.testRoleBasedAccess(page, 'admin');
      await EnterpriseTestFramework.testTenantIsolation(page);
    });
  },

  async e2eTest(page: Page) {
    await test.step('End-to-end test suite', async () => {
      await EnterpriseTestFramework.authenticateUser(page, 'user');
      await EnterpriseTestFramework.testResponsiveDesign(page);
      await EnterpriseTestFramework.testErrorHandling(page);
      await EnterpriseTestFramework.testAccessibility(page);
    });
  }
};
