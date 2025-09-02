import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardMetrics, PerformanceTrend } from "@/types/dashboard";
import { useTodaysBookings } from "./useRealtimeBookings";

export const useDashboardMetrics = (tenantId?: string) => {
  const { bookings, isLoading: bookingsLoading } = useTodaysBookings(tenantId);

  // Fetch historical data for trends
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: ["historical-metrics", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("booking_time", sevenDaysAgo.toISOString())
        .order("booking_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Calculate real-time metrics
  const metrics: DashboardMetrics = useMemo(() => {
    if (!bookings || !historicalData) {
      return {
        todayBookings: { count: 0, revenue: 0, trend: 0 },
        occupancyRate: { current: 0, target: 85, trend: 0 },
        averageSpend: { amount: 0, trend: 0 },
        noshowRate: { percentage: 0, trend: 0 },
      };
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const todayBookings = bookings.length;
    const yesterdayBookings = historicalData.filter(
      (b) => new Date(b.booking_time).toDateString() === yesterday,
    ).length;

    const completedToday = bookings.filter(
      (b) => b.status === "completed",
    ).length;
    const noshowToday = bookings.filter((b) => b.status === "no_show").length;

    const totalRevenue = completedToday * 85; // Average spend estimate
    const yesterdayRevenue =
      historicalData.filter(
        (b) =>
          new Date(b.booking_time).toDateString() === yesterday &&
          b.status === "completed",
      ).length * 85;

    const occupancyTarget = 85;
    const currentOccupancy = Math.min((todayBookings / 20) * 100, 100); // Assuming 20 tables max
    const yesterdayOccupancy = Math.min((yesterdayBookings / 20) * 100, 100);

    const averageSpend = completedToday > 0 ? totalRevenue / completedToday : 0;
    const yesterdayAvgSpend =
      historicalData.filter(
        (b) =>
          new Date(b.booking_time).toDateString() === yesterday &&
          b.status === "completed",
      ).length > 0
        ? yesterdayRevenue /
          historicalData.filter(
            (b) =>
              new Date(b.booking_time).toDateString() === yesterday &&
              b.status === "completed",
          ).length
        : 0;

    const noshowPercentage =
      todayBookings > 0 ? (noshowToday / todayBookings) * 100 : 0;
    const yesterdayNoshowPercentage =
      yesterdayBookings > 0
        ? (historicalData.filter(
            (b) =>
              new Date(b.booking_time).toDateString() === yesterday &&
              b.status === "no_show",
          ).length /
            yesterdayBookings) *
          100
        : 0;

    return {
      todayBookings: {
        count: todayBookings,
        revenue: totalRevenue,
        trend: yesterdayBookings > 0 ? todayBookings - yesterdayBookings : 0,
      },
      occupancyRate: {
        current: currentOccupancy,
        target: occupancyTarget,
        trend:
          yesterdayOccupancy > 0 ? currentOccupancy - yesterdayOccupancy : 0,
      },
      averageSpend: {
        amount: averageSpend,
        trend: yesterdayAvgSpend > 0 ? averageSpend - yesterdayAvgSpend : 0,
      },
      noshowRate: {
        percentage: noshowPercentage,
        trend:
          yesterdayNoshowPercentage > 0
            ? noshowPercentage - yesterdayNoshowPercentage
            : 0,
      },
    };
  }, [bookings, historicalData]);

  // Calculate 7-day performance trends
  const performanceTrends: PerformanceTrend[] = useMemo(() => {
    if (!historicalData) return [];

    const trends: PerformanceTrend[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();

      const dayBookings = historicalData.filter(
        (b) => new Date(b.booking_time).toDateString() === dateString,
      );

      const completedBookings = dayBookings.filter(
        (b) => b.status === "completed",
      );
      const revenue = completedBookings.length * 85;
      const occupancy = Math.min((dayBookings.length / 20) * 100, 100);
      const avgSpend =
        completedBookings.length > 0 ? revenue / completedBookings.length : 0;

      trends.push({
        date: date.toISOString().split("T")[0],
        revenue,
        bookings: dayBookings.length,
        occupancy,
        averageSpend: avgSpend,
      });
    }

    return trends;
  }, [historicalData]);

  return {
    metrics,
    performanceTrends,
    isLoading: bookingsLoading || historicalLoading,
  };
};
