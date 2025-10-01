// Monorepo deployment shim.
// This file is a lightweight forwarder that reimplements a minimal subset
// of the real function logic for deployment from the default supabase/functions path.
// For now, we delegate by fetching our own hosted function code is not feasible, so we
// show an explicit error guiding to use the canonical function slug widget-booking-live.
// Loader that delegates to the canonical implementation living in the monorepo:
// apps/client-dashboard/supabase/functions/widget-booking-live/index.ts
// We rely on side-effects (that file calls serve()).
// Keeping only a single source of truth reduces drift.
import '../../../apps/client-dashboard/supabase/functions/widget-booking-live/index.ts';

// If the import above fails, provide a visible error for diagnostics.
addEventListener('fetch', (event: any) => {
  event.respondWith(new Response(JSON.stringify({
    success: false,
    error: { code: 'IMPORT_FAILED', message: 'Failed to load canonical widget-booking-live implementation.' }
  }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }));
});
