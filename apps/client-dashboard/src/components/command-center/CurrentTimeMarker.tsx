import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CurrentTimeMarkerProps {
  /** Starting hour (24-hour format, e.g., 17 for 5 PM) */
  startHour: number;
  /** Ending hour (24-hour format, e.g., 23 for 11 PM) */
  endHour: number;
  /** Height of each time slot in pixels */
  slotHeight?: number;
  /** Width of each time slot in pixels (15-minute intervals) */
  slotWidth?: number;
  className?: string;
}

export const CurrentTimeMarker: React.FC<CurrentTimeMarkerProps> = ({
  startHour = 17,
  endHour = 23,
  slotHeight = 60,
  slotWidth = 80,
  className
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const getCurrentPosition = (): { left: number; visible: boolean } => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Check if current time is within the visible range
    if (currentHour < startHour || currentHour >= endHour) {
      return { left: 0, visible: false };
    }

    // Calculate total minutes from start hour
    const totalMinutes = (currentHour - startHour) * 60 + currentMinutes;
    
    // Each slot represents 15 minutes
    const slotsFromStart = totalMinutes / 15;
    
    // Calculate pixel position
    const left = slotsFromStart * slotWidth;

    return { left, visible: true };
  };

  const { left, visible } = getCurrentPosition();

  if (!visible) {
    return null;
  }

  const timeString = currentTime.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 z-30 pointer-events-none",
        className
      )}
      style={{ left: `${left}px` }}
    >
      {/* Main line */}
      <div 
        className="w-[2px] h-full bg-gradient-to-b from-accent/80 to-accent/40 shadow-lg"
        style={{
          boxShadow: '0 0 8px rgba(var(--accent-rgb, 59, 130, 246), 0.5)'
        }}
      />
      
      {/* Time label */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <div className="bg-accent text-accent-foreground text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
          {timeString}
        </div>
        {/* Arrow pointing down */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-accent" />
      </div>
      
      {/* Glow effect */}
      <div 
        className="absolute top-0 bottom-0 w-[1px] bg-accent/20 -left-[2px]"
        style={{
          boxShadow: '0 0 12px rgba(var(--accent-rgb, 59, 130, 246), 0.3)'
        }}
      />
    </div>
  );
};

export default CurrentTimeMarker;
