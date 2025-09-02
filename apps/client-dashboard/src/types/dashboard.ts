export interface DashboardMetrics {
  todayBookings: {
    count: number;
    revenue: number;
    trend: number;
  };
  occupancyRate: {
    current: number;
    target: number;
    trend: number;
  };
  averageSpend: {
    amount: number;
    trend: number;
  };
  noshowRate: {
    percentage: number;
    trend: number;
  };
}

export interface PerformanceTrend {
  date: string;
  revenue: number;
  bookings: number;
  occupancy: number;
  averageSpend: number;
}

export interface AlertNotification {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  time: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
}
