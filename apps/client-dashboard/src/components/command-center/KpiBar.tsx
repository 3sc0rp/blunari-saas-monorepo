import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Timer,
  DollarSign,
  Utensils,
  Coffee
} from "lucide-react";
import { useRealtimeCommandCenterContext } from "@/contexts/RealtimeCommandCenterContext";
import { cn } from "@/lib/utils";

interface KpiMetric {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  status?: "success" | "warning" | "error" | "neutral";
  subtitle?: string;
}

const KpiBar: React.FC = () => {
  const { 
    metrics, 
    bookings, 
    tables, 
    waitlist, 
    isLoading, 
    error,
    isConnected,
    activeBookings,
    completedBookings 
  } = useRealtimeCommandCenterContext();

  const kpiMetrics = useMemo((): KpiMetric[] => {
    const waitingGuests = waitlist.reduce((sum, entry) => sum + entry.party_size, 0);
    const avgWaitTime = waitlist.length > 0 
      ? Math.round(waitlist.reduce((sum, entry) => sum + entry.estimated_wait_time, 0) / waitlist.length)
      : 0;

    return [
      {
        label: "Active Tables",
        value: metrics.occupiedTables,
        icon: Utensils,
        trend: { value: 8, direction: "up" as const },
        status: metrics.occupiedTables > (tables.length * 0.8) ? "warning" : "success",
        subtitle: `${metrics.availableTables} available`
      },
      {
        label: "Active Bookings",
        value: metrics.activeBookings,
        icon: Calendar,
        status: "success",
        subtitle: `${completedBookings.length} completed`
      },
      {
        label: "Covers Today",
        value: metrics.coverCount,
        icon: Users,
        trend: { value: 12, direction: "up" as const },
        status: metrics.coverCount > 100 ? "success" : metrics.coverCount > 50 ? "neutral" : "warning",
        subtitle: "guests served"
      },
      {
        label: "Waitlist",
        value: waitingGuests || "None",
        icon: Clock,
        status: waitlist.length > 5 ? "warning" : waitlist.length > 0 ? "neutral" : "success",
        subtitle: avgWaitTime > 0 ? `${avgWaitTime}m avg` : "no wait"
      },
      {
        label: "Revenue",
        value: `$${metrics.totalRevenue.toLocaleString()}`,
        icon: DollarSign,
        trend: { value: 15, direction: "up" as const },
        status: "success",
        subtitle: "today's total"
      },
      {
        label: "Turnover",
        value: metrics.turnover > 0 ? `${metrics.turnover.toFixed(1)}x` : "--",
        icon: Coffee,
        trend: { value: 3, direction: "up" as const },
        status: metrics.turnover > 2 ? "success" : metrics.turnover > 1 ? "neutral" : "warning",
        subtitle: "table turns"
      }
    ];
  }, [metrics, waitlist, tables.length, completedBookings.length]);

  const getStatusColor = (status: KpiMetric['status']) => {
    switch (status) {
      case "success":
        return "text-emerald-600";
      case "warning":
        return "text-amber-600";
      case "error":
        return "text-red-600";
      default:
        return "text-slate-500";
    }
  };

  const getTrendColor = (direction: "up" | "down" | "neutral") => {
    switch (direction) {
      case "up":
        return "text-emerald-600";
      case "down":
        return "text-red-600";
      default:
        return "text-slate-500";
    }
  };

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">Failed to load real-time KPIs</p>
              <p className="text-xs text-red-600">Check your connection and try refreshing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-700">
            Real-time updates unavailable. Showing cached data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "relative bg-white hover:shadow-lg transition-all duration-300",
              isLoading && "animate-pulse"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className={cn(
                        "w-4 h-4 flex-shrink-0",
                        getStatusColor(metric.status)
                      )} />
                      <p className="text-xs font-medium text-slate-600 truncate">
                        {metric.label}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className={cn(
                        "text-xl font-bold tabular-nums text-slate-900",
                        isLoading && "text-slate-400"
                      )}>
                        {isLoading ? "--" : metric.value}
                      </p>
                      
                      {metric.subtitle && (
                        <p className="text-xs text-slate-500">
                          {metric.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {metric.trend && !isLoading && (
                    <div className={cn(
                      "text-xs font-medium flex items-center gap-1",
                      getTrendColor(metric.trend.direction)
                    )}>
                      <TrendingUp className={cn(
                        "w-3 h-3",
                        metric.trend.direction === "down" && "rotate-180"
                      )} />
                      {metric.trend.value}%
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                {metric.status !== "neutral" && (
                  <div className="absolute top-2 right-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      metric.status === "success" && "bg-emerald-400 animate-pulse",
                      metric.status === "warning" && "bg-amber-400 animate-pulse",
                      metric.status === "error" && "bg-red-400 animate-pulse"
                    )} />
                  </div>
                )}

                {/* Real-time indicator */}
                {isConnected && !isLoading && (
                  <div className="absolute bottom-2 right-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default KpiBar;
