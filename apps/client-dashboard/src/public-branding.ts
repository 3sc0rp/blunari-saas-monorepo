// Lightweight unauthenticated branding fetcher for public widgets
// This intentionally avoids auth context and uses a simple GET endpoint (to be implemented server-side)
// For now, we simulate fetch with minimal caching + graceful fallback.

export interface PublicBranding {
  name: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

const cache = new Map<string, { data: PublicBranding; expiry: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPublicBranding(slug: string): Promise<PublicBranding> {
  const key = slug.toLowerCase();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiry > now) return cached.data;

  try {
    // Placeholder endpoint: /api/public/branding/:slug
    // Replace with real endpoint when available.
    const res = await fetch(`/api/public/branding/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'omit'
    });
    if (!res.ok) throw new Error('Branding fetch failed: ' + res.status);
    const json = await res.json();
    const data: PublicBranding = {
      name: json.name || slug,
      primaryColor: json.primaryColor,
      accentColor: json.accentColor,
      logoUrl: json.logoUrl
    };
    cache.set(key, { data, expiry: now + TTL });
    return data;
  } catch (e) {
    // Graceful fallback
    const fallback: PublicBranding = { name: slug };
    cache.set(key, { data: fallback, expiry: now + TTL });
    return fallback;
  }
}
