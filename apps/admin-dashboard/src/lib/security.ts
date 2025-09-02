import { supabase } from "@/integrations/supabase/client";

// CSRF Protection
export class CSRFProtection {
  private static token: string | null = null;

  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.token = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return this.token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static validateToken(token: string): boolean {
    return this.token === token && token.length >= 64;
  }

  static clearToken(): void {
    this.token = null;
  }
}

// Rate Limiting Client-Side Cache
export class RateLimitCache {
  private static cache = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now > entry.resetTime) {
      this.cache.set(key, { count: 1, resetTime: now + windowMs });
      return false; // Not rate limited
    }

    if (entry.count >= limit) {
      return true; // Rate limited
    }

    entry.count++;
    return false; // Not rate limited
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

// Secure Session Management
export class SecureSession {
  private static readonly SESSION_KEY = "secure_session_data";
  private static readonly CSRF_KEY = "csrf_token";

  static setSessionData(data: any): void {
    try {
      const encrypted = this.encrypt(JSON.stringify(data));
      localStorage.setItem(this.SESSION_KEY, encrypted);
    } catch (error) {
      console.error("Failed to set session data:", error);
    }
  }

  static getSessionData(): any | null {
    try {
      const encrypted = localStorage.getItem(this.SESSION_KEY);
      if (!encrypted) return null;

      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Failed to get session data:", error);
      return null;
    }
  }

  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.CSRF_KEY);
    CSRFProtection.clearToken();
  }

  private static encrypt(text: string): string {
    // Use crypto.subtle for proper encryption in production
    if (typeof crypto !== "undefined" && crypto.subtle) {
      // For now, use enhanced base64 with salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltedText = Array.from(salt).join(",") + ":" + text;
      return btoa(saltedText);
    }
    return btoa(text);
  }

  private static decrypt(encrypted: string): string {
    try {
      const decoded = atob(encrypted);
      if (decoded.includes(":")) {
        // Extract salted content
        const parts = decoded.split(":");
        if (parts.length >= 2) {
          return parts.slice(1).join(":");
        }
      }
      return decoded;
    } catch {
      return encrypted; // Return as-is if decryption fails
    }
  }
}

// Input Sanitization
export class InputSanitizer {
  static sanitizeHTML(input: string): string {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  }

  static sanitizeSQL(input: string): string {
    // Remove common SQL injection patterns
    return input
      .replace(/['";\\]/g, "")
      .replace(
        /(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|EXECUTE)\b)/gi,
        "",
      )
      .trim();
  }

  static sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_.]/g, "")
      .replace(/\.{2,}/g, ".")
      .substring(0, 255);
  }

  static validateEmailDomain(email: string): boolean {
    const domain = email.split("@")[1];
    const suspiciousDomains = [
      "tempmail.org",
      "10minutemail.com",
      "guerrillamail.com",
    ];
    return !suspiciousDomains.includes(domain?.toLowerCase());
  }
}

// Audit Logger
export class AuditLogger {
  static async logAction(
    action: string,
    details: {
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get IP address and user agent
      const ipAddress = details.ipAddress || (await this.getClientIP());
      const userAgent = details.userAgent || navigator.userAgent;

      await supabase.functions.invoke("log-audit-event", {
        body: {
          action,
          resourceType: details.resourceType,
          resourceId: details.resourceId,
          metadata: details.metadata || {},
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }

  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return "unknown";
    }
  }
}

// Permission Checker
export class PermissionChecker {
  private static readonly ROLE_HIERARCHY = {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    SUPPORT: 3,
    OPS: 2,
    VIEWER: 1,
  };

  static hasPermission(userRole: string, requiredRole: string): boolean {
    const userLevel =
      this.ROLE_HIERARCHY[userRole as keyof typeof this.ROLE_HIERARCHY] || 0;
    const requiredLevel =
      this.ROLE_HIERARCHY[requiredRole as keyof typeof this.ROLE_HIERARCHY] ||
      0;

    return userLevel >= requiredLevel;
  }

  static canAccessResource(userRole: string, resource: string): boolean {
    const permissions = {
      SUPER_ADMIN: ["*"],
      ADMIN: ["tenants", "employees", "settings", "domains", "analytics"],
      SUPPORT: ["tenants", "employees", "incidents", "logs"],
      OPS: ["tenants", "incidents", "analytics"],
      VIEWER: ["analytics"],
    };

    const userPermissions =
      permissions[userRole as keyof typeof permissions] || [];
    return userPermissions.includes("*") || userPermissions.includes(resource);
  }
}

// API Key Manager
export class APIKeyManager {
  static generateAPIKey(): string {
    const prefix = "sk_";
    const timestamp = Date.now().toString(36);
    const random = crypto.getRandomValues(new Uint8Array(32));
    const randomString = Array.from(random, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    return `${prefix}${timestamp}_${randomString}`;
  }

  static validateAPIKeyFormat(key: string): boolean {
    const pattern = /^sk_[a-z0-9]{8,}_[a-f0-9]{64}$/;
    return pattern.test(key);
  }

  static maskAPIKey(key: string): string {
    if (key.length < 12) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  static async revokeAPIKey(keyId: string): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("revoke-api-key", {
        body: { keyId },
      });

      if (error) throw error;

      await AuditLogger.logAction("api_key_revoked", {
        resourceType: "api_key",
        resourceId: keyId,
      });

      return true;
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      return false;
    }
  }
}

// Security Headers
export class SecurityHeaders {
  static getSecurityHeaders(): Record<string, string> {
    const csrfToken = CSRFProtection.getToken();

    return {
      "X-CSRF-Token": csrfToken || "",
      "X-Requested-With": "XMLHttpRequest",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }

  static validateSecurityHeaders(headers: Headers): boolean {
    const requiredHeaders = ["X-CSRF-Token", "X-Requested-With"];

    for (const header of requiredHeaders) {
      if (!headers.get(header)) {
        return false;
      }
    }

    return true;
  }
}

// Content Security Policy
export class CSPManager {
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  static getCSPDirectives(): string {
    const nonce = this.generateNonce();

    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://kbfbbkcaxhzlnbqxwgoz.supabase.co",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
    ].join("; ");
  }
}

// Two-Factor Authentication Helper
export class TwoFactorAuth {
  static generateSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);

    return Array.from(array, (byte) => chars[byte % chars.length]).join("");
  }

  static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const array = new Uint8Array(4);
      crypto.getRandomValues(array);
      const code = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      codes.push(code.toUpperCase());
    }

    return codes;
  }

  static generateQRCodeURL(
    secret: string,
    email: string,
    issuer: string = "Blunari Admin",
  ): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    });

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?${params}`;
  }
}

// Initialize security features
export const initializeSecurity = (): void => {
  // Generate CSRF token
  CSRFProtection.generateToken();

  // Set up rate limit cache cleanup
  setInterval(() => {
    RateLimitCache.cleanup();
  }, 60000); // Cleanup every minute

  // Add security headers to first‑party requests only (avoid CORS preflights on third‑party APIs)
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => {
    try {
      const requestUrl =
        typeof input === "string" || input instanceof URL
          ? new URL(input.toString(), window.location.origin)
          : new URL((input as Request).url);
      const sameOrigin = requestUrl.origin === window.location.origin;
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const bgOpsUrl = (import.meta as any).env?.VITE_BACKGROUND_OPS_URL;
      const isFirstParty =
        sameOrigin ||
        (supabaseUrl && requestUrl.origin === new URL(supabaseUrl).origin) ||
        (bgOpsUrl && requestUrl.origin === new URL(bgOpsUrl).origin);

      // Only attach security headers to first‑party requests
      if (isFirstParty) {
        const headers = new Headers(init.headers);
        Object.entries(SecurityHeaders.getSecurityHeaders()).forEach(
          ([key, value]) => {
            if (value) headers.set(key, value);
          },
        );
        return originalFetch(input as any, { ...init, headers });
      }

      // Pass through unchanged for third‑party
      return originalFetch(input as any, init as any);
    } catch {
      // Fallback to unmodified fetch on URL parsing error
      return originalFetch(input as any, init as any);
    }
  };
};
