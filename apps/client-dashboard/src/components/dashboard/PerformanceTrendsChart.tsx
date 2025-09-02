import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { PerformanceTrend } from "@/types/dashboard";
import { TrendingUp, Calendar } from "lucide-react";

interface PerformanceTrendsChartProps {
  data: PerformanceTrend[];
  isLoading?: boolean;
}

const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = ({
  data,
  isLoading = false,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case "revenue":
        return [`$${value.toLocaleString()}`, "Revenue"];
      case "occupancy":
        return [`${value.toFixed(1)}%`, "Occupancy"];
      case "averageSpend":
        return [`$${value.toFixed(0)}`, "Avg Spend"];
      default:
        return [value.toString(), name];
    }
  };

  const calculateTrend = () => {
    if (data.length < 2) return 0;
    const recent = data.slice(-3).reduce((sum, d) => sum + d.revenue, 0) / 3;
    const previous =
      data.slice(0, 3).reduce((sum, d) => sum + d.revenue, 0) / 3;

    // Handle division by zero
    if (previous === 0) return recent > 0 ? 100 : 0;

    const trendValue = ((recent - previous) / previous) * 100;
    return isFinite(trendValue) ? trendValue : 0;
  };

  const trend = calculateTrend();

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Performance Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last 7 days
            </Badge>
            <Badge
              variant="outline"
              className={`${trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
            >
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}% trend
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="occupancyGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--secondary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--secondary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                formatter={formatTooltipValue}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="revenue"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancy"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                name="occupancy"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded-full" />
            <span className="text-muted-foreground">Occupancy %</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceTrendsChart;
