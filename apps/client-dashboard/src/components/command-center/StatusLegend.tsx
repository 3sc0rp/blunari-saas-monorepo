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
  React.useEffect(() => {
    console.log('StatusLegend: Received counts:', counts);
    console.log('StatusLegend: Final counts:', finalCounts);
  }, [counts, finalCounts]);

  // Use final counts (real data)

  const statusItems: StatusItem[] = [
    {
      status: "available",
      label: "Available",
      color: "bg-blue-400",
      count: finalCounts.available
    },
    {
      status: "seated",
      label: "Seated",
      color: "bg-purple-400",
      count: finalCounts.seated
    },
    {
      status: "reserved",
      label: "Reserved",
      color: "bg-amber-400",
      count: finalCounts.reserved
    },
    {
      status: "phone",
      label: "Phone Hold",
      color: "bg-orange-400",
      count: finalCounts.phone
    },
    {
      status: "walk-in",
      label: "Walk-in",
      color: "bg-green-400",
      count: finalCounts.walkIn
    },
    {
      status: "maintenance",
      label: "Maintenance",
      color: "bg-red-400",
      count: finalCounts.maintenance
    }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-white/90 mb-3">
        Table Status
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
                  "w-3 h-3 rounded-full shadow-sm",
                  item.color
                )}
                aria-hidden="true"
              />
              <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                {item.label}
              </span>
            </div>
            
            {/* Count */}
            <span className="text-sm font-medium tabular-nums text-white/60 group-hover:text-white/80 transition-colors">
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {/* Total count */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">
            Total Tables
          </span>
          <span className="text-sm font-bold tabular-nums text-white">
            {Object.values(finalCounts).reduce((sum, count) => sum + count, 0)}
          </span>
        </div>
        {Object.values(finalCounts).reduce((sum, count) => sum + count, 0) === 0 && (
          <div className="text-xs text-white/40 mt-1 text-center">
            No table data available
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
