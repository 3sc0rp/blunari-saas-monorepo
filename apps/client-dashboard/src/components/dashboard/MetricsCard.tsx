import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  color: string;
  bgColor: string;
  format?: "currency" | "percentage" | "number";
  subtitle?: string;
  tooltip?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color,
  bgColor,
  format = "number",
  subtitle,
  tooltip,
}) => {
  const formatValue = (val: string | number) => {
    const numVal = typeof val === "string" ? parseFloat(val) : val;

    switch (format) {
      case "currency":
        return `$${numVal.toLocaleString()}`;
      case "percentage":
        return `${numVal.toFixed(1)}%`;
      default:
        return numVal.toLocaleString();
    }
  };

  const getTrendInfo = () => {
    if (trend === 0) {
      return {
        icon: Minus,
        color: "text-text-muted",
        text: "No change",
        bgColor: "bg-surface-3",
      };
    }

    const isPositive = trend > 0;
    return {
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-success" : "text-destructive",
      text: `${isPositive ? "+" : ""}${trend > 1 ? trend.toFixed(0) : trend.toFixed(1)}${format === "percentage" ? "pp" : ""}`,
      bgColor: isPositive ? "bg-success/10" : "bg-destructive/10",
    };
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  // Generate tooltip text based on metric type
  const getDefaultTooltip = () => {
    switch (format) {
      case "currency":
        return `Revenue generated ${subtitle?.includes("month") ? "this month" : "today"}. Trend shows change compared to previous period.`;
      case "percentage":
        if (title.toLowerCase().includes("utilization")) {
          return "Percentage of tables currently occupied. Higher utilization indicates better efficiency.";
        }
        if (title.toLowerCase().includes("no-show")) {
          return "Percentage of bookings where customers did not show up. Lower rates are better.";
        }
        return "Percentage-based metric showing current performance level.";
      default:
        if (title.toLowerCase().includes("booking")) {
          return "Number of confirmed reservations. Includes walk-ins and advance bookings.";
        }
        return "Numerical metric tracking key performance indicator.";
    }
  };

  const tooltipText = tooltip || getDefaultTooltip();

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-surface-2/30 border border-surface-2/50 hover:shadow-elevation-medium transition-all duration-300 group hover:scale-[1.02] hover:border-brand/30 backdrop-blur-sm">
        {/* Professional Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-surface-2/5 to-surface-2/10 opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3 border-b border-surface-2/30">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-text-muted tracking-wide">
              {title}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110">
                  <Info className="h-3.5 w-3.5 text-text-subtle hover:text-text-muted" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 z-50">
                <p className="text-xs leading-relaxed">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div
            className={`h-11 w-11 rounded-xl ${bgColor} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-elevation-low border border-surface-2/30`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </CardHeader>

        <CardContent className="relative pt-5 pb-4">
          <div className="space-y-4">
            {/* Primary Value with Professional Typography */}
            <div className="text-3xl font-bold text-text font-tabular tracking-tight bg-gradient-to-r from-text via-text to-text-muted bg-clip-text">
              {formatValue(value)}
            </div>
            
            {subtitle && (
              <p className="text-sm text-text-muted leading-relaxed font-medium">
                {subtitle}
              </p>
            )}
            
            {/* Enhanced Trend Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1.5 px-3 py-1 ${trendInfo.bgColor} ${trendInfo.color} border border-surface-2/50 text-xs font-semibold rounded-lg backdrop-blur-sm transition-all duration-200 group-hover:scale-105`}
                >
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span className="font-tabular tracking-wide">{trendInfo.text}</span>
                </Badge>
              </div>
              <span className="text-xs text-text-subtle opacity-70">vs yesterday</span>
            </div>
          </div>
        </CardContent>

        {/* Professional Bottom Accent */}
        <div className={`h-1 bg-gradient-to-r ${bgColor.replace('bg-', 'from-').replace(/\/\d+/, '/60')} via-brand/40 to-transparent`}></div>
        
        {/* Subtle Hover Glow Effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </Card>
    </TooltipProvider>
  );
};

export default MetricsCard;
