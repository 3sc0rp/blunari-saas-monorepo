import React from 'react';
import { motion } from 'framer-motion';
import { useTenant } from '@/hooks/useTenant';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useAlertSystem } from '@/hooks/useAlertSystem';
import TenantAccessDisplay from '@/components/dashboard/TenantAccessDisplay';
import TodaysBookings from '@/components/dashboard/TodaysBookings';
import QuickActions from '@/components/dashboard/QuickActions';
import TableStatus from '@/components/dashboard/TableStatus';
import MetricsCard from '@/components/dashboard/MetricsCard';
import PerformanceTrendsChart from '@/components/dashboard/PerformanceTrendsChart';
import AlertSystem from '@/components/dashboard/AlertSystem';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Target,
  UserX
} from 'lucide-react';

const DashboardHome: React.FC = () => {
  const { tenant, accessType, tenantSlug } = useTenant();
  const { metrics, performanceTrends, isLoading } = useDashboardMetrics(tenant?.id);
  const { alerts, dismissAlert, clearAllAlerts } = useAlertSystem(tenant?.id);

  return (
    <div className="space-y-6">
      {/* Tenant Access Information */}
      <TenantAccessDisplay 
        accessType={accessType as 'domain' | 'user'} 
        tenantSlug={tenantSlug} 
        tenant={tenant} 
      />

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening at {tenant?.name || 'your restaurant'} today.
        </p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricsCard
          title="Today's Revenue"
          value={metrics.todayBookings.revenue}
          trend={metrics.todayBookings.trend * 85} // Revenue trend
          icon={DollarSign}
          color="text-success"
          bgColor="bg-success/10"
          format="currency"
          subtitle={`${metrics.todayBookings.count} completed bookings`}
        />
        <MetricsCard
          title="Occupancy Rate"
          value={metrics.occupancyRate.current}
          trend={metrics.occupancyRate.trend}
          icon={Target}
          color="text-primary"
          bgColor="bg-primary/10"
          format="percentage"
          subtitle={`Target: ${metrics.occupancyRate.target}%`}
        />
        <MetricsCard
          title="Average Spend"
          value={metrics.averageSpend.amount}
          trend={metrics.averageSpend.trend}
          icon={TrendingUp}
          color="text-secondary"
          bgColor="bg-secondary/10"
          format="currency"
          subtitle="Per completed booking"
        />
        <MetricsCard
          title="No-Show Rate"
          value={metrics.noshowRate.percentage}
          trend={-metrics.noshowRate.trend} // Negative trend is good for no-shows
          icon={UserX}
          color="text-accent"
          bgColor="bg-accent/10"
          format="percentage"
          subtitle="Of total bookings"
        />
      </motion.div>

      {/* Performance Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PerformanceTrendsChart 
          data={performanceTrends} 
          isLoading={isLoading}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Bookings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <TodaysBookings />
        </motion.div>

        {/* Alerts and Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <AlertSystem 
            alerts={alerts}
            onDismiss={dismissAlert}
            onClearAll={clearAllAlerts}
          />
          <QuickActions />
        </motion.div>
      </div>

      {/* Table Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <TableStatus />
      </motion.div>
    </div>
  );
};

export default DashboardHome;