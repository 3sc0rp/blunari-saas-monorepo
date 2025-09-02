import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useTenant } from "@/hooks/useTenant";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAlertSystem } from "@/hooks/useAlertSystem";
import TenantAccessDisplay from "@/components/dashboard/TenantAccessDisplay";
import TodaysBookings from "@/components/dashboard/TodaysBookings";
import QuickActions from "@/components/dashboard/QuickActions";
import TableStatus from "@/components/dashboard/TableStatus";
import MetricsCard from "@/components/dashboard/MetricsCard";
import PerformanceTrendsChart from "@/components/dashboard/PerformanceTrendsChart";
import AlertSystem from "@/components/dashboard/AlertSystem";
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  Target,
  UserX,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { tenant, accessType, tenantSlug } = useTenant();
  const { metrics, performanceTrends, isLoading } = useDashboardMetrics(
    tenant?.id,
  );
  const { alerts, dismissAlert, clearAllAlerts } = useAlertSystem(tenant?.id);

  return (
    <div className="space-y-6">
      {/* Tenant Access Information */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <TenantAccessDisplay
          accessType={accessType as "domain" | "user"}
          tenantSlug={tenantSlug}
          tenant={tenant as any}
        />
      </motion.div>

      {/* Enhanced Welcome Section with Professional Styling */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative overflow-hidden bg-gradient-to-br from-brand via-brand/95 to-brand/90 rounded-2xl p-8 text-brand-foreground shadow-xl backdrop-blur-sm border border-brand/20"
      >
        {/* Professional Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-brand-foreground/5 to-brand-foreground/10 opacity-50"></div>
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-foreground/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-foreground/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-brand-foreground/5 to-transparent rounded-full blur-3xl opacity-30"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h1 className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-brand-foreground via-brand-foreground to-brand-foreground/90 bg-clip-text text-transparent">
                  Good{" "}
                  {new Date().getHours() < 12
                    ? "Morning"
                    : new Date().getHours() < 18
                      ? "Afternoon"
                      : "Evening"}
                  !
                </h1>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p className="text-brand-foreground/90 text-lg leading-relaxed">
                  Here's what's happening at{" "}
                  <span className="font-semibold text-brand-foreground">
                    {tenant?.name || "your restaurant"}
                  </span>{" "}
                  today.
                </p>
              </motion.div>
            </div>
            
            {/* Enhanced Status Indicators */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
            >
              <div className="bg-brand-foreground/20 backdrop-blur-sm rounded-xl p-4 border border-brand-foreground/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse shadow-glow-success"></div>
                  <div className="text-brand-foreground">
                    <div className="text-sm font-semibold">System Status</div>
                    <div className="text-xs text-brand-foreground/80">All systems operational</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-brand-foreground/20 backdrop-blur-sm rounded-xl p-4 border border-brand-foreground/30">
                <div className="text-right text-brand-foreground">
                  <div className="text-lg font-bold">
                    {format(new Date(), "EEEE")}
                  </div>
                  <div className="text-sm text-brand-foreground/80">
                    {format(new Date(), "MMM do, yyyy")}
                  </div>
                  <div className="text-xs text-brand-foreground/70 mt-1">
                    {format(new Date(), "h:mm a")}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Key Metrics with Staggered Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            title: "Today's Revenue",
            value: metrics.todayBookings.revenue,
            trend: metrics.todayBookings.trend * 85,
            icon: DollarSign,
            color: "text-success",
            bgColor: "bg-gradient-success",
            format: "currency" as const,
            subtitle: `${metrics.todayBookings.count} completed bookings`,
            delay: 0.1,
          },
          {
            title: "Occupancy Rate",
            value: metrics.occupancyRate.current,
            trend: metrics.occupancyRate.trend,
            icon: Target,
            color: "text-primary",
            bgColor: "bg-gradient-primary",
            format: "percentage" as const,
            subtitle: `Target: ${metrics.occupancyRate.target}%`,
            delay: 0.2,
          },
          {
            title: "Average Spend",
            value: metrics.averageSpend.amount,
            trend: metrics.averageSpend.trend,
            icon: TrendingUp,
            color: "text-secondary",
            bgColor: "bg-gradient-warm",
            format: "currency" as const,
            subtitle: "Per completed booking",
            delay: 0.3,
          },
          {
            title: "No-Show Rate",
            value: metrics.noshowRate.percentage,
            trend: -metrics.noshowRate.trend,
            icon: UserX,
            color: "text-accent",
            bgColor: "bg-accent/10",
            format: "percentage" as const,
            subtitle: "Of total bookings",
            delay: 0.4,
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: metric.delay,
              type: "spring",
              stiffness: 100,
            }}
          >
            <MetricsCard {...metric} />
          </motion.div>
        ))}
      </motion.div>

      {/* Enhanced Performance Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-subtle rounded-2xl opacity-50 blur-sm"></div>
        <div className="relative">
          <PerformanceTrendsChart
            data={performanceTrends}
            isLoading={isLoading}
          />
        </div>
      </motion.div>

      {/* Enhanced Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Bookings with Enhanced Animation */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.8,
            type: "spring",
            stiffness: 80,
          }}
          className="lg:col-span-2"
        >
          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-medium border border-border/50 overflow-hidden">
            <TodaysBookings />
          </div>
        </motion.div>

        {/* Enhanced Alerts and Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.9,
            type: "spring",
            stiffness: 80,
          }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-medium border border-border/50 overflow-hidden">
            <AlertSystem
              alerts={alerts}
              onDismiss={dismissAlert}
              onClearAll={clearAllAlerts}
            />
          </div>
          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-medium border border-border/50 overflow-hidden">
            <QuickActions />
          </div>
        </motion.div>
      </div>

      {/* Enhanced Table Status */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 1.0,
          type: "spring",
          stiffness: 60,
        }}
      >
        <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-medium border border-border/50 overflow-hidden">
          <TableStatus />
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
