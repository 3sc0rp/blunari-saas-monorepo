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

    // Get auth header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify the user is authenticated and has admin access
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin access
    const { data: employee, error: employeeError } = await supabaseClient
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .single();

    if (
      employeeError ||
      !employee ||
      !["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(employee.role)
    ) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const backgroundOpsUrl = Deno.env.get("BACKGROUND_OPS_URL");
    const backgroundOpsApiKey = Deno.env.get("BACKGROUND_OPS_API_KEY") ?? "";

    // If no background ops URL configured, return database-based metrics
    if (!backgroundOpsUrl) {
      // Get recent system health metrics
      const { data: healthMetrics } = await supabaseClient
        .from("system_health_metrics")
        .select("*")
        .gte(
          "recorded_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("recorded_at", { ascending: false })
        .limit(100);

      // Get recent background jobs metrics
      const { data: jobsData } = await supabaseClient
        .from("background_jobs")
        .select("status, created_at, completed_at, started_at")
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      // Calculate job success rate
      const totalJobs = jobsData?.length || 0;
      const successfulJobs =
        jobsData?.filter((job) => job.status === "completed").length || 0;
      const failedJobs =
        jobsData?.filter((job) => job.status === "failed").length || 0;
      const successRate =
        totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

      // Calculate average response times
      const completedJobs =
        jobsData?.filter(
          (job) =>
            job.status === "completed" && job.started_at && job.completed_at,
        ) || [];

      const responseTimes = completedJobs.map((job) => {
        const start = new Date(job.started_at!).getTime();
        const end = new Date(job.completed_at!).getTime();
        return end - start;
      });

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      const p95ResponseTime =
        responseTimes.length > 0
          ? responseTimes.sort((a, b) => a - b)[
              Math.floor(responseTimes.length * 0.95)
            ]
          : 0;

      return new Response(
        JSON.stringify({
          success: true,
          source: "database",
          metrics: {
            job_success_rate: Math.round(successRate * 100) / 100,
            total_jobs_24h: totalJobs,
            successful_jobs: successfulJobs,
            failed_jobs: failedJobs,
            avg_response_time_ms: Math.round(avgResponseTime),
            p95_response_time_ms: Math.round(p95ResponseTime),
            health_checks_count: healthMetrics?.length || 0,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call background-ops metrics endpoint
    const response = await fetch(`${backgroundOpsUrl}/api/v1/metrics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backgroundOpsApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Background service metrics error: ${response.status} - ${errorText}`,
      );
      throw new Error(`Metrics fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract key metrics for admin dashboard
    const adminMetrics = {
      job_success_rate: data.jobs?.success_rate || 0,
      p95_response_time_ms: data.performance?.p95_duration_ms || 0,
      active_jobs: data.jobs?.active || 0,
      failed_jobs_24h: data.jobs?.failed_24h || 0,
      system_uptime: data.system?.uptime_seconds || 0,
      memory_usage_percent: data.system?.memory_usage_percent || 0,
      cpu_usage_percent: data.system?.cpu_usage_percent || 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        source: "background-ops",
        metrics: adminMetrics,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Metrics API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
