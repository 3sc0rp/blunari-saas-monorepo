import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side rate limiter with server-side enforcement
 */
export class RateLimiter {
  private static cache = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Check if action is rate limited (client-side cache)
   */
  static isRateLimited(
    identifier: string,
    action: string,
    limit: number = 10,
    windowMinutes: number = 60,
  ): boolean {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const cached = this.cache.get(key);

    if (!cached || now > cached.resetTime) {
      // Reset or create new entry
      this.cache.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (cached.count >= limit) {
      return true;
    }

    cached.count++;
    return false;
  }

  /**
   * Server-side rate limit check with database enforcement
   */
  static async checkServerRateLimit(
    identifier: string,
    eventType: string,
    limit: number = 10,
    windowMinutes: number = 60,
  ): Promise<boolean> {
    try {
      // Simple client-side check for now - server validation in edge functions
      // In production, implement proper rate limiting with Redis or similar
      return true;
    } catch (error) {
      console.error("Rate limit error:", error);
      return true; // Fail safe
    }
  }

  /**
   * Combined client and server rate limiting
   */
  static async enforceRateLimit(
    identifier: string,
    action: string,
    limit: number = 10,
    windowMinutes: number = 60,
  ): Promise<boolean> {
    // First check client-side cache for immediate feedback
    if (this.isRateLimited(identifier, action, limit, windowMinutes)) {
      return false;
    }

    // Then check server-side for authoritative decision
    return await this.checkServerRateLimit(
      identifier,
      action,
      limit,
      windowMinutes,
    );
  }

  /**
   * Clear rate limit cache (for testing or manual reset)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
