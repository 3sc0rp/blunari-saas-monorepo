import React from "react";
import { cn } from "@/lib/utils";

interface KitchenLoadGaugeProps {
  percentage: number;
  label?: string;
  className?: string;
}

export function KitchenLoadGauge({ 
  percentage, 
  label = "Kitchen Load",
  className 
}: KitchenLoadGaugeProps) {
  // Clamp percentage between 0 and 100
  const safePercentage = Math.max(0, Math.min(100, percentage));
  
  // Convert percentage to angle (180 degrees = semicircle)
  const angle = (safePercentage / 100) * 180;
  
  // Calculate color based on load
  const getLoadColor = (pct: number) => {
    if (pct < 40) return "#3B82F6"; // Blue - light load
    if (pct < 70) return "#F59E0B"; // Amber - moderate load
    return "#EF4444"; // Red - heavy load
  };

  const loadColor = getLoadColor(safePercentage);

  // Create arc path
  const centerX = 60;
  const centerY = 55;
  const radius = 35;
  const startAngle = 180; // Start from left (180 degrees)
  const endAngle = 180 - angle; // End angle based on percentage

  // Convert degrees to radians
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  // Calculate arc coordinates
  const x1 = centerX + radius * Math.cos(startAngleRad);
  const y1 = centerY + radius * Math.sin(startAngleRad);
  const x2 = centerX + radius * Math.cos(endAngleRad);
  const y2 = centerY + radius * Math.sin(endAngleRad);

  const largeArcFlag = angle > 180 ? 1 : 0;

  const arcPath = `
    M ${x1} ${y1}
    A ${radius} ${radius} 0 ${largeArcFlag} 0 ${x2} ${y2}
  `;

  // Background arc (full semicircle)
  const backgroundPath = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 0 ${centerX + radius} ${centerY}
  `;

  // Get load status text and color
  const getLoadStatus = (pct: number) => {
    if (pct < 40) return { text: "Light", color: "text-blue-400" };
    if (pct < 70) return { text: "Moderate", color: "text-amber-400" };
    return { text: "Heavy", color: "text-red-400" };
  };

  const loadStatus = getLoadStatus(safePercentage);

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      {/* Gauge SVG */}
      <div className="relative">
        <svg
          width="120"
          height="80"
          viewBox="0 0 120 80"
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={backgroundPath}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-white/10"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d={arcPath}
            stroke={loadColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
          
          {/* Center indicator */}
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill="currentColor"
            className="text-white/20"
          />
        </svg>

        {/* Percentage display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
          <span className="text-xl font-bold tabular-nums text-white">
            {safePercentage}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center space-y-1">
        <div className="text-sm font-medium text-white/90">
          {label}
        </div>
        <div className={cn("text-xs font-medium", loadStatus.color)}>
          {loadStatus.text}
        </div>
      </div>

      {/* Tick marks */}
      <div className="relative w-full">
        <div className="flex justify-between text-xs text-white/40 px-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

export default KitchenLoadGauge;
