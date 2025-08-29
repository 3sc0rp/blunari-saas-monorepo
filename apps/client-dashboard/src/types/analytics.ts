export interface ROIMetrics {
  feesAvoided: {
    amount: number;
    noshowFeesAvoided: number;
    overdraftFeesAvoided: number;
    chargebackFeesAvoided: number;
  };
  extraCovers: {
    count: number;
    revenue: number;
    optimizedSeating: number;
    revenuePerCover: number;
  };
  noshowsPrevented: {
    count: number;
    savedRevenue: number;
    depositHolds: number;
    smsReminders: number;
  };
  revpashUplift: {
    current: number;
    baseline: number;
    uplift: number;
    seatUtilization: number;
  };
}

export interface RevenueAnalytics {
  daily: { date: string; revenue: number; covers: number }[];
  weekly: { week: string; revenue: number; covers: number }[];
  monthly: { month: string; revenue: number; covers: number }[];
  averageSpendPerCover: number;
  totalRevenue: number;
  totalCovers: number;
  revenueGrowth: number;
}

export interface BookingPatterns {
  peakHours: { hour: number; bookings: number; utilization: number }[];
  dayOfWeek: { day: string; bookings: number; revenue: number }[];
  sourcePerformance: { source: string; bookings: number; revenue: number; conversionRate: number }[];
  seasonalTrends: { period: string; bookings: number; revenue: number }[];
}

export interface OperationalMetrics {
  tableUtilization: { tableId: string; tableName: string; utilizationRate: number; revenue: number }[];
  serviceTimes: {
    averageSeatingTime: number;
    averageTurnoverTime: number;
    peakServiceTime: number;
    efficiencyScore: number;
  };
  staffEfficiency: {
    bookingsPerStaff: number;
    revenuePerStaff: number;
    customerSatisfaction: number;
  };
  noshowAnalysis: {
    rate: number;
    trend: number;
    preventionRate: number;
    lostRevenue: number;
  };
}

export interface PredictiveAnalytics {
  demandForecast: { date: string; predictedBookings: number; confidence: number }[];
  revenueProjection: { period: string; projectedRevenue: number; actualRevenue?: number }[];
  capacityOptimization: { recommendations: string[]; potentialUplift: number };
}

export interface AnalyticsDashboardData {
  roi: ROIMetrics;
  revenue: RevenueAnalytics;
  patterns: BookingPatterns;
  operational: OperationalMetrics;
  predictive: PredictiveAnalytics;
  lastUpdated: string;
}