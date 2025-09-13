/**
 * Widget Token Utilities
 * Creates signed tokens for secure widget embedding without exposing tenant_id/config_id
 */

export interface WidgetTokenPayload {
  slug: string;
  configVersion: string;
  timestamp: number;
  widgetType: 'booking' | 'catering';
}

/**
 * Creates a short-lived signed token for widget access
 * This replaces direct tenant_id/config_id exposure in URLs
 */
export function createWidgetToken(
  slug: string, 
  configVersion: string, 
  widgetType: 'booking' | 'catering'
): string {
  const payload: WidgetTokenPayload = {
    slug,
    configVersion,
    timestamp: Date.now(),
    widgetType
  };

  // In production, this would use a proper JWT with server-side signing
  // For now, we use a simple base64-encoded payload with basic integrity check
  const encodedPayload = btoa(JSON.stringify(payload));
  const checksum = generateChecksum(encodedPayload);
  
  return `${encodedPayload}.${checksum}`;
}

/**
 * Validates and decodes a widget token
 */
export function validateWidgetToken(token: string): WidgetTokenPayload | null {
  try {
    const [encodedPayload, checksum] = token.split('.');
    
    if (!encodedPayload || !checksum) {
      return null;
    }

    // Verify checksum
    if (generateChecksum(encodedPayload) !== checksum) {
      return null;
    }

    const payload: WidgetTokenPayload = JSON.parse(atob(encodedPayload));
    
    // Check token age (tokens expire after 1 hour)
    const tokenAge = Date.now() - payload.timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    if (tokenAge > maxAge) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Simple checksum for token integrity
 * In production, use HMAC with server-side secret
 */
function generateChecksum(data: string): string {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum = ((checksum << 5) - checksum + data.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(checksum).toString(16);
}

/**
 * Check if running in development environment
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.MODE === 'development' || import.meta.env.DEV;
}