// @ts-ignore - Deno remote import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors";

interface RateLimitRequest {
  identifier: string; // IP address or user ID
  action: string; // Type of action being rate limited
  limit?: number; // Custom limit for this request
  windowMs?: number; // Custom window in milliseconds
}

interface RateLimitRule {
  action: string;
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
}

// Default rate limiting rules
const DEFAULT_RULES: Record<string, RateLimitRule> = {
  login: {
    action: "login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  }, // 5 attempts per 15 min, block for 30 min
  signup: { action: "signup", limit: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour
  password_reset: {
    action: "password_reset",
    limit: 3,
    windowMs: 60 * 60 * 1000,
  }, // 3 resets per hour
  api_call: { action: "api_call", limit: 100, windowMs: 60 * 1000 }, // 100 API calls per minute
  file_upload: { action: "file_upload", limit: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  search: { action: "search", limit: 50, windowMs: 60 * 1000 }, // 50 searches per minute
  export: { action: "export", limit: 5, windowMs: 60 * 60 * 1000 }, // 5 exports per hour
  impersonation: {
    action: "impersonation",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  }, // 10 impersonations per hour
  bulk_action: { action: "bulk_action", limit: 5, windowMs: 5 * 60 * 1000 }, // 5 bulk actions per 5 minutes
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { identifier, action, limit, windowMs }: RateLimitRequest =
      await req.json();

    if (!identifier || !action) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: identifier, action",
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Get rate limiting rule
    const rule = DEFAULT_RULES[action];
    if (!rule) {
      return new Response(JSON.stringify({ error: "Unknown action type" }), {
        status: 400,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      });
    }

    const effectiveLimit = limit || rule.limit;
    const effectiveWindow = windowMs || rule.windowMs;
    const now = new Date();
    const windowStart = new Date(now.getTime() - effectiveWindow);

    // Create rate limit key
    const rateLimitKey = `${action}:${identifier}`;

    // Check existing rate limit records
    const { data: existingRecords, error: fetchError } = await supabaseClient
      .from("rate_limits")
      .select("*")
      .eq("rate_limit_key", rateLimitKey)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false });

  if (fetchError) {
      console.error("Error fetching rate limit records:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check rate limits" }),
        {
          status: 500,
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const requestCount = existingRecords?.length || 0;

    // Check if blocked
    if (rule.blockDurationMs && existingRecords && existingRecords.length > 0) {
      const lastAttempt = new Date(existingRecords[0].created_at);
      const blockUntil = new Date(lastAttempt.getTime() + rule.blockDurationMs);

      if (requestCount >= effectiveLimit && now < blockUntil) {
        const remainingBlockTime = Math.ceil(
          (blockUntil.getTime() - now.getTime()) / 1000 / 60,
        );

        return new Response(
          JSON.stringify({
            rateLimited: true,
            message: `Rate limit exceeded. Blocked for ${remainingBlockTime} more minutes.`,
            retryAfter: Math.ceil(
              (blockUntil.getTime() - now.getTime()) / 1000,
            ),
            requestCount,
            limit: effectiveLimit,
          }),
          {
            status: 429,
            headers: {
              ...createCorsHeaders(req.headers.get("Origin")),
              "Content-Type": "application/json",
              "Retry-After": Math.ceil(
                (blockUntil.getTime() - now.getTime()) / 1000,
              ).toString(),
            },
          },
        );
      }
    }

    // Check rate limit
    if (requestCount >= effectiveLimit) {
      const oldestRecord = existingRecords[existingRecords.length - 1];
      const resetTime = new Date(
        new Date(oldestRecord.created_at).getTime() + effectiveWindow,
      );
      const retryAfter = Math.ceil(
        (resetTime.getTime() - now.getTime()) / 1000,
      );

      return new Response(
        JSON.stringify({
          rateLimited: true,
          message: "Rate limit exceeded",
          retryAfter: Math.max(retryAfter, 1),
          requestCount,
          limit: effectiveLimit,
        }),
        {
          status: 429,
          headers: {
            ...createCorsHeaders(req.headers.get("Origin")),
            "Content-Type": "application/json",
            "Retry-After": Math.max(retryAfter, 1).toString(),
          },
        },
      );
    }

    // Record this request
    const { error: insertError } = await supabaseClient
      .from("rate_limits")
      .insert({
        rate_limit_key: rateLimitKey,
        identifier,
        action,
        metadata: {
          user_agent: req.headers.get("user-agent"),
          ip_address:
            req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          limit: effectiveLimit,
          window_ms: effectiveWindow,
        },
      });

    if (insertError) {
      console.error("Error recording rate limit:", insertError);
      // Don't fail the request if we can't record the rate limit
    }

    // Clean up old records (optional, can be done via a scheduled job)
    const cleanupTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    await supabaseClient
      .from("rate_limits")
      .delete()
      .lt("created_at", cleanupTime.toISOString());

      return new Response(
        JSON.stringify({
          rateLimited: false,
          requestCount: requestCount + 1,
          limit: effectiveLimit,
          remaining: Math.max(0, effectiveLimit - requestCount - 1),
          resetTime: new Date(now.getTime() + effectiveWindow).toISOString(),
        }),
        {
          status: 200,
          headers: {
            ...createCorsHeaders(req.headers.get("Origin")),
            "Content-Type": "application/json",
            "X-RateLimit-Limit": effectiveLimit.toString(),
            "X-RateLimit-Remaining": Math.max(
              0,
              effectiveLimit - requestCount - 1,
            ).toString(),
            "X-RateLimit-Reset": Math.ceil(
              (now.getTime() + effectiveWindow) / 1000,
            ).toString(),
          },
        },
      );
  } catch (error) {
    console.error("Rate limiter error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
    });
  }
});
