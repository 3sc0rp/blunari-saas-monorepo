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
  const [metrics, setMetrics] = useState<{ cpu?: number; mem?: number; disk?: number; db?: number; users?: number; queue?: { waiting: number; active: number; completed: number; failed: number; delayed: number } }>({});

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

  const refreshMetrics = useCallback(async () => {
    try {
      // Pull JSON metrics from Background Ops
      const url = `${(import.meta.env.VITE_BACKGROUND_OPS_URL || 'https://background-ops.fly.dev').replace(/\/$/, '')}/api/v1/metrics/json`;
      const resp = await fetch(url, { headers: { 'x-api-key': import.meta.env.VITE_BACKGROUND_OPS_API_KEY || '' } });
      if (!resp.ok) throw new Error(`metrics: ${resp.status}`);
      const j = await resp.json();
      const m = j?.data?.metrics || {};
      setMetrics({
        cpu: Number(m.cpu_usage_percent ?? 0),
        mem: Number(m.memory_usage_percent ?? 0),
        disk: Number(m.disk_usage_percent ?? 0),
        db: Number(m.db_active_connections ?? 0),
        users: Number(m.active_users_last_5m ?? 0),
        queue: m.queue || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      });
    } catch {
      // keep previous
    }
  }, []);

  useEffect(() => {
    refreshBackgroundOps();
    refreshEdge();
    refreshMetrics();
    const id = setInterval(refreshBackgroundOps, 60_000);
    const id2 = setInterval(refreshEdge, 60_000);
    const id3 = setInterval(refreshMetrics, 60_000);
    return () => { clearInterval(id); clearInterval(id2); clearInterval(id3); };
  }, [refreshBackgroundOps, refreshEdge, refreshMetrics]);

  const summary = useMemo(() => ({
    backgroundOps,
    isChecking,
    error,
    edgeOk,
    metrics,
  }), [backgroundOps, isChecking, error, edgeOk, metrics]);

  return {
    ...summary,
    refreshBackgroundOps,
    refreshEdge,
    refreshMetrics,
  };
}


