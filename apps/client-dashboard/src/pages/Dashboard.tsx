import React from "react";
import { motion } from "framer-motion";
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
          tenant={tenant}
        />
      </motion.div>

      {/* Welcome Section with Enhanced Styling */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-primary rounded-2xl p-6 text-primary-foreground shadow-strong"
      >
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            Good{" "}
            {new Date().getHours() < 12
              ? "Morning"
              : new Date().getHours() < 18
                ? "Afternoon"
                : "Evening"}
            !
          </h1>
          <p className="text-primary-foreground/90 text-lg">
            Here's what's happening at {tenant?.name || "your restaurant"}{" "}
            today.
          </p>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-foreground/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-primary-foreground/5 rounded-full blur-xl"></div>
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
