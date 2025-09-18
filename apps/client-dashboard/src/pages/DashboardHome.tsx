import React from "react";
import { motion } from "framer-motion";
import { useTenant } from "@/hooks/useTenant";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAlertSystem } from "@/hooks/useAlertSystem";
import TenantAccessDisplay from "@/components/dashboard/TenantAccessDisplay";
import TodaysBookings from "@/components/dashboard/TodaysBookings";
import MetricsCard from "@/components/dashboard/MetricsCard";
import PerformanceTrendsChart from "@/components/dashboard/PerformanceTrendsChart";
import AlertSystem from "@/components/dashboard/AlertSystem";
import {
  SkeletonMetricsCard,
  SkeletonDashboardChart,
  SkeletonBookingsList,
  SkeletonWelcomeSection,
} from "@/components/ui/skeleton-dashboard";
import { EmptyState } from "@/components/ui/state";
import {
  DollarSign,
  Target,
  Calendar,
  UserX,
  TrendingUp,
  Users,
  Plus,
  ListChecks,
  Settings as Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHome: React.FC = () => {
  const { tenant, accessType, tenantSlug } = useTenant();
  const {
    metrics,
    performanceTrends,
    isLoading: metricsLoading,
  } = useDashboardMetrics(tenant?.id);
  const { alerts, dismissAlert, clearAllAlerts } = useAlertSystem(tenant?.id);

  // Define KPI metrics data with tooltips
  const kpiMetrics = [
    {
      title: "Monthly Revenue",
      value: metrics?.todayBookings?.revenue * 30 || 0, // Estimate monthly from daily
      trend: metrics?.todayBookings?.trend || 0,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      format: "currency" as const,
      subtitle: "This month (estimated)",
      tooltip:
        "Total revenue generated this month from all bookings and orders. This is an estimate based on daily averages.",
    },
    {
      title: "Table Utilization",
      value: metrics?.occupancyRate?.current || 0,
      trend: metrics?.occupancyRate?.trend || 0,
      icon: Target,
      color: "text-brand",
      bgColor: "bg-brand/10",
      format: "percentage" as const,
      subtitle: `Target: ${metrics?.occupancyRate?.target || 85}%`,
      tooltip:
        "Percentage of available tables currently occupied. Higher utilization indicates better efficiency and revenue optimization.",
    },
    {
      title: "Bookings Today",
      value: metrics?.todayBookings?.count || 0,
      trend: metrics?.todayBookings?.trend || 0,
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      format: "number" as const,
      subtitle: `$${metrics?.todayBookings?.revenue?.toLocaleString() || "0"} revenue`,
      tooltip:
        "Total number of confirmed reservations for today, including both advance bookings and walk-ins.",
    },
    {
      title: "No-Show Rate",
      value: metrics?.noshowRate?.percentage || 0,
      trend: -(metrics?.noshowRate?.trend || 0), // Negative trend is good for no-shows
      icon: UserX,
      color: "text-warning",
      bgColor: "bg-warning/10",
      format: "percentage" as const,
      subtitle: "Last 7 days",
      tooltip:
        "Percentage of confirmed bookings where customers did not show up. Lower rates indicate better booking management and customer communication.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Tenant Access Information */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <TenantAccessDisplay
          accessType={accessType as "domain" | "user"}
          tenantSlug={tenantSlug}
          tenant={tenant}
        />
      </motion.div>

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {metricsLoading ? (
          <SkeletonWelcomeSection />
        ) : (
          <div className="relative overflow-hidden bg-gradient-to-br from-brand to-brand/80 rounded-2xl p-8 text-brand-foreground shadow-elev-2">
            <div className="relative z-10">
              <h1 className="text-h1 font-bold mb-3">
                Good{" "}
                {new Date().getHours() < 12
                  ? "Morning"
                  : new Date().getHours() < 18
                    ? "Afternoon"
                    : "Evening"}
                !
              </h1>
              <p className="text-brand-foreground/90 text-body max-w-2xl">
                Welcome to your restaurant dashboard. Here's your business
                overview for today.
              </p>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-foreground/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-brand-foreground/5 rounded-full blur-xl"></div>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="justify-start gap-2 h-11 bg-surface/60 hover:bg-surface-2 border-surface-2/50"
            onClick={() => (window.location.href = "/dashboard/bookings?new=1")}
            aria-label="Create booking"
          >
            <Plus className="w-4 h-4" /> Create Booking
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11 bg-surface/60 hover:bg-surface-2 border-surface-2/50"
            onClick={() => (window.location.href = "/dashboard/waitlist-management")}
            aria-label="Open waitlist"
          >
            <ListChecks className="w-4 h-4" /> Open Waitlist
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11 bg-surface/60 hover:bg-surface-2 border-surface-2/50"
            onClick={() => (window.location.href = "/dashboard/tables")}
            aria-label="Add table"
          >
            <Users className="w-4 h-4" /> Manage Tables
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11 bg-surface/60 hover:bg-surface-2 border-surface-2/50"
            onClick={() => (window.location.href = "/dashboard/settings")}
            aria-label="Open settings"
          >
            <Cog className="w-4 h-4" /> Settings
          </Button>
        </div>
      </motion.div>

      {/* Row 1: KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsLoading
            ? // Loading skeletons
              Array.from({ length: 4 }, (_, i) => (
                <SkeletonMetricsCard key={i} />
              ))
            : // KPI metrics
              kpiMetrics.map((metric, index) => (
                <motion.div
                  key={metric.title}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.3 + index * 0.05,
                    type: "spring",
                    stiffness: 100,
                  }}
                >
                  <MetricsCard {...metric} />
                </motion.div>
              ))}
        </div>
      </motion.div>

      {/* Row 2: Performance Chart + Today's Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Performance Trends Chart - Takes 3/5 of width on xl screens */}
          <div className="xl:col-span-3">
            {metricsLoading ? (
              <SkeletonDashboardChart height="h-96" />
            ) : performanceTrends && performanceTrends.length > 0 ? (
              <PerformanceTrendsChart
                data={performanceTrends}
                isLoading={metricsLoading}
              />
            ) : (
              <div className="h-96">
                <EmptyState
                  variant="no-analytics"
                  action={{
                    label: "View Bookings",
                    onClick: () =>
                      (window.location.href = "/dashboard/bookings"),
                    icon: Users,
                  }}
                />
              </div>
            )}
          </div>

          {/* Today's Bookings - Takes 2/5 of width on xl screens */}
          <div className="xl:col-span-2">
            <div className="h-96">
              {metricsLoading ? <SkeletonBookingsList /> : <TodaysBookings />}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Row 3: Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {alerts && alerts.length > 0 ? (
          <div className="max-w-4xl">
            <AlertSystem
              alerts={alerts}
              onDismiss={dismissAlert}
              onClearAll={clearAllAlerts}
            />
          </div>
        ) : (
          <div className="max-w-4xl">
            <EmptyState
              variant="setup-required"
              title="All clear!"
              description="No alerts or notifications at the moment. Your restaurant operations are running smoothly."
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardHome;
