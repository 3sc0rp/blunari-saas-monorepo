import { useState, useEffect, useCallback } from "react";

interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  service_name: string;
  severity: "info" | "warning" | "error" | "critical";
  recorded_at: string;
}

interface DatabaseMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  active_connections: number;
  waiting_connections: number;
  connection_pool_size: number;
  recorded_at: string;
}

interface PerformanceTrend {
  id: string;
  metric_category: string;
  metric_name: string;
  period_start: string;
  period_end: string;
  avg_value: number;
  percentile_50: number;
  percentile_95: number;
  percentile_99: number;
}

export const useSystemMetrics = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetric[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<
    PerformanceTrend[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Remove mock data completely - this hook should not be used anymore
  useEffect(() => {
    console.warn(
      "useSystemMetrics hook contains mock data and should not be used for operations page",
    );
    setLoading(false);
  }, []);

  const calculateHealthScore = useCallback(() => {
    if (systemMetrics.length === 0) return 100;

    let score = 100;

    systemMetrics.forEach((metric) => {
      switch (metric.severity) {
        case "critical":
          score -= 25;
          break;
        case "error":
          score -= 15;
          break;
        case "warning":
          score -= 5;
          break;
        default:
          break;
      }
    });

    return Math.max(0, score);
  }, [systemMetrics]);

  const getMetricsByCategory = useCallback(
    (category: string) => {
      return systemMetrics.filter(
        (metric) =>
          metric.service_name.includes(category) ||
          metric.metric_name.includes(category),
      );
    },
    [systemMetrics],
  );

  const getLatestMetricValue = useCallback(
    (metricName: string) => {
      const metric = systemMetrics.find((m) => m.metric_name === metricName);
      return metric ? metric.metric_value : null;
    },
    [systemMetrics],
  );

  return {
    systemMetrics,
    databaseMetrics,
    performanceTrends,
    loading,
    error,
    calculateHealthScore,
    getMetricsByCategory,
    getLatestMetricValue,
  };
};
