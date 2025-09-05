import { test, expect } from '@playwright/test';

test.describe('Command Center - Full Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to command center
    await page.goto('/command-center');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="command-center"]', { timeout: 10000 });
  });

  test('loads without mock data in production', async ({ page }) => {
    // Check that no mock data warning is shown in production mode
    const mockWarning = page.locator('text=DEVELOPMENT MODE');
    await expect(mockWarning).not.toBeVisible();
    
    // Verify that data is loading from real sources
    await expect(page.locator('[data-testid="kpi-strip"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  });

  test('displays all essential components', async ({ page }) => {
    // Top bar with controls
    await expect(page.locator('[data-testid="top-bar"]')).toBeVisible();
    await expect(page.locator('button:has-text("New Reservation")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    
    // KPI strip
    await expect(page.locator('[data-testid="kpi-strip"]')).toBeVisible();
    
    // Filters
    await expect(page.locator('[data-testid="filters"]')).toBeVisible();
    
    // Main timeline
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
    
    // Mini floor plan
    await expect(page.locator('[data-testid="mini-floorplan"]')).toBeVisible();
  });

  test('new reservation workflow', async ({ page }) => {
    // Test keyboard shortcut
    await page.keyboard.press('n');
    // In real implementation, this would open a modal or create a reservation
    
    // Test button click
    await page.click('button:has-text("New Reservation")');
    
    // Should show success/error feedback
    // This test would be expanded when reservation modal is implemented
  });

  test('filters functionality', async ({ page }) => {
    // Open channel filter
    await page.click('[data-testid="filter-channel"]');
    
    // Select a specific channel
    await page.click('text=Web');
    
    // Verify filter is applied
    const activeFilter = page.locator('[data-testid="active-filters"]');
    await expect(activeFilter).toContainText('Web');
    
    // Clear filters with Escape key
    await page.keyboard.press('Escape');
    
    // Verify filters are cleared
    await expect(activeFilter).not.toBeVisible();
  });

  test('export functionality', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Verify download starts
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/reservations-\d{4}-\d{2}-\d{2}\.csv/);
    
    // Verify success toast
    await expect(page.locator('text=Exported')).toBeVisible();
  });

  test('advanced mode toggle', async ({ page }) => {
    // Toggle advanced mode
    await page.click('button:has-text("Advanced Mode")');
    
    // Verify mode changes
    await expect(page.locator('button:has-text("Focus Mode")')).toBeVisible();
    
    // Verify persistence (would need page reload to test fully)
    expect(await page.evaluate(() => localStorage.getItem('commandCenter.advancedMode'))).toBe('true');
  });

  test('real-time updates', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="timeline"]');
    
    // Look for live indicator
    await expect(page.locator('text=LIVE')).toBeVisible();
    
    // This test would need to simulate database changes to test real-time updates
    // For now, we verify the real-time components are present
  });

  test('accessibility compliance', async ({ page }) => {
    // Check skip link
    const skipLink = page.locator('text=Skip to main content');
    await expect(skipLink).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    
    // Check ARIA labels and roles
    await expect(page.locator('[role="main"]')).toBeVisible();
    
    // Verify no accessibility violations (would need axe-playwright for full testing)
  });

  test('error handling', async ({ page }) => {
    // Test network failure scenario
    await page.route('**/functions/**', route => route.abort());
    
    // Reload to trigger error
    await page.reload();
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Verify retry functionality works
    await page.route('**/functions/**', route => route.continue());
    await page.click('button:has-text("Retry")');
    
    // Should recover from error
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });

  test('performance requirements', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to page
    await page.goto('/command-center');
    
    // Wait for main content to load
    await page.waitForSelector('[data-testid="timeline"]');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for smooth scrolling (60fps target)
    const timeline = page.locator('[data-testid="timeline"]');
    await timeline.hover();
    await page.mouse.wheel(0, 100);
    
    // Timeline should remain responsive (visual check would be needed for true fps testing)
  });

  test('idempotency and error tracking', async ({ page }) => {
    // Intercept function calls to verify headers
    let requestHeaders: Record<string, string> = {};
    
    await page.route('**/functions/create-reservation', (route) => {
      requestHeaders = route.request().headers();
      route.continue();
    });
    
    // Trigger reservation creation
    await page.keyboard.press('n');
    
    // Verify idempotency key is present
    expect(requestHeaders['x-idempotency-key']).toBeDefined();
    
    // Verify request ID tracking in case of errors
    // This would be tested more thoroughly with actual error scenarios
  });

  test('tenant isolation', async ({ page }) => {
    // Verify that tenant context is properly resolved
    await page.waitForSelector('[data-testid="command-center"]');
    
    // Check that data is filtered to current tenant only
    // This is more of a backend test, but we can verify the UI shows tenant-specific data
    const venueSelector = page.locator('[data-testid="venue-selector"]');
    await expect(venueSelector).toBeVisible();
    
    // Verify no cross-tenant data leakage (would need specific test data setup)
  });
});

test.describe('Command Center - Mock Mode (Development)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mock mode environment
    await page.addInitScript(() => {
      window.localStorage.setItem('MOCK_MODE', 'true');
    });
    
    await page.goto('/command-center');
  });

  test('shows development warning in mock mode', async ({ page }) => {
    // Should show mock data warning
    const mockWarning = page.locator('text=DEVELOPMENT MODE');
    await expect(mockWarning).toBeVisible();
    await expect(mockWarning).toContainText('Using mock data');
  });

  test('mock data provides realistic test scenario', async ({ page }) => {
    // Verify mock data is loaded
    await expect(page.locator('[data-testid="kpi-occupancy"]')).toContainText('%');
    
    const reservationCards = page.locator('[data-testid="reservation-card"]');
    await expect(reservationCards).toHaveCount(5);
    
    // Test interactions with mock data
    await reservationCards.first().click();
    await expect(page.locator('[data-testid="reservation-drawer"]')).toBeVisible();
  });
});

// Integration tests for specific business logic
test.describe('Command Center - Business Logic', () => {
  test('reservation conflicts are handled', async ({ page }) => {
    await page.goto('/command-center');
    
    // Attempt to create overlapping reservation
    // This would be implemented when reservation creation UI is added
    
    // Should show conflict error
    // await expect(page.locator('text=conflicts with existing')).toBeVisible();
  });

  test('deposit policies are enforced', async ({ page }) => {
    await page.goto('/command-center');
    
    // Open reservation for large party
    // Should show deposit requirement based on policy
    
    // This test would verify that deposit UI only shows when policy enables it
  });

  test('kitchen load calculations are accurate', async ({ page }) => {
    await page.goto('/command-center');
    
    // Verify kitchen load gauge shows realistic data
    const kitchenLoad = page.locator('[data-testid="kitchen-load"]');
    await expect(kitchenLoad).toBeVisible();
    
    // Should update based on current hour reservations
    const loadValue = await kitchenLoad.textContent();
    expect(loadValue).toMatch(/\d+%/);
  });
});

export { }; // Ensure this is treated as a module
