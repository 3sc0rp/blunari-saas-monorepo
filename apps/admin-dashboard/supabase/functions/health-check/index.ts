import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[HEALTH-CHECK] ${step}${detailsStr}`);
};

// Simulate health check for different service types
const performHealthCheck = async (
  service: any,
): Promise<{
  status: string;
  response_time_ms: number;
  status_code?: number;
  error_message?: string;
}> => {
  const startTime = Date.now();

  try {
    // Simulate different health check scenarios
    const responseTime = Math.random() * 300 + 50; // 50-350ms
    const isHealthy = Math.random() > 0.15; // 85% chance of being healthy

    if (!isHealthy) {
      // Simulate various failure scenarios
      const failureScenarios = [
        {
          status: "unhealthy",
          status_code: 500,
          error: "Internal server error",
        },
        { status: "degraded", status_code: 200, error: "High response time" },
        { status: "unhealthy", status_code: 503, error: "Service unavailable" },
        {
          status: "degraded",
          status_code: 200,
          error: "High latency detected",
        },
      ];

      const scenario =
        failureScenarios[Math.floor(Math.random() * failureScenarios.length)];

      return {
        status: scenario.status,
        response_time_ms: Math.floor(
          responseTime * (scenario.status === "unhealthy" ? 3 : 1.5),
        ),
        status_code: scenario.status_code,
        error_message: scenario.error,
      };
    }

    // Healthy service
    return {
      status: "healthy",
      response_time_ms: Math.floor(responseTime),
      status_code: 200,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      response_time_ms: Date.now() - startTime,
      error_message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Generate resource usage data
const generateResourceUsage = (serviceName: string) => {
  const resourceTypes = [
    { type: "cpu", unit: "percentage", baseValue: 15, variance: 40 },
    { type: "memory", unit: "percentage", baseValue: 45, variance: 30 },
    { type: "disk", unit: "percentage", baseValue: 25, variance: 15 },
    { type: "network", unit: "mbps", baseValue: 10, variance: 50 },
  ];

  return resourceTypes.map((resource) => ({
    service_name: serviceName,
    resource_type: resource.type,
    current_value: Math.max(
      0,
      Math.min(
        100,
        resource.baseValue + (Math.random() - 0.5) * resource.variance,
      ),
    ),
    max_value: resource.type === "network" ? 1000 : 100,
    unit: resource.unit,
    threshold_warning: resource.type === "network" ? 800 : 80,
    threshold_critical: resource.type === "network" ? 950 : 95,
    hostname: `${serviceName.toLowerCase().replace(/\s+/g, "-")}-server-${Math.floor(Math.random() * 3) + 1}`,
  }));
};

// Run diagnostic tests
const runDiagnostics = async (services: any[]) => {
  const diagnostics = [];

  for (const service of services) {
    // Connectivity test
    const connectivityStatus = Math.random() > 0.05 ? "pass" : "fail";
    diagnostics.push({
      diagnostic_type: "connectivity",
      service_name: service.service_name,
      test_name: "Network Connectivity",
      status: connectivityStatus,
      result_data: {
        tcp_connect: connectivityStatus === "pass",
        dns_resolution: Math.random() > 0.02,
        latency_ms: Math.floor(Math.random() * 50 + 10),
      },
      execution_time_ms: Math.floor(Math.random() * 100 + 50),
      recommendations:
        connectivityStatus === "fail"
          ? [
              "Check network configuration",
              "Verify firewall rules",
              "Test DNS resolution",
            ]
          : [],
    });

    // Performance test
    const perfStatus = Math.random() > 0.1 ? "pass" : "warning";
    diagnostics.push({
      diagnostic_type: "performance",
      service_name: service.service_name,
      test_name: "Performance Benchmark",
      status: perfStatus,
      result_data: {
        response_time_p50: Math.floor(Math.random() * 100 + 50),
        response_time_p95: Math.floor(Math.random() * 200 + 100),
        response_time_p99: Math.floor(Math.random() * 300 + 200),
        throughput_rps: Math.floor(Math.random() * 1000 + 100),
      },
      execution_time_ms: Math.floor(Math.random() * 200 + 100),
      recommendations:
        perfStatus === "warning"
          ? [
              "Optimize database queries",
              "Review caching strategy",
              "Consider scaling resources",
            ]
          : [],
    });
  }

  return diagnostics;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Health check function started");

    // Use service role key for system operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Get all enabled services
    const { data: services, error: servicesError } = await supabaseClient
      .from("services")
      .select("*")
      .eq("enabled", true)
      .order("service_name");

    if (servicesError) {
      throw new Error(`Failed to fetch services: ${servicesError.message}`);
    }

    logStep("Retrieved services", { count: services?.length || 0 });

    const healthResults = [];
    const resourceUsageData = [];

    // Perform health checks for each service
    for (const service of services || []) {
      logStep("Checking health for service", {
        serviceName: service.service_name,
      });

      const healthResult = await performHealthCheck(service);

      // Insert health status
      const { error: healthError } = await supabaseClient
        .from("service_health_status")
        .insert({
          service_id: service.id,
          status: healthResult.status,
          response_time_ms: healthResult.response_time_ms,
          status_code: healthResult.status_code,
          error_message: healthResult.error_message,
          metadata: {
            check_type: "automated",
            endpoint: service.health_check_endpoint,
            critical: service.critical,
          },
        });

      if (healthError) {
        logStep("Error inserting health status", {
          error: healthError.message,
        });
      } else {
        healthResults.push({
          service_name: service.service_name,
          ...healthResult,
        });
      }

      // Generate and insert resource usage data
      const resourceData = generateResourceUsage(service.service_name);
      for (const resource of resourceData) {
        const { error: resourceError } = await supabaseClient
          .from("resource_usage")
          .insert(resource);

        if (resourceError) {
          logStep("Error inserting resource usage", {
            error: resourceError.message,
          });
        } else {
          resourceUsageData.push(resource);
        }
      }

      // Check if we need to create incidents based on health status
      if (healthResult.status !== "healthy") {
        logStep("Unhealthy service detected, checking for incidents", {
          serviceName: service.service_name,
          status: healthResult.status,
        });

        // Use the database function to handle incident creation
        const { error: incidentError } = await supabaseClient.rpc(
          "check_service_health",
          {
            p_service_id: service.id,
          },
        );

        if (incidentError) {
          logStep("Error checking for incidents", {
            error: incidentError.message,
          });
        }
      }
    }

    // Run diagnostic tests
    logStep("Running diagnostic tests");
    const diagnostics = await runDiagnostics(services || []);

    for (const diagnostic of diagnostics) {
      const { error: diagError } = await supabaseClient
        .from("diagnostic_results")
        .insert(diagnostic);

      if (diagError) {
        logStep("Error inserting diagnostic result", {
          error: diagError.message,
        });
      }
    }

    // Calculate SLA metrics for the last hour
    logStep("Calculating SLA metrics");
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const now = new Date().toISOString();

    for (const service of services || []) {
      try {
        const { data: slaResult, error: slaError } = await supabaseClient.rpc(
          "calculate_sla_metrics",
          {
            p_service_id: service.id,
            p_period_start: hourAgo,
            p_period_end: now,
          },
        );

        if (slaError) {
          logStep("Error calculating SLA metrics", {
            error: slaError.message,
            serviceId: service.id,
          });
        } else {
          logStep("SLA metrics calculated", {
            serviceName: service.service_name,
            metrics: slaResult,
          });
        }
      } catch (error) {
        logStep("Exception calculating SLA metrics", {
          error: error.message,
          serviceId: service.id,
        });
      }
    }

    logStep("Health check completed successfully", {
      servicesChecked: services?.length || 0,
      healthyServices: healthResults.filter((r) => r.status === "healthy")
        .length,
      resourceMetrics: resourceUsageData.length,
      diagnosticsRun: diagnostics.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          services_checked: services?.length || 0,
          healthy_services: healthResults.filter((r) => r.status === "healthy")
            .length,
          degraded_services: healthResults.filter(
            (r) => r.status === "degraded",
          ).length,
          unhealthy_services: healthResults.filter(
            (r) => r.status === "unhealthy",
          ).length,
          resource_metrics_collected: resourceUsageData.length,
          diagnostics_run: diagnostics.length,
        },
        health_results: healthResults,
        resource_usage: resourceUsageData.slice(0, 10), // Sample of resource data
        diagnostics: diagnostics.slice(0, 5), // Sample of diagnostic results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in health check", { message: errorMessage });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
