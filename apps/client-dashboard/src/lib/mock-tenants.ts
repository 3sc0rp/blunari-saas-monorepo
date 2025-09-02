/**
 * Mock tenant data for development and fallback scenarios
 * This ensures the app can function even when database connectivity is limited
 */

export const MOCK_TENANTS = {
  demo: {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Demo Restaurant',
    slug: 'demo',
    status: 'active',
    timezone: 'America/New_York',
    currency: 'USD',
    description: 'Demo restaurant for testing Blunari SAAS platform',
    email: 'demo@blunari.com',
    primary_color: '#1e3a8a',
    secondary_color: '#f59e0b',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    logo_url: null,
    cover_image_url: null,
    website: null,
    address: null,
    cuisine_type_id: null
  },
  kpizza: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'K Pizza Restaurant',
    slug: 'kpizza',
    status: 'active',
    timezone: 'America/New_York',
    currency: 'USD',
    description: 'K Pizza - Premium pizza restaurant',
    email: 'hello@kpizza.com',
    primary_color: '#dc2626',
    secondary_color: '#fbbf24',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    logo_url: null,
    cover_image_url: null,
    website: null,
    address: null,
    cuisine_type_id: null
  },
  'gourmet-corner': {
    id: '987fcdeb-51d2-43a1-9876-543210fedcba',
    name: 'The Gourmet Corner',
    slug: 'gourmet-corner',
    status: 'active',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    description: 'Fine dining experience with modern cuisine',
    email: 'contact@gourmetcorner.com',
    primary_color: '#7c3aed',
    secondary_color: '#f97316',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    logo_url: null,
    cover_image_url: null,
    website: null,
    address: null,
    cuisine_type_id: null
  }
};

/**
 * Get mock tenant by slug - useful for development and fallback scenarios
 */
export function getMockTenantBySlug(slug: string) {
  return MOCK_TENANTS[slug as keyof typeof MOCK_TENANTS] || null;
}

/**
 * Check if we should use mock data (e.g., in development when API is unavailable)
 */
export function shouldUseMockData() {
  // Use mock data in development if VITE_USE_MOCK_TENANTS is set
  return import.meta.env.MODE === 'development' && 
         import.meta.env.VITE_USE_MOCK_TENANTS === 'true';
}

/**
 * Enhanced tenant lookup that falls back to mock data when needed
 */
export async function getTenantWithFallback(slug: string, apiCall: () => Promise<any>) {
  try {
    // Try API first
    const result = await apiCall();
    if (result.data) {
      return result;
    }
  } catch (error) {
    console.warn('API call failed, checking for mock fallback:', error);
  }

  // Fallback to mock data if available
  if (shouldUseMockData()) {
    const mockTenant = getMockTenantBySlug(slug);
    if (mockTenant) {
      console.log(`Using mock tenant data for: ${slug}`);
      return { data: mockTenant, error: null };
    }
  }

  // If no mock data available, return the error
  return { data: null, error: { message: `Tenant '${slug}' not found` } };
}
