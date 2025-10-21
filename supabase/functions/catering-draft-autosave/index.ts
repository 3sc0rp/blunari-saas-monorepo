/**
 * Supabase Edge Function: catering-draft-autosave
 * 
 * Manages server-side auto-save for catering orders.
 * Provides draft persistence across devices and sessions.
 * 
 * Endpoints:
 * - POST /save - Save/update draft
 * - GET /load - Load draft by session
 * - DELETE /clear - Clear draft
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
};

interface SaveDraftRequest {
  sessionId: string;
  tenantId: string;
  draftData: Record<string, any>;
  packageId?: string;
  currentStep: string;
  version?: number;
}

interface LoadDraftRequest {
  sessionId: string;
  tenantId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // POST /save - Save or update draft
    if (path.endsWith("/save") && req.method === "POST") {
      const body: SaveDraftRequest = await req.json();
      
      const { sessionId, tenantId, draftData, packageId, currentStep, version = 1 } = body;

      // Validation
      if (!sessionId || !tenantId || !draftData || !currentStep) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if draft exists
      const { data: existingDraft } = await supabase
        .from("catering_order_drafts")
        .select("*")
        .eq("session_id", sessionId)
        .eq("tenant_id", tenantId)
        .single();

      if (existingDraft) {
        // Update existing draft with optimistic locking
        const { data, error } = await supabase
          .from("catering_order_drafts")
          .update({
            draft_data: draftData,
            package_id: packageId || null,
            current_step: currentStep,
            version: existingDraft.version + 1,
            last_synced_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Reset expiration
          })
          .eq("id", existingDraft.id)
          .eq("version", existingDraft.version) // Optimistic locking
          .select()
          .single();

        if (error) {
          if (error.message.includes("version")) {
            // Conflict detected
            return new Response(
              JSON.stringify({ 
                error: "Draft was modified elsewhere. Please reload.",
                conflict: true,
                latestVersion: existingDraft.version 
              }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            draft: data,
            action: "updated" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("catering_order_drafts")
          .insert({
            session_id: sessionId,
            tenant_id: tenantId,
            draft_data: draftData,
            package_id: packageId || null,
            current_step: currentStep,
            version: 1,
            last_synced_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            draft: data,
            action: "created" 
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // GET /load - Load draft
    if (path.endsWith("/load") && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      const tenantId = url.searchParams.get("tenantId");

      if (!sessionId || !tenantId) {
        return new Response(
          JSON.stringify({ error: "Missing sessionId or tenantId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("catering_order_drafts")
        .select("*")
        .eq("session_id", sessionId)
        .eq("tenant_id", tenantId)
        .gt("expires_at", new Date().toISOString()) // Not expired
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows
        throw error;
      }

      if (!data) {
        return new Response(
          JSON.stringify({ draft: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ draft: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /clear - Clear draft
    if (path.endsWith("/clear") && req.method === "DELETE") {
      const body: LoadDraftRequest = await req.json();
      const { sessionId, tenantId } = body;

      if (!sessionId || !tenantId) {
        return new Response(
          JSON.stringify({ error: "Missing sessionId or tenantId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("catering_order_drafts")
        .delete()
        .eq("session_id", sessionId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalid endpoint
    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in catering-draft-autosave:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
