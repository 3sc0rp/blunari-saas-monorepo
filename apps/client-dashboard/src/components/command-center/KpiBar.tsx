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
  DollarSign
} from "lucide-react";
import { useTodayData } from "@/hooks/useTodayData";
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
  const { data: todayData, isLoading, error } = useTodayData();

  const kpiMetrics = useMemo((): KpiMetric[] => {
    if (!todayData) {
      return [
        { label: "Total Covers", value: "--", icon: Users },
        { label: "Reservations", value: "--", icon: Calendar },
        { label: "Walk-ins", value: "--", icon: Clock },
        { label: "Avg Wait", value: "--", icon: Timer },
        { label: "Revenue", value: "--", icon: DollarSign },
        { label: "Satisfaction", value: "--", icon: TrendingUp }
      ];
    }

    const {
      totalCovers = 0,
      reservations = 0,
      walkIns = 0,
      averageWaitTime = 0,
      estimatedRevenue = 0,
      satisfactionScore = 0,
      completedBookings = 0,
      cancelledBookings = 0,
      noShowBookings = 0
    } = todayData;

    return [
      {
        label: "Total Covers",
        value: totalCovers.toLocaleString(),
        icon: Users,
        trend: { value: 12, direction: "up" as const },
        status: totalCovers > 100 ? "success" : totalCovers > 50 ? "neutral" : "warning",
        subtitle: "guests today"
      },
      {
        label: "Reservations",
        value: reservations,
        icon: Calendar,
        status: "neutral",
        subtitle: `${completedBookings} completed`
      },
      {
        label: "Walk-ins",
        value: walkIns,
        icon: Clock,
        trend: { value: 8, direction: "up" as const },
        status: "success",
        subtitle: "no reservation"
      },
      {
        label: "Avg Wait",
        value: averageWaitTime > 0 ? `${averageWaitTime}m` : "0m",
        icon: Timer,
        status: averageWaitTime > 30 ? "warning" : averageWaitTime > 60 ? "error" : "success",
        subtitle: "current wait"
      },
      {
        label: "Revenue",
        value: `$${estimatedRevenue.toLocaleString()}`,
        icon: DollarSign,
        trend: { value: 15, direction: "up" as const },
        status: "success",
        subtitle: "estimated"
      },
      {
        label: "Satisfaction",
        value: satisfactionScore > 0 ? `${satisfactionScore}%` : "--",
        icon: TrendingUp,
        trend: { value: 3, direction: "up" as const },
        status: satisfactionScore > 85 ? "success" : satisfactionScore > 70 ? "neutral" : "warning",
        subtitle: "guest rating"
      }
    ];
  }, [todayData]);

  const getStatusColor = (status: KpiMetric['status']) => {
    switch (status) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "error":
        return "text-destructive";
      default:
        return "text-text-muted";
    }
  };

  const getTrendColor = (direction: "up" | "down" | "neutral") => {
    switch (direction) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      default:
        return "text-text-muted";
    }
  };

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load KPIs</p>
              <p className="text-xs text-destructive/80">Please refresh or contact support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiMetrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={cn(
            "relative bg-surface/60 backdrop-blur-sm border-surface-2/50 hover:bg-surface/80 transition-all duration-300",
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
                    <p className="text-xs font-medium text-text-muted truncate">
                      {metric.label}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xl font-bold tabular-nums",
                      getStatusColor(metric.status)
                    )}>
                      {isLoading ? "--" : metric.value}
                    </p>
                    
                    {metric.subtitle && (
                      <p className="text-xs text-text-muted">
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
                    metric.status === "success" && "bg-success animate-pulse",
                    metric.status === "warning" && "bg-warning animate-pulse",
                    metric.status === "error" && "bg-destructive animate-pulse"
                  )} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default KpiBar;
