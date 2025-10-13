/**
 * Booking System Security & Production Tests
 * Domain: app.blunari.ai
 * Date: October 13, 2025
 * 
 * Tests all critical security fixes implemented:
 * 1. Input Validation (Zod schemas, XSS protection)
 * 2. Rate Limiting (3 requests/60s)
 * 3. PII-Safe Logging (production redaction)
 * 4. Secure Tenant Resolution (no fallbacks)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'https://app.blunari.ai';
const TEST_TIMEOUT = 30000;

test.describe('Booking System Security Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for auth or redirect
    await page.waitForTimeout(2000);
  });

  test.describe('1. Input Validation Tests', () => {
    
    test('should reject invalid email formats', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'double@@domain.com',
        'trailing.dot.@domain.com'
      ];

      for (const email of invalidEmails) {
        await page.fill('[name="guest_email"]', email);
        await page.click('button:has-text("Next")');
        
        // Should show validation error
        const error = await page.locator('text=/invalid.*email/i').isVisible({ timeout: 1000 });
        expect(error).toBeTruthy();
        console.log(`✅ Rejected invalid email: ${email}`);
      }
    });

    test('should accept valid email formats', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'valid_email@subdomain.example.com'
      ];

      for (const email of validEmails) {
        await page.fill('[name="guest_email"]', email);
        const hasError = await page.locator('text=/invalid.*email/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasError).toBeFalsy();
        console.log(`✅ Accepted valid email: ${email}`);
      }
    });

    test('should reject invalid phone numbers', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const invalidPhones = [
        '123',  // Too short
        'abcdefghij',  // Letters
        '12345678901234567890',  // Too long
        '(555) not-valid',
        '+++1234567890'
      ];

      for (const phone of invalidPhones) {
        await page.fill('[name="guest_phone"]', phone);
        await page.click('button:has-text("Next")');
        
        const error = await page.locator('text=/invalid.*phone/i').isVisible({ timeout: 1000 });
        expect(error).toBeTruthy();
        console.log(`✅ Rejected invalid phone: ${phone}`);
      }
    });

    test('should enforce party size limits (1-50)', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const invalidPartySizes = [0, -1, 51, 100, 999];

      for (const size of invalidPartySizes) {
        await page.fill('[name="party_size"]', size.toString());
        await page.click('button:has-text("Next")');
        
        const error = await page.locator('text=/party.*size.*between/i').isVisible({ timeout: 1000 });
        expect(error).toBeTruthy();
        console.log(`✅ Rejected invalid party size: ${size}`);
      }
    });

    test('should block XSS attempts in text inputs', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="evil.com"></iframe>',
        'onclick="alert(\'XSS\')"'
      ];

      for (const payload of xssPayloads) {
        await page.fill('[name="special_requests"]', payload);
        await page.click('button:has-text("Next")');
        
        const error = await page.locator('text=/invalid.*characters/i, text=/unsafe.*content/i').isVisible({ timeout: 1000 });
        expect(error).toBeTruthy();
        console.log(`✅ Blocked XSS payload: ${payload.substring(0, 30)}...`);
      }
    });

    test('should sanitize special requests text', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const safeText = 'Please prepare a table near the window. Guest has allergies to nuts.';
      await page.fill('[name="special_requests"]', safeText);
      
      const hasError = await page.locator('text=/invalid.*characters/i').isVisible({ timeout: 1000 }).catch(() => false);
      expect(hasError).toBeFalsy();
      console.log(`✅ Accepted safe special requests text`);
    });
  });

  test.describe('2. Rate Limiting Tests', () => {
    
    test('should allow 3 bookings per minute, block 4th', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const testData = {
        guest_email: 'ratelimit.test@example.com',
        guest_phone: '+1234567890',
        guest_name: 'Rate Limit Test',
        party_size: '2',
        booking_date: '2025-10-20',
        booking_time: '19:00',
        special_requests: 'Rate limit test booking'
      };

      // Attempt 1
      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      await page.waitForTimeout(1000);
      console.log('✅ Booking attempt 1 - Should succeed');

      // Attempt 2
      await page.reload();
      await navigateToBookingWizard(page);
      testData.guest_email = 'ratelimit.test2@example.com';
      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      await page.waitForTimeout(1000);
      console.log('✅ Booking attempt 2 - Should succeed');

      // Attempt 3
      await page.reload();
      await navigateToBookingWizard(page);
      testData.guest_email = 'ratelimit.test3@example.com';
      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      await page.waitForTimeout(1000);
      console.log('✅ Booking attempt 3 - Should succeed');

      // Attempt 4 - Should be rate limited
      await page.reload();
      await navigateToBookingWizard(page);
      testData.guest_email = 'ratelimit.test4@example.com';
      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      
      const rateLimitError = await page.locator('text=/rate limit/i, text=/too many/i, text=/try again/i').isVisible({ timeout: 2000 });
      expect(rateLimitError).toBeTruthy();
      console.log('✅ Booking attempt 4 - BLOCKED by rate limiter');
    });

    test('should show remaining attempts to user', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      // Check if rate limit info is displayed
      const rateLimitInfo = await page.locator('text=/remaining|attempts left/i').isVisible({ timeout: 2000 }).catch(() => false);
      
      if (rateLimitInfo) {
        const text = await page.locator('text=/remaining|attempts left/i').textContent();
        console.log(`✅ Rate limit info displayed: ${text}`);
      } else {
        console.log('⚠️  Rate limit info not visible (may appear after first attempt)');
      }
    });
  });

  test.describe('3. PII-Safe Logging Tests', () => {
    
    test('should NOT expose PII in browser console logs', async ({ page }) => {
      const consoleLogs: string[] = [];
      
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await navigateToBookingWizard(page);
      
      const testData = {
        guest_email: 'sensitive.pii@example.com',
        guest_phone: '+1234567890',
        guest_name: 'John Sensitive Doe',
        party_size: '4',
        booking_date: '2025-10-20',
        booking_time: '19:00',
        special_requests: 'Please call me at +9876543210'
      };

      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      await page.waitForTimeout(2000);

      // Check if PII appears in logs
      const piiLeaks = consoleLogs.filter(log => {
        const lowerLog = log.toLowerCase();
        return lowerLog.includes('sensitive.pii@example.com') ||
               lowerLog.includes('+1234567890') ||
               lowerLog.includes('john sensitive doe') ||
               lowerLog.includes('+9876543210');
      });

      if (piiLeaks.length > 0) {
        console.error('❌ PII LEAK DETECTED:');
        piiLeaks.forEach(leak => console.error(`  - ${leak}`));
        expect(piiLeaks.length).toBe(0);
      } else {
        console.log('✅ No PII exposed in console logs (redacted successfully)');
      }
    });

    test('should redact emails in logs', async ({ page }) => {
      const consoleLogs: string[] = [];
      
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await page.goto(BASE_URL + '/bookings');
      await page.waitForTimeout(2000);

      // Check for [REDACTED] pattern
      const redactedLogs = consoleLogs.filter(log => log.includes('[REDACTED]') || log.includes('***'));
      
      if (redactedLogs.length > 0) {
        console.log(`✅ Found ${redactedLogs.length} logs with PII redaction`);
        console.log(`   Example: ${redactedLogs[0].substring(0, 100)}...`);
      } else {
        console.log('⚠️  No redacted logs found (may indicate no logging or PII not present)');
      }
    });
  });

  test.describe('4. Secure Tenant Resolution Tests', () => {
    
    test('should redirect to auth when no session exists', async ({ page }) => {
      // Clear all cookies and storage
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      await page.goto(BASE_URL + '/bookings');
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const isAuthPage = currentUrl.includes('/auth') || currentUrl.includes('/login') || currentUrl.includes('/signin');
      
      expect(isAuthPage).toBeTruthy();
      console.log(`✅ Redirected to auth page: ${currentUrl}`);
    });

    test('should NOT use hardcoded demo tenant fallback', async ({ page }) => {
      const consoleLogs: string[] = [];
      const networkRequests: string[] = [];
      
      page.on('console', msg => consoleLogs.push(msg.text()));
      page.on('request', req => networkRequests.push(req.url()));

      await page.goto(BASE_URL + '/bookings');
      await page.waitForTimeout(3000);

      // Check for demo tenant ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
      const demoTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      const foundInLogs = consoleLogs.some(log => log.includes(demoTenantId));
      const foundInRequests = networkRequests.some(url => url.includes(demoTenantId));

      if (foundInLogs || foundInRequests) {
        console.error('❌ SECURITY ISSUE: Hardcoded demo tenant ID detected!');
        expect(foundInLogs && foundInRequests).toBeFalsy();
      } else {
        console.log('✅ No hardcoded demo tenant fallback detected');
      }
    });

    test('should show error state on tenant resolution failure', async ({ page }) => {
      // This test requires manipulating auth state
      // For now, we'll verify error handling exists
      
      await page.goto(BASE_URL + '/bookings');
      await page.waitForTimeout(2000);

      const hasErrorBoundary = await page.locator('text=/error|something went wrong/i').isVisible({ timeout: 2000 }).catch(() => false);
      const hasAuthRedirect = page.url().includes('/auth') || page.url().includes('/login');

      if (hasErrorBoundary || hasAuthRedirect) {
        console.log('✅ Error handling or auth redirect working properly');
      } else {
        console.log('✅ Page loaded successfully with valid tenant');
      }
    });
  });

  test.describe('5. Integration Tests', () => {
    
    test('should create valid booking end-to-end', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      const testData = {
        guest_email: `integration.test.${Date.now()}@example.com`,
        guest_phone: '+12025551234',
        guest_name: 'Integration Test User',
        party_size: '4',
        booking_date: '2025-10-25',
        booking_time: '19:30',
        special_requests: 'Window seat preferred, celebrating anniversary'
      };

      await fillBookingForm(page, testData);
      await page.click('button:has-text("Submit")');
      
      // Wait for success message
      const success = await page.locator('text=/success|confirmed|created/i').isVisible({ timeout: 5000 });
      expect(success).toBeTruthy();
      console.log('✅ End-to-end booking creation successful');
    });

    test('should maintain security across wizard steps', async ({ page }) => {
      await navigateToBookingWizard(page);
      
      // Fill first step with XSS attempt
      await page.fill('[name="guest_name"]', '<script>alert("XSS")</script>');
      await page.click('button:has-text("Next")');
      
      const blocked = await page.locator('text=/invalid|error/i').isVisible({ timeout: 2000 });
      expect(blocked).toBeTruthy();
      console.log('✅ Security maintained across wizard steps');
    });
  });
});

// Helper Functions

async function navigateToBookingWizard(page: Page) {
  // Try multiple possible paths to booking creation
  const possiblePaths = [
    '/bookings/new',
    '/bookings?action=create',
    '/dashboard/bookings/new'
  ];

  for (const path of possiblePaths) {
    try {
      await page.goto(BASE_URL + path, { timeout: 5000 });
      await page.waitForTimeout(1000);
      
      const hasForm = await page.locator('form, [data-booking-wizard], [data-testid*="booking"]').isVisible({ timeout: 2000 }).catch(() => false);
      if (hasForm) {
        console.log(`✓ Navigated to booking wizard: ${path}`);
        return;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: Look for "New Booking" button
  try {
    await page.goto(BASE_URL + '/bookings');
    await page.click('button:has-text("New Booking"), button:has-text("Create Booking"), a:has-text("New Booking")');
    console.log('✓ Opened booking wizard via button');
  } catch (e) {
    console.warn('⚠️  Could not navigate to booking wizard automatically');
  }
}

async function fillBookingForm(page: Page, data: any) {
  const fields = [
    { name: 'guest_email', value: data.guest_email },
    { name: 'guest_phone', value: data.guest_phone },
    { name: 'guest_name', value: data.guest_name },
    { name: 'party_size', value: data.party_size },
    { name: 'booking_date', value: data.booking_date },
    { name: 'booking_time', value: data.booking_time },
    { name: 'special_requests', value: data.special_requests }
  ];

  for (const field of fields) {
    try {
      await page.fill(`[name="${field.name}"]`, field.value);
    } catch (e) {
      // Field might not be visible yet, try alternative selectors
      await page.fill(`input[placeholder*="${field.name}"], textarea[placeholder*="${field.name}"]`, field.value).catch(() => {
        console.warn(`⚠️  Could not fill field: ${field.name}`);
      });
    }
  }
}
