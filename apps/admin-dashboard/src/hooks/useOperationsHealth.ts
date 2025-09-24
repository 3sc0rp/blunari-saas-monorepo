import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type HealthStatus = "unknown" | "healthy" | "unhealthy" | "configuration_error";

interface BackgroundOpsHealth {
  status: HealthStatus;
  ok: boolean;
  lastCheckedAt?: string;
  details?: any;
}

export function useOperationsHealth() {
  const [backgroundOps, setBackgroundOps] = useState<BackgroundOpsHealth>({
    status: "unknown",
    ok: false,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edgeOk, setEdgeOk] = useState<boolean | null>(null);

  const refreshBackgroundOps = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("health-check-api", {
        body: {},
      });
      if (error) throw error;
      const status: HealthStatus = (data?.status as HealthStatus) || "unknown";
      setBackgroundOps({
        status,
        ok: data?.success === true && status === "healthy",
        lastCheckedAt: new Date().toISOString(),
        details: data,
      });
    } catch (e: any) {
      setBackgroundOps({ status: "unhealthy", ok: false, lastCheckedAt: new Date().toISOString(), details: { error: String(e?.message || e) } });
      setError(e?.message || "Health check failed");
    } finally {
      setIsChecking(false);
    }
  }, []);

  const refreshEdge = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("widget-booking-live", {
        body: { action: "health" },
      });
      if (error) throw error;
      setEdgeOk(data?.status === 'ok' || data?.success === true);
    } catch {
      setEdgeOk(false);
    }
  }, []);

  useEffect(() => {
    refreshBackgroundOps();
    refreshEdge();
    const id = setInterval(refreshBackgroundOps, 60_000);
    const id2 = setInterval(refreshEdge, 60_000);
    return () => clearInterval(id);
  }, [refreshBackgroundOps, refreshEdge]);

  const summary = useMemo(() => ({
    backgroundOps,
    isChecking,
    error,
    edgeOk,
  }), [backgroundOps, isChecking, error, edgeOk]);

  return {
    ...summary,
    refreshBackgroundOps,
    refreshEdge,
  };
}


