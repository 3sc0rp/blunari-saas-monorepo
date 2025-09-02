import React, { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Wifi, WifiOff, Target, Users, Clock, TrendingUp } from "lucide-react";

const GlobalStatusStrip: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const { tenant } = useTenant();
  const { isConnected } = useRealtimeBookings(tenant?.id);
  const { metrics } = useDashboardMetrics(tenant?.id);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsVisible(latest > 120);
  });

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{
        y: isVisible ? 0 : -60,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{
        duration: 0.2,
        ease: "easeInOut",
      }}
      className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-elev-1"
    >
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-6">
          {/* Live Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-success" />
              ) : (
                <WifiOff className="h-3 w-3 text-destructive" />
              )}
            </div>
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className={`text-xs ${
                isConnected
                  ? "bg-success/10 text-success border-success/20"
                  : ""
              }`}
            >
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>

          {/* Capacity Status */}
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" />
            <span className="text-body-sm font-tabular text-foreground">
              {metrics.occupancyRate.current}%
            </span>
            <span className="text-xs text-muted-foreground">capacity</span>
          </div>

          {/* Active Bookings */}
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-secondary" />
            <span className="text-body-sm font-tabular text-foreground">
              {metrics.todayBookings.count}
            </span>
            <span className="text-xs text-muted-foreground">today</span>
          </div>

          {/* Revenue Trend */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-success" />
            <span className="text-body-sm font-tabular text-foreground">
              ${metrics.todayBookings.revenue.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">revenue</span>
          </div>
        </div>

        {/* Quick timestamp */}
        <div className="text-xs text-muted-foreground font-tabular">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
};

export default GlobalStatusStrip;
