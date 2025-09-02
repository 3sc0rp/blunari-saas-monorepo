import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { test_type, service_name } = await req.json();

    console.log("Running diagnostics:", { test_type, service_name });

    const diagnostics = [];
    let overallStatus = "success";

    // Database connectivity test
    if (!test_type || test_type === "database") {
      const startTime = Date.now();
      try {
        const { data, error } = await supabaseClient
          .from("tenants")
          .select("count(*)")
          .single();

        const executionTime = Date.now() - startTime;

        diagnostics.push({
          test_name: "Database Connectivity",
          diagnostic_type: "database",
          status: error ? "error" : "success",
          execution_time_ms: executionTime,
          result_data: {
            query: "SELECT COUNT(*) FROM tenants",
            execution_time: executionTime,
            error: error?.message,
          },
          error_message: error?.message,
          recommendations: error
            ? ["Check database connection", "Verify credentials"]
            : [],
        });

        if (error) overallStatus = "error";
      } catch (error) {
        diagnostics.push({
          test_name: "Database Connectivity",
          diagnostic_type: "database",
          status: "error",
          execution_time_ms: Date.now() - startTime,
          result_data: { error: error.message },
          error_message: error.message,
          recommendations: ["Check database connection", "Verify credentials"],
        });
        overallStatus = "error";
      }
    }

    // API response time test
    if (!test_type || test_type === "api") {
      const startTime = Date.now();
      try {
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/rest/v1/`,
          {
            headers: {
              apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
          },
        );

        const executionTime = Date.now() - startTime;

        diagnostics.push({
          test_name: "API Response Time",
          diagnostic_type: "api",
          status: response.ok ? "success" : "warning",
          execution_time_ms: executionTime,
          result_data: {
            status_code: response.status,
            response_time: executionTime,
            endpoint: "/rest/v1/",
          },
          recommendations:
            executionTime > 1000 ? ["Consider API optimization"] : [],
        });

        if (!response.ok) overallStatus = "warning";
      } catch (error) {
        diagnostics.push({
          test_name: "API Response Time",
          diagnostic_type: "api",
          status: "error",
          execution_time_ms: Date.now() - startTime,
          result_data: { error: error.message },
          error_message: error.message,
          recommendations: ["Check API endpoint availability"],
        });
        overallStatus = "error";
      }
    }

    // Storage test
    if (!test_type || test_type === "storage") {
      const startTime = Date.now();
      try {
        // Test storage bucket access
        const { data, error } = await supabaseClient.storage
          .from("test")
          .list("", { limit: 1 });

        const executionTime = Date.now() - startTime;

        diagnostics.push({
          test_name: "Storage Access",
          diagnostic_type: "storage",
          status: error ? "warning" : "success",
          execution_time_ms: executionTime,
          result_data: {
            bucket: "test",
            files_found: data?.length || 0,
            error: error?.message,
          },
          error_message: error?.message,
          recommendations: error ? ["Check storage configuration"] : [],
        });

        if (error) overallStatus = "warning";
      } catch (error) {
        diagnostics.push({
          test_name: "Storage Access",
          diagnostic_type: "storage",
          status: "warning",
          execution_time_ms: Date.now() - startTime,
          result_data: { error: error.message },
          error_message: error.message,
          recommendations: ["Check storage configuration"],
        });
        if (overallStatus === "success") overallStatus = "warning";
      }
    }

    // Insert diagnostic results
    for (const diagnostic of diagnostics) {
      await supabaseClient.from("diagnostic_results").insert({
        ...diagnostic,
        service_name: service_name || "system",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        overall_status: overallStatus,
        tests_run: diagnostics.length,
        results: diagnostics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Diagnostics error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
