/**
 * Removed mock tenant data - using only real database data
 * This file is kept for backward compatibility but no longer provides mock data
 */

export function getMockTenantBySlug(slug: string) {
  return null; // No mock data - use real database only
}

export function shouldUseMockData() {
  return false; // Never use mock data - always use real database
}

export async function getTenantWithFallback(slug: string, apiCall: () => Promise<any>) {
  // Only use real API calls - no fallback to mock data
  return await apiCall();
}
