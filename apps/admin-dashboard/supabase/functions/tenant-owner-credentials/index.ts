import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration
const createCorsHeaders = (origin: string | null = null) => {
  const allowedOrigins = [
    'https://admin.blunari.ai',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

interface RequestBody {
  tenantId: string;
  action?: string; // deprecated (generate-temp), issue-recovery, or revoke-recovery
  requestId?: string; // Required for revoke-recovery action
}

interface ErrorPayload {
  error: { code: string; message: string; requestId: string; meta?: Record<string, unknown> };
}

function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function error(code: string, message: string, status: number, origin: string | null, requestId: string, meta?: Record<string, unknown>) {
  const payload: ErrorPayload = { error: { code, message, requestId, meta } };
  return jsonResponse(payload, status, origin);
}

// Enhanced rate limiting with explicit counts returned for UI display
async function getRateLimitInfo(supabase: any, tenantId: string, adminUserId: string) {
  const now = new Date();
  const tenantWindowSec = 30 * 60; // 30 minutes
  const adminWindowSec = 60 * 60; // 1 hour
  const thirtyMinsAgo = new Date(now.getTime() - tenantWindowSec * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - adminWindowSec * 1000).toISOString();

  const tenantQuery = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", tenantId)
    .eq("action", "owner_recovery_link_issued")
    .gte("created_at", thirtyMinsAgo);

  const adminQuery = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", adminUserId)
    .eq("action", "owner_recovery_link_issued")
    .gte("created_at", oneHourAgo);

  const tenantCount = tenantQuery.count ?? 0;
  const adminCount = adminQuery.count ?? 0;
  const tenantLimit = 3;
  const adminLimit = 5;
  const limitedTenant = tenantCount >= tenantLimit;
  const limitedAdmin = adminCount >= adminLimit;
  return {
    tenantCount,
    adminCount,
    tenantLimit,
    adminLimit,
    tenantWindowSec,
    adminWindowSec,
    limited: limitedTenant || limitedAdmin,
    limitedReason: limitedTenant
      ? "Too many recovery links requested for this tenant in the last 30 minutes."
      : limitedAdmin
        ? "Too many recovery links requested by this admin in the last hour."
        : null,
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(origin) });
  }
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return error("METHOD_NOT_ALLOWED", "Only POST allowed", 405, origin, requestId);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return error("UNAUTHORIZED", "Missing Authorization header", 401, origin, requestId);
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return error("UNAUTHORIZED", "Invalid admin session", 401, origin, requestId);
    }

    // Verify admin role
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    if (!adminRecord) {
      return error("FORBIDDEN", "Admin access required", 403, origin, requestId);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return error("INVALID_JSON", "Invalid JSON body", 400, origin, requestId);
    }

    if (!body.tenantId) {
      return error("VALIDATION_ERROR", "tenantId required", 400, origin, requestId);
    }

    // Accept legacy action but move to recovery-only flow
    if (body.action && body.action !== "generate-temp" && body.action !== "issue-recovery" && body.action !== "revoke-recovery") {
      return error("UNSUPPORTED_ACTION", "Unsupported action", 400, origin, requestId);
    }

    // Handle revoke-recovery action
    if (body.action === "revoke-recovery") {
      if (!body.requestId) {
        return error("VALIDATION_ERROR", "requestId required for revoke-recovery action", 400, origin, requestId);
      }

      // Fetch tenant to validate and get email
      const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("id, email, name")
        .eq("id", body.tenantId)
        .single();

      if (tenantErr || !tenant) {
        return error("TENANT_NOT_FOUND", "Tenant not found", 404, origin, requestId);
      }

      // Call the revoke function
      const { data: revokeResult, error: revokeErr } = await supabase.rpc('revoke_recovery_link', {
        p_request_id: body.requestId,
        p_tenant_id: body.tenantId,
        p_owner_email: tenant.email || 'unknown',
        p_revoked_by: user.id,
        p_reason: 'Revoked by admin via UI'
      });

      if (revokeErr) {
        console.error("Failed to revoke recovery link", revokeErr);
        return error("REVOCATION_FAILED", `Failed to revoke recovery link: ${revokeErr.message}`, 500, origin, requestId);
      }

      return jsonResponse({
        success: true,
        requestId,
        tenantId: body.tenantId,
        revokedRequestId: body.requestId,
        alreadyRevoked: revokeResult?.already_revoked || false,
        message: revokeResult?.message || "Recovery link revoked successfully",
      }, 200, origin);
    }

    // Continue with issue-recovery flow...

    // Fetch tenant to get the primary contact email
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, email, name")
      .eq("id", body.tenantId)
      .single();

    if (tenantErr || !tenant) {
      return error("TENANT_NOT_FOUND", "Tenant not found", 404, origin, requestId);
    }

    if (!tenant.email) {
      return error("NO_OWNER_EMAIL", "Tenant has no stored owner email", 400, origin, requestId);
    }

    // Look up owner user by email
    const { data: ownerUserData } = await supabase.auth.admin.getUserByEmail(tenant.email);
    const ownerUser = ownerUserData?.user;
    if (!ownerUser) {
      return error("OWNER_USER_NOT_FOUND", "No user account found for tenant email", 404, origin, requestId);
    }

    // Basic rate limiting guard
    // Use same central RPC for rate limiting (record action type 'recovery' for owner credentials)
    const { data: rateRows, error: rateErr } = await supabase.rpc('record_password_setup_link_event', { p_tenant: tenant.id, p_admin: user.id, p_mode: 'recovery' });
    if (rateErr) {
      console.warn('Rate limit RPC error', rateErr);
    }
    const rate = Array.isArray(rateRows) && rateRows[0] ? rateRows[0] : null;
    if (rate?.limited) {
      return error("RATE_LIMITED", rate.limited_reason || "Too many requests", 429, origin, requestId, { rate });
    }

    // Generate recovery link (password reset) so the owner can set a new password themselves.
    let recoveryLink: string | null = null;
    try {
      // @ts-ignore generateLink dynamic call
      const { data: linkData } = await (supabase.auth as any).admin.generateLink({
        type: "recovery",
        email: tenant.email,
      });
      recoveryLink = linkData?.properties?.action_link || null;
    } catch (genErr) {
      console.warn("Failed to generate recovery link", genErr);
    }

    if (!recoveryLink) {
      return error("LINK_GENERATION_FAILED", "Failed to generate recovery link", 500, origin, requestId);
    }

    // Audit log (no sensitive data)
    await supabase.from("activity_logs").insert({
      action: "owner_recovery_link_issued",
      employee_id: user.id,
      resource_id: tenant.id,
      resource_type: "tenant",
      details: { tenantId: tenant.id, tenantEmail: tenant.email, requestId, legacyAction: body.action === "generate-temp" },
    });

    return jsonResponse({
      success: true,
      requestId,
      tenantId: tenant.id,
      ownerEmail: tenant.email,
      recoveryLink,
      message: "Send this one-time recovery link to the owner so they can securely set a new password.",
      deprecatedActionUsed: body.action === "generate-temp" || undefined,
      rateLimit: rate ? {
        tenantCount: rate.tenant_count,
        tenantLimit: rate.tenant_limit,
        tenantRemaining: rate.tenant_remaining,
        tenantWindowSeconds: rate.tenant_window_seconds,
        adminCount: rate.admin_count,
        adminLimit: rate.admin_limit,
        adminRemaining: rate.admin_remaining,
        adminWindowSeconds: rate.admin_window_seconds,
        limited: rate.limited,
        limitedReason: rate.limited_reason,
      } : null,
    }, 200, origin);
  } catch (e) {
    console.error("tenant-owner-credentials error", e);
    return error("INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500, origin, requestId);
  }
});
