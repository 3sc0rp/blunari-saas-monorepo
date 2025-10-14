/**
 * Widget Token Utilities
 * Creates signed JWT tokens for secure widget embedding without exposing tenant_id/config_id
 */

export interface WidgetTokenPayload {
  slug: string;
  configVersion: string;
  timestamp: number;
  widgetType: 'booking' | 'catering';
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

/**
 * JWT Header interface
 */
interface JWTHeder {
  alg: string;
  typ: string;
}

/**
 * Creates a signed JWT token for widget access
 * This replaces direct tenant_id/config_id exposure in URLs
 */
export async function createWidgetToken(
  slug: string,
  configVersion: string,
  widgetType: 'booking' | 'catering'
): Promise<string> {
  // Prefer server-signed token via Edge Function for security.
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl) {
      const res = await fetch(`${supabaseUrl}/functions/v1/create-widget-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } : {})
        },
        body: JSON.stringify({ slug, widget_type: widgetType, config_version: configVersion, ttl_seconds: 3600 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.token) return data.token as string;
      }
    }
  } catch {}

  // Fallback: local signing in development only (not secure). Avoid in production.
      const now = Math.floor(Date.now() / 1000);
  const payload: WidgetTokenPayload = {
    slug,
    configVersion,
    timestamp: now,
    widgetType,
    exp: now + (60 * 60),
    iat: now
  };
  const secret = getJWTSecret();
  const header: JWTHeder = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHMACSignature(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Validates and decodes a JWT widget token
 */
export function validateWidgetToken(token: string): WidgetTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Decode and verify header
      const header = JSON.parse(base64UrlDecode(encodedHeader)) as JWTHeder;
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    // Decode payload
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as WidgetTokenPayload;

    // Check expiration
      const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Verify signature
      const secret = getJWTSecret();
    const expectedSignature = createHMACSignature(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Get JWT secret from environment or use development fallback
 */
function getJWTSecret(): string {
  // In production, this should come from environment variables
  // For development, we use a fixed secret (not secure for production!)
      return import.meta.env.VITE_JWT_SECRET || 'dev-jwt-secret-change-in-production-2025';
}

/**
 * Create HMAC SHA-256 signature
 */
function createHMACSignature(data: string, secret: string): string {
  // Simple HMAC implementation for demonstration
  // In production, use a proper crypto library like crypto-js or Node.js crypto
      const crypto = getCrypto();
  if (crypto) {
    const key = crypto.createHmac('sha256', secret);
    key.update(data);
    return base64UrlEncode(key.digest('hex'));
  }

  // Fallback for environments without crypto
      return simpleHMAC(data, secret);
}

/**
 * Get crypto object if available
 */
function getCrypto(): any {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser crypto API - would need proper implementation
      return null; // For now, use fallback
  }
  return null;
}

/**
 * Simple HMAC implementation for environments without crypto
 * NOT SECURE - Replace with proper crypto in production
 */
function simpleHMAC(data: string, secret: string): string {
  // This is a very basic HMAC implementation for demonstration
  // DO NOT USE IN PRODUCTION - Use proper crypto libraries
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0') + hash;
  }
  return base64UrlEncode(hash.substring(0, 64));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded;
  return atob(paddedStr);
}

/**
 * Check if running in development environment
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.MODE === 'development' || import.meta.env.DEV;
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationTime(): number {
  return 60 * 60; // 1 hour
}
