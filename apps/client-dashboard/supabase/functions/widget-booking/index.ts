import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestData = await req.json();
    const {
      tenant,
      booking_time,
      party_size,
      guest_name,
      guest_email,
      guest_phone,
      special_requests,
      duration_minutes = 120,
    } = requestData;

    console.log("Booking request:", requestData);

    // Validate required fields
    if (
      !tenant ||
      !booking_time ||
      !party_size ||
      !guest_name ||
      !guest_email
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get tenant information using secure public view
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenant_public_info")
      .select("id, name, slug")
      .eq("slug", tenant)
      .single();

    if (tenantError || !tenantData) {
      console.error("Tenant lookup error:", tenantError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Restaurant not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        tenant_id: tenantData.id,
        booking_time,
        party_size: parseInt(party_size),
        guest_name,
        guest_email,
        guest_phone,
        special_requests,
        status: "confirmed",
        duration_minutes,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to create booking. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Booking created successfully:", booking);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking created successfully",
        booking_id: booking.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
