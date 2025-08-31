import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth for consistent testing
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-token');
      window.localStorage.setItem('tenant-id', 'test-tenant');
    });
  });

  test('Dashboard page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="dashboard-metrics"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic content that changes between runs
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="live-counter"],
        .animate-pulse {
          visibility: hidden !important;
        }
      `
    });

    // Take snapshot
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });

  test('Bookings page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/bookings`);
    
    // Wait for bookings table to load
    await page.waitForSelector('[data-testid="bookings-table"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Hide time-sensitive content
    await page.addStyleTag({
      content: `
        [data-testid="booking-time"],
        [data-testid="relative-time"],
        .animate-pulse {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('bookings.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });

  test('Tables page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tables`);
    
    // Wait for floor plan to load
    await page.waitForSelector('[data-testid="floor-plan"]', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Wait for 3D elements if present
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('tables.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });

  test('Analytics page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/analytics`);
    
    // Wait for charts to render
    await page.waitForSelector('[data-testid="revenue-chart"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="booking-patterns-chart"]', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Wait for chart animations to complete
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('analytics.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });

  test('Booking widget steps visual snapshots', async ({ page }) => {
    // Step 1: Party size selection
    await page.goto(`${BASE_URL}/book/test-restaurant`);
    await page.waitForSelector('[data-testid="party-size-step"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('booking-widget-step-1.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    // Step 2: Date and time selection
    await page.click('[data-testid="party-size-2"]');
    await page.click('[data-testid="continue-button"]');
    await page.waitForSelector('[data-testid="datetime-step"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('booking-widget-step-2.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    // Step 3: Guest details
    await page.click('[data-testid="time-slot-1900"]'); // 7:00 PM slot
    await page.click('[data-testid="continue-button"]');
    await page.waitForSelector('[data-testid="guest-details-step"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('booking-widget-step-3.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    // Step 4: Confirmation
    await page.fill('[data-testid="guest-name"]', 'John Doe');
    await page.fill('[data-testid="guest-email"]', 'john@example.com');
    await page.fill('[data-testid="guest-phone"]', '+1-234-567-8900');
    await page.click('[data-testid="continue-button"]');
    await page.waitForSelector('[data-testid="confirmation-step"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('booking-widget-step-4.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('Mobile dashboard visual snapshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic content
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="live-counter"],
        .animate-pulse {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Dark mode visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Enable dark mode
    await page.addInitScript(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    await page.waitForSelector('[data-testid="dashboard-metrics"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic content
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="live-counter"],
        .animate-pulse {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });

  test('High contrast mode visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Enable high contrast mode
    await page.addInitScript(() => {
      document.documentElement.setAttribute('data-contrast', 'high');
    });
    
    await page.waitForSelector('[data-testid="dashboard-metrics"]', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 1024 }
    });
  });
});

// Accessibility visual tests
test.describe('Accessibility Visual Tests', () => {
  test('Focus states visual verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Focus on first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('focus-states.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 1280, height: 200 }
    });
  });

  test('Error states visual verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/bookings`);
    
    // Trigger validation errors in form
    await page.click('[data-testid="new-booking-button"]');
    await page.click('[data-testid="submit-button"]'); // Submit without filling
    
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    
    await expect(page).toHaveScreenshot('error-states.png', {
      animations: 'disabled',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });
});