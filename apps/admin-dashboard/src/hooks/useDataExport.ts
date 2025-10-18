import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExportOptions {
  format: "csv" | "json";
  dateRange?: { from: Date; to: Date };
  includeMetrics?: boolean;
  includeTenants?: boolean;
  includeBookings?: boolean;
  includeAnalytics?: boolean;
}

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportDashboardData = async (options: ExportOptions) => {
    setIsExporting(true);

    try {
      // Simulate data preparation
      const data = {
        metrics: options.includeMetrics ? generateMockMetrics() : null,
        tenants: options.includeTenants ? generateMockTenants() : null,
        bookings: options.includeBookings ? generateMockBookings() : null,
        analytics: options.includeAnalytics ? generateMockAnalytics() : null,
        exportedAt: new Date().toISOString(),
        dateRange: options.dateRange,
      };

      // Filter out null values
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== null),
      );

      if (options.format === "csv") {
        downloadCSV(filteredData);
      } else {
        downloadJSON(filteredData);
      }

      toast({
        title: "Export Complete",
        description: `Data exported successfully as ${options.format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (data: any) => {
    // Convert data to CSV format
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `dashboard-export-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadJSON = (data: any) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `dashboard-export-${new Date().toISOString().split("T")[0]}.json`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const convertToCSV = (data: any) => {
    const rows = [];

    // Add headers
    rows.push(["Category", "Type", "Value", "Timestamp"]);

    // Add metrics
    if (data.metrics) {
      data.metrics.forEach((metric: any) => {
        rows.push(["Metrics", metric.name, metric.value, metric.timestamp]);
      });
    }

    // Add tenants
    if (data.tenants) {
      data.tenants.forEach((tenant: any) => {
        rows.push(["Tenants", tenant.name, tenant.status, tenant.created_at]);
      });
    }

    // Add bookings
    if (data.bookings) {
      data.bookings.forEach((booking: any) => {
        rows.push(["Bookings", booking.id, booking.status, booking.created_at]);
      });
    }

    return rows
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
  };

  return { exportDashboardData, isExporting };
};

// Mock data generators
const generateMockMetrics = () => [
  {
    name: "Total Revenue",
    value: "$127,450",
    timestamp: new Date().toISOString(),
  },
  { name: "Active Tenants", value: "342", timestamp: new Date().toISOString() },
  {
    name: "Total Bookings",
    value: "12,847",
    timestamp: new Date().toISOString(),
  },
];

const generateMockTenants = () => [
  {
    name: "Bella Vista Restaurant",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    name: "Ocean Breeze Bistro",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    name: "Mountain View Cafe",
    status: "trial",
    created_at: new Date().toISOString(),
  },
];

const generateMockBookings = () => [
  { id: "BK001", status: "confirmed", created_at: new Date().toISOString() },
  { id: "BK002", status: "completed", created_at: new Date().toISOString() },
  { id: "BK003", status: "pending", created_at: new Date().toISOString() },
];

const generateMockAnalytics = () => ({
  summary: {
    period: "Last 30 days",
    totalRevenue: 127450,
    totalBookings: 12847,
    averageBookingValue: 47.25,
  },
});
