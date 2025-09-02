import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";

// Optimized card components for better performance
interface OptimizedCardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  priority?: boolean; // For above-the-fold content
}

export const OptimizedCard = memo<OptimizedCardProps>(
  ({
    title,
    children,
    className,
    contentClassName,
    headerClassName,
    priority = false,
  }) => (
    <Card
      className={cn(
        "transition-colors motion-reduce:transition-none",
        priority && "will-change-transform", // Optimize for animations
        className,
      )}
    >
      {title && (
        <CardHeader className={headerClassName}>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("p-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  ),
);

OptimizedCard.displayName = "OptimizedCard";

// Memoized metric card for dashboard performance
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard = memo<MetricCardProps>(
  ({ title, value, change, icon, className }) => (
    <OptimizedCard className={className} priority contentClassName="pb-2">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="text-body-sm font-medium text-text-muted">{title}</h3>
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-h2 font-bold text-text">{value}</div>

        {change && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                change.trend === "up" && "bg-success/10 text-success",
                change.trend === "down" && "bg-destructive/10 text-destructive",
                change.trend === "neutral" && "bg-surface-2 text-text-muted",
              )}
            >
              {change.trend === "up" && "↗"}
              {change.trend === "down" && "↘"}
              {change.trend === "neutral" && "→"}
              {Math.abs(change.value)}%
            </span>
            <span className="text-body-sm text-text-muted">{change.label}</span>
          </div>
        )}
      </div>
    </OptimizedCard>
  ),
);

MetricCard.displayName = "MetricCard";
