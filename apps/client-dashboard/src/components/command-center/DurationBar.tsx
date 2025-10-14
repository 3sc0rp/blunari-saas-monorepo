import React from 'react';
import { cn } from '@/lib/utils';

interface DurationBarProps {
  /** Utilization percentage (0-100) */
  utilization: number;
  /** Total capacity for this time period */
  capacity?: number;
  /** Current bookings count */
  bookings?: number;
  className?: string;
}

export const DurationBar: React.FC<DurationBarProps> = ({
  utilization,
  capacity = 1,
  bookings = 0,
  className
}) => {
  // Clamp utilization between 0 and 100
  const safeUtilization = Math.max(0, Math.min(100, utilization));
  
  // Get color based on utilization level
  const getUtilizationColor = (pct: number) => {
    if (pct < 30) return 'bg-blue-400'; // Low utilization
    if (pct < 70) return 'bg-amber-400'; // Medium utilization  
    if (pct < 90) return 'bg-orange-400'; // High utilization
    return 'bg-red-400'; // Over capacity
  };

  const barColor = getUtilizationColor(safeUtilization);

  return (
    <div className={cn("flex flex-col items-end space-y-1", className)}>
      {/* Utilization bar */}
      <div className="w-1 h-12 bg-white/10 rounded-full overflow-hidden relative">
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 transition-all duration-300 rounded-full",
            barColor
          )}
          style={{ height: `${safeUtilization}%` }}
        />
        
        {/* Glow effect for high utilization */}
        {safeUtilization > 80 && (
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-400/40 to-transparent rounded-full"
            style={{ height: `${safeUtilization}%` }}
          />
        )}
      </div>
      
      {/* Utilization text */}
      <div className="text-xs text-white/60 font-mono tabular-nums">
        {safeUtilization}%
      </div>
      
      {/* Booking count if provided */}
      {bookings > 0 && (
        <div className="text-xs text-white/40 font-medium">
          {bookings}/{capacity}
        </div>
      )}
    </div>
  );
};

export default DurationBar;
