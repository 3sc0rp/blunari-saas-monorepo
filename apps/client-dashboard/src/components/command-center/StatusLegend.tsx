import React from "react";
import { cn } from "@/lib/utils";

interface StatusItem {
  status: string;
  label: string;
  color: string;
  count: number;
}

interface StatusLegendProps {
  counts?: {
    available: number;
    seated: number;
    reserved: number;
    phone: number;
    walkIn: number;
    maintenance: number;
  };
  className?: string;
}

export function StatusLegend({ counts, className }: StatusLegendProps) {
  const defaultCounts = {
    available: 0,
    seated: 0,
    reserved: 0,
    phone: 0,
    walkIn: 0,
    maintenance: 0
  };

  const finalCounts = { ...defaultCounts, ...counts };

  // Debug logging to help with troubleshooting
  React.useEffect(() => {  }, [counts, finalCounts]);

  // Use final counts (real data)
      const statusItems: StatusItem[] = [
    {
      status: "available",
      label: "Available Tables",
      color: "bg-emerald-400 shadow-emerald-400/40",
      count: finalCounts.available
    },
    {
      status: "seated",
      label: "Seated Guests",
      color: "bg-purple-400 shadow-purple-400/40",
      count: finalCounts.seated
    },
    {
      status: "reserved",
      label: "Reserved Tables",
      color: "bg-amber-400 shadow-amber-400/40",
      count: finalCounts.reserved
    },
    {
      status: "phone",
      label: "Phone Bookings",
      color: "bg-orange-400 shadow-orange-400/40",
      count: finalCounts.phone
    },
    {
      status: "walk-in",
      label: "Walk-in Queue",
      color: "bg-cyan-400 shadow-cyan-400/40",
      count: finalCounts.walkIn
    },
    {
      status: "maintenance",
      label: "Under Maintenance",
      color: "bg-red-400 shadow-red-400/40",
      count: finalCounts.maintenance
    }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-white/90 mb-3">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span>Live Status</span>
      </div>
      
      <div className="space-y-2">
        {statusItems.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between group"
          >
            {/* Status indicator and label */}
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  item.color
                )}
                aria-hidden="true"
              />
              <span className="text-xs text-white/80 group-hover:text-white transition-colors font-medium">
                {item.label}
              </span>
            </div>
            
            {/* Count with enhanced styling */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md transition-all duration-200",
                item.count > 0 
                  ? "text-white bg-white/10 group-hover:bg-white/20" 
                  : "text-white/40"
              )}>
                {item.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total count with enhanced styling */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-white/5">
          <span className="text-sm font-semibold text-white/90 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            Total Active
          </span>
          <span className="text-lg font-bold tabular-nums text-white bg-blue-500/20 px-3 py-1 rounded-md">
            {Object.values(finalCounts).reduce((sum, count) => sum + count, 0)}
          </span>
        </div>
        {Object.values(finalCounts).reduce((sum, count) => sum + count, 0) === 0 && (
          <div className="text-xs text-white/40 mt-2 text-center p-2 bg-red-500/10 rounded border border-red-500/20">
            ⚠️ No table data available
          </div>
        )}
      </div>

      {/* Status indicators key */}
      <div className="pt-2 space-y-1">
        <div className="text-xs text-white/40">
          Status Indicators:
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs text-white/40">
          <div>• Circle = Table</div>
          <div>• Square = Booth</div>
        </div>
      </div>
    </div>
  );
}


