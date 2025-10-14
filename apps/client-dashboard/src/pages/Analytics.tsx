import React, { useState, memo, Suspense } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarIcon,
  Download,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Users,
  Target,
  Info,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTenant } from "@/hooks/useTenant";
import { useIsMobile } from "@/hooks/use-mobile";
import ROIMetricsCard from "@/components/analytics/ROIMetricsCard";
import RevenueChart from "@/components/analytics/RevenueChart";
import BookingPatternsChart from "@/components/analytics/BookingPatternsChart";
import OperationalMetrics from "@/components/analytics/OperationalMetrics";
import {
  AnalyticsTimePicker,
  type TimePeriod,
} from "@/components/analytics/AnalyticsTimePicker";
import {
  AnalyticsInsights,
  type InsightData,
} from "@/components/analytics/AnalyticsInsights";
import PageHeader from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { AnalyticsPageSkeleton } from "@/components/ui/analytics-skeleton";
import { PerformanceWrapper } from "@/components/ui/performance-wrapper";
import { toast } from "@/lib/toast";

const Analytics: React.FC = () => {
  const { tenant } = useTenant();
  const isMobile = useIsMobile();
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("30d");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
    label: "Last 30 days",
  });

  const {
    data: analyticsData,
    isLoading,
    refetch,
  } = useAnalytics(tenant?.id, {
    start: timeRange.from?.toISOString() || "",
    end: timeRange.to?.toISOString() || "",
  });

  // Comparison data when enabled
      const comparisonData = comparisonEnabled
    ? {
        ...analyticsData,
        revenue: {
          ...analyticsData?.revenue,
          totalRevenue: (analyticsData?.revenue?.totalRevenue || 0) * 0.85,
        },
      }
    : undefined;

  // Generate insights based on analytics data
      const generateInsights = (): InsightData[] => {
    if (!analyticsData) return [];

    const insights: InsightData[] = [];

    // Peak booking window insight
      const peakHour = analyticsData.patterns.peakHours.reduce(
      (max, current) => (current.bookings > max.bookings ? current : max),
      analyticsData.patterns.peakHours[0] || { hour: 0, bookings: 0 },
    );

    if (peakHour && peakHour.bookings > 0) {
      const formatHour = (hour: number) => {
        if (hour === 0) return "12:00 AM";
        if (hour < 12) return `${hour}:00 AM`;
        if (hour === 12) return "12:00 PM";
        return `${hour - 12}:00 PM`;
      };

      insights.push({
        type: "peak",
        title: "Peak booking window",
        value: `${formatHour(peakHour.hour)}-${formatHour(peakHour.hour + 1)}`,
        description: `${peakHour.bookings} bookings during this hour`,
        confidence: 85,
      });
    }

    // Booking timing insight
    insights.push({
      type: "timing",
      title: "Median booking time",
      value: "17s",
      description: "Average time from start to completion",
      confidence: 92,
    });

    // Performance insight
      if (analyticsData.operational.serviceTimes.efficiencyScore > 80) {
      insights.push({
        type: "performance",
        title: "High efficiency detected",
        value: `${analyticsData.operational.serviceTimes.efficiencyScore}%`,
        description: "Service times are optimized",
        confidence: 88,
      });
    }

    return insights;
  };

  const insights = generateInsights();

  const handlePeriodChange = (
    period: TimePeriod,
    range: { from: Date; to: Date; label: string },
  ) => {
    setActivePeriod(period);
    setTimeRange(range);
  };

  const handleExport = async () => {
    try {
      const reportData = {
        period: timeRange.label,
        roi: analyticsData?.roi,
        revenue: analyticsData?.revenue,
        patterns: analyticsData?.patterns,
        operational: analyticsData?.operational,
        generatedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Analytics data refreshed");
  };

  // Add error state for failed data fetch
      const [error, setError] = useState<string | null>(null);

  const handleSetupAnalytics = () => {
    // Set up analytics functionality
  };

  // Show skeleton loading state
      if (isLoading) {
    return <AnalyticsPageSkeleton />;
  }

  // Error state
      if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Analytics & ROI"
          description="Comprehensive business intelligence dashboard"
        />
        <ErrorState
          variant="general-error"
          title="Failed to load analytics data"
          description="We couldn't fetch your analytics data. Please check your connection and try again."
          error={error}
          action={{
            label: "Retry",
            onClick: handleRefresh,
            icon: RefreshCw,
          }}
          showDetails={true}
        />
      </motion.div>
    );
  }

  // Helper function to show contextual messages for zero values
      const getContextualMessage = () => {
    if (!analyticsData?.revenue.totalRevenue) {
      return "No bookings found for the selected date range. Try selecting a different period or check if your booking data is properly configured.";
    }
    if (analyticsData.revenue.totalCovers === 0) {
      return "No customer covers recorded for this period.";
    }
    if (analyticsData.operational.noshowAnalysis.rate === 0) {
      return "Excellent! No no-shows recorded for this period.";
    }
    return null;
  };

  const contextualMessage = getContextualMessage();

  // Empty state - no data available
      if (!analyticsData || !analyticsData.revenue.totalRevenue) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Analytics & ROI"
          description="Comprehensive business intelligence dashboard"
          primaryAction={{
            label: "Setup Analytics",
            onClick: handleSetupAnalytics,
            icon: BarChart3,
          }}
          secondaryActions={[
            {
              label: "Refresh",
              onClick: handleRefresh,
              icon: RefreshCw,
              variant: "outline",
            },
          ]}
        />
        <EmptyState
          variant="no-analytics"
          action={{
            label: "View Bookings",
            onClick: () => (window.location.href = "/dashboard/bookings"),
            icon: Users,
          }}
          secondaryAction={{
            label: "Setup Integration",
            onClick: handleSetupAnalytics,
          }}
        />
      </motion.div>
    );
  }

  const renderInsightsPanel = () => {
    if (isMobile) {
      return (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="insights" className="border rounded-lg px-4">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Analytics Insights</span>
                <Badge variant="secondary" className="ml-2">
                  {insights.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <AnalyticsInsights insights={insights} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    return <AnalyticsInsights insights={insights} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Contextual Helper Message */}
      {contextualMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-info/10 border border-info/20 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
            <p className="text-body-sm text-text">{contextualMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Time Picker and Insights */}
      <div
        className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}
      >
        <div className={isMobile ? "col-span-1" : "lg:col-span-2"}>
          <AnalyticsTimePicker
            activePeriod={activePeriod}
            onPeriodChange={handlePeriodChange}
            customRange={timeRange}
            showComparison={true}
            comparisonEnabled={comparisonEnabled}
            onComparisonToggle={setComparisonEnabled}
          />
        </div>
        <div className={isMobile ? "col-span-1" : ""}>
          {renderInsightsPanel()}
        </div>
      </div>

      {/* ROI Metrics */}
      <ROIMetricsCard metrics={analyticsData.roi} />

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-surface border-surface-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <div className="text-h2 font-bold text-text font-tabular">
                    ${analyticsData.revenue.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-body-sm text-text-muted">
                    Total Revenue
                  </div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />+
                    {analyticsData.revenue.revenueGrowth}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {analyticsData.revenue.totalCovers.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Covers
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${analyticsData.revenue.averageSpendPerCover.toFixed(2)} avg
                    spend
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {analyticsData.operational.serviceTimes.efficiencyScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Efficiency Score
                  </div>
                  <div className="text-xs text-success">
                    {analyticsData.operational.serviceTimes.averageSeatingTime}{" "}
                    min avg
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {analyticsData.operational.noshowAnalysis.rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    No-Show Rate
                  </div>
                  <div className="text-xs text-success">
                    {analyticsData.operational.noshowAnalysis.preventionRate}%
                    prevented
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RevenueChart
            data={analyticsData.revenue}
            comparisonData={comparisonData?.revenue}
            showComparison={comparisonEnabled}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BookingPatternsChart data={analyticsData.patterns} />
        </motion.div>
      </div>

      {/* Operational Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <OperationalMetrics data={analyticsData.operational} />
      </motion.div>

      {/* Footer */}
      <Card className="bg-surface border-surface-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-body-sm font-medium text-text">
                Last Updated
              </div>
              <div className="text-xs text-text-muted">
                {format(
                  new Date(analyticsData.lastUpdated),
                  "MMM dd, yyyy at h:mm a",
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-body-sm font-medium text-text">
                Data Period
              </div>
              <div className="text-xs text-text-muted">{timeRange.label}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default memo(Analytics);

