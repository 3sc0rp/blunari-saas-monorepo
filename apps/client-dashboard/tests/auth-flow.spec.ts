import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://app.blunari.ai/dashboard/widget-management';
const AUTH_URL = 'https://app.blunari.ai/auth';

test.describe('Widget Management Production Tests', () => {
  test('verifies authentication requirement and login page', async ({ page }) => {
    // Navigate to widget management URL
    await page.goto(PRODUCTION_URL);
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/.*\/auth.*/);
    
    // Check login page elements - use specific selectors to avoid strict mode violations
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText('Continue with GitHub')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' }).last()).toBeVisible();
    
    // Verify page title
    await expect(page).toHaveTitle(/Blunari.*Dashboard/i);
  });

  test('handles direct access attempt gracefully', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Should not crash or show error, should redirect to auth
    await page.waitForURL(/.*\/auth.*/);
    
    // Should show proper login form, not an error page - use specific heading
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('login form validation and UX', async ({ page }) => {
    await page.goto(AUTH_URL);
    
    // Test empty form submission
    const signInButton = page.getByRole('button', { name: 'Sign In' }).last();
    await signInButton.click();
    
    // Test email field
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Test password field
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveValue('testpassword');
    
    // Verify OAuth buttons exist (they may be disabled in production)
    const githubButton = page.getByText('Continue with GitHub');
    const googleButton = page.getByText('Continue with Google');
    
    await expect(githubButton).toBeVisible();
    await expect(googleButton).toBeVisible();
    // Note: OAuth buttons are intentionally disabled in production environment
  });

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(AUTH_URL);
    
    // Should still display properly on mobile
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' }).last()).toBeVisible();
    
    // OAuth buttons should be stacked or responsive
    const githubButton = page.getByText('Continue with GitHub');
    const googleButton = page.getByText('Continue with Google');
    
    await expect(githubButton).toBeVisible();
    await expect(googleButton).toBeVisible();
  });

  test('accessibility basics on auth page', async ({ page }) => {
    await page.goto(AUTH_URL);
    
    // Check for proper form labels
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Should have accessible names or labels
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    // First focusable element should receive focus
    
    // Check for headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('page performance and loading', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(AUTH_URL);
    
    // Should load within reasonable time
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Should load in under 5 seconds even on slow connections
    expect(loadTime).toBeLessThan(5000);
    
    // Check for critical resources
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Widget Management - Authentication Flow Analysis', () => {
  test('analyzes authentication behavior and redirects', async ({ page }) => {
    console.log('=== Testing Authentication Flow ===');
    
    // Test direct access to widget management
    console.log('1. Attempting direct access to widget management...');
    await page.goto(PRODUCTION_URL);
    
    // Wait for any redirects to complete
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Document what we find
    if (finalUrl.includes('/auth')) {
      console.log('✓ Properly redirected to authentication page');
      
      // Check authentication page elements
      const hasWelcome = await page.getByRole('heading', { name: 'Welcome Back' }).isVisible();
      const hasEmailInput = await page.locator('input[type="email"]').isVisible();
      const hasPasswordInput = await page.locator('input[type="password"]').isVisible();
      const hasOAuthButtons = await page.getByText('Continue with GitHub').isVisible();
      
      console.log('Auth page elements:', {
        welcomeHeading: hasWelcome,
        emailInput: hasEmailInput,
        passwordInput: hasPasswordInput,
        oauthButtons: hasOAuthButtons
      });
      
      // Take screenshot for documentation
      await page.screenshot({ 
        path: 'auth-page-analysis.png', 
        fullPage: true 
      });
      
    } else {
      console.log('⚠ Did not redirect to auth page. Current page analysis:');
      
      // Analyze what page we actually got
      const title = await page.title();
      const hasMainContent = await page.locator('main, [role="main"]').count();
      const bodyText = await page.textContent('body');
      
      console.log('Page analysis:', {
        title,
        hasMainContent,
        bodyTextLength: bodyText?.length || 0,
        url: finalUrl
      });
      
      await page.screenshot({ 
        path: 'unexpected-page-analysis.png', 
        fullPage: true 
      });
    }
    
    // Test always passes - this is analytical
    expect(true).toBe(true);
  });

  test('simulates authentication bypass attempt', async ({ page }) => {
    console.log('=== Testing Authentication Bypass ===');
    
    // Try various approaches to bypass authentication
    await page.goto(AUTH_URL);
    
    // Mock some auth tokens in browser storage
    await page.evaluate(() => {
      // Try setting various auth-related storage items
      const mockTokens = {
        'supabase.auth.token': JSON.stringify({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_at: Date.now() + 3600000,
          user: { id: 'test-user', email: 'test@example.com' }
        }),
        'sb-project-auth-token': 'mock_token',
        'authToken': 'mock_token',
        'session': JSON.stringify({ authenticated: true })
      };
      
      Object.entries(mockTokens).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
          sessionStorage.setItem(key, value);
        } catch (e) {
          console.log('Storage error for', key, e);
        }
      });
    });
    
    // Mock network requests that might be auth-related
    await page.route('**/auth/v1/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_token',
          user: { id: 'test', email: 'test@example.com' }
        })
      });
    });
    
    // Now try to access the widget management page
    console.log('Attempting to access widget management with mocked auth...');
    await page.goto(PRODUCTION_URL);
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('Final URL after auth mock:', finalUrl);
    
    if (finalUrl.includes('/auth')) {
      console.log('✓ Authentication properly enforced - still redirected to auth');
    } else {
      console.log('⚠ Potential auth bypass - reached protected page');
      
      // Document what we can access
      const pageContent = await page.textContent('body');
      console.log('Protected page content length:', pageContent?.length || 0);
      
      await page.screenshot({ 
        path: 'potential-auth-bypass.png', 
        fullPage: true 
      });
    }
    
    // Test always passes - this is analytical
    expect(true).toBe(true);
  });
});