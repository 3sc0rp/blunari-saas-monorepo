import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Target,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { OperationalMetrics as OperationalMetricsType } from "@/types/analytics";

interface OperationalMetricsProps {
  data: OperationalMetricsType;
}

const OperationalMetrics: React.FC<OperationalMetricsProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-success";
    if (rate >= 60) return "text-warning";
    return "text-destructive";
  };

  const getEfficiencyBadge = (score: number) => {
    if (score >= 90) return { label: "Excellent", variant: "default" as const };
    if (score >= 75) return { label: "Good", variant: "secondary" as const };
    if (score >= 60) return { label: "Average", variant: "outline" as const };
    return { label: "Needs Improvement", variant: "destructive" as const };
  };

  const efficiencyBadge = getEfficiencyBadge(data.serviceTimes.efficiencyScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Service Times */}
      <Card className="bg-surface border-surface-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand" />
            Service Times
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {formatTime(data.serviceTimes.averageSeatingTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Seating Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {formatTime(data.serviceTimes.averageTurnoverTime)}
              </div>
              <div className="text-sm text-muted-foreground">Turnover Time</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Efficiency Score</span>
              <Badge variant={efficiencyBadge.variant}>
                {efficiencyBadge.label}
              </Badge>
            </div>
            <Progress
              value={data.serviceTimes.efficiencyScore}
              className="h-2"
            />
            <div className="text-center text-xs text-muted-foreground">
              {data.serviceTimes.efficiencyScore}% efficiency
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Peak Service Time</span>
              <span className="font-medium">
                {formatTime(data.serviceTimes.peakServiceTime)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Efficiency */}
      <Card className="bg-surface border-surface-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Staff Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {data.staffEfficiency.bookingsPerStaff.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                Bookings/Staff
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                ${data.staffEfficiency.revenuePerStaff.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Revenue/Staff</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Customer Satisfaction</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-medium">
                  {data.staffEfficiency.customerSatisfaction}
                </span>
              </div>
            </div>
            <Progress
              value={data.staffEfficiency.customerSatisfaction * 20}
              className="h-2"
            />
            <div className="text-center text-xs text-muted-foreground">
              Based on customer feedback
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Utilization */}
      <Card className="bg-surface border-surface-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            Table Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.tableUtilization.slice(0, 5).map((table, index) => (
              <motion.div
                key={table.tableId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {table.tableName}
                    </span>
                    <span
                      className={`text-sm font-medium ${getUtilizationColor(table.utilizationRate)}`}
                    >
                      {table.utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={table.utilizationRate} className="h-1.5" />
                  <div className="text-xs text-muted-foreground mt-1">
                    ${table.revenue.toLocaleString()} revenue
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No-Show Analysis */}
      <Card className="bg-surface border-surface-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            No-Show Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {data.noshowAnalysis.rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">No-Show Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {data.noshowAnalysis.preventionRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                Prevention Rate
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Trend</span>
              <div className="flex items-center gap-1">
                {data.noshowAnalysis.trend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-success" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={`text-sm font-medium ${
                    data.noshowAnalysis.trend < 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {Math.abs(data.noshowAnalysis.trend)}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lost Revenue</span>
                <span className="font-medium text-destructive">
                  ${data.noshowAnalysis.lostRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalMetrics;
