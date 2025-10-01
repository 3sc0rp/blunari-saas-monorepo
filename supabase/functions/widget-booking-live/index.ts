// Monorepo deployment shim.
// This file is a lightweight forwarder that reimplements a minimal subset
// of the real function logic for deployment from the default supabase/functions path.
// For now, we delegate by fetching our own hosted function code is not feasible, so we
// show an explicit error guiding to use the canonical function slug widget-booking-live.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((_req) => new Response(JSON.stringify({
  success: false,
  error: {
    code: 'WRAPPER_ONLY',
    message: 'Deployment shim in supabase/functions/widget-booking-live. Use the main implementation under apps/client-dashboard.'
  }
}), { status: 500, headers: { 'Content-Type': 'application/json' } }));
