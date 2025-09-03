import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TableRow, Reservation } from "@/hooks/useCommandCenterData";
import { format, addHours, startOfDay, differenceInMinutes } from "date-fns";

interface TimelineProps {
  tables: TableRow[];
  reservations: Reservation[];
  focusTableId?: string;
  onReservationClick: (reservation: Reservation) => void;
  onTimeSlotClick: (tableId: string, time: Date) => void;
}

interface TimeSlot {
  time: Date;
  label: string;
  isCurrentTime: boolean;
}

export function Timeline({
  tables,
  reservations,
  focusTableId,
  onReservationClick,
  onTimeSlotClick
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Generate time slots (every 30 minutes from 11 AM to 11 PM)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    const startTime = new Date(today);
    startTime.setHours(11, 0, 0, 0); // Start at 11:00 AM
    
    for (let i = 0; i < 24; i++) { // 12 hours * 2 slots per hour = 24 slots
      const time = new Date(startTime.getTime() + (i * 30 * 60 * 1000)); // Add 30 minutes each iteration
      const isCurrentTime = Math.abs(differenceInMinutes(time, currentTime)) < 30;
      
      slots.push({
        time,
        label: format(time, "h:mm a"),
        isCurrentTime
      });
    }
    
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), [currentTime]);

  // Get reservations for a specific table and time slot
  const getReservationsForSlot = (tableId: string, slotTime: Date) => {
    return reservations.filter(reservation => {
      try {
        if (reservation.tableId !== tableId) return false;
        
        const resStart = new Date(reservation.start);
        const resEnd = new Date(reservation.end);
        
        // Validate dates
        if (isNaN(resStart.getTime()) || isNaN(resEnd.getTime())) {
          return false;
        }
        
        const slotEnd = new Date(slotTime.getTime() + (30 * 60 * 1000)); // Add 30 minutes
        
        // Check if reservation overlaps with this 30-minute slot
        return resStart < slotEnd && resEnd > slotTime;
      } catch (error) {
        console.warn('Error filtering reservation:', error);
        return false;
      }
    });
  };

  // Get status color for reservation card
  const getReservationColor = (reservation: Reservation) => {
    switch (reservation.status) {
      case 'confirmed':
        return 'bg-blue-500/80 border-blue-400';
      case 'seated':
        return 'bg-purple-500/80 border-purple-400';
      case 'completed':
        return 'bg-gray-500/80 border-gray-400';
      case 'no_show':
        return 'bg-red-500/80 border-red-400';
      case 'cancelled':
        return 'bg-gray-600/80 border-gray-500';
      default:
        return 'bg-slate-500/80 border-slate-400';
    }
  };

  // Calculate reservation card width based on duration
  const getReservationWidth = (reservation: Reservation) => {
    try {
      const start = new Date(reservation.start);
      const end = new Date(reservation.end);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '100%'; // Default width for invalid dates
      }
      
      const durationMinutes = differenceInMinutes(end, start);
      
      // Each 30-minute slot is 1 unit width
      // Minimum width of 1 slot, maximum of 4 slots
      const slots = Math.max(1, Math.min(4, durationMinutes / 30));
      return `${slots * 100}%`;
    } catch (error) {
      console.warn('Error calculating reservation width:', error);
      return '100%'; // Fallback width
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto glass rounded-lg"
      role="region"
      aria-label="Restaurant table timeline showing reservations throughout the day"
    >
      {/* Header with time slots */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="flex">
          {/* Table column header */}
          <div className="w-32 p-3 text-sm font-medium text-white/90 border-r border-white/10">
            Tables
          </div>
          
          {/* Time slot headers */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 min-w-[100px] p-3 text-xs font-medium text-center border-r border-white/5",
                    slot.isCurrentTime && "bg-accent/20 text-accent"
                  )}
                >
                  {slot.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-white/5">
        {tables.map((table) => (
          <div 
            key={table.id}
            className={cn(
              "flex hover:bg-white/5 transition-colors",
              focusTableId === table.id && "bg-accent/10"
            )}
          >
            {/* Table info */}
            <div className="w-32 p-3 border-r border-white/10">
              <div className="text-sm font-medium text-white">
                {table.name}
              </div>
              <div className="text-xs text-white/60">
                {table.capacity} seats • {table.section}
              </div>
              <div className={cn(
                "text-xs font-medium mt-1",
                table.status === 'available' && "text-blue-400",
                table.status === 'occupied' && "text-purple-400",
                table.status === 'reserved' && "text-amber-400",
                table.status === 'maintenance' && "text-red-400"
              )}>
                {table.status}
              </div>
            </div>

            {/* Timeline slots */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max relative">
                {timeSlots.map((slot, slotIndex) => {
                  const slotReservations = getReservationsForSlot(table.id, slot.time);
                  
                  return (
                    <div
                      key={slotIndex}
                      className="flex-1 min-w-[100px] p-1 border-r border-white/5 relative"
                      style={{ minHeight: '64px' }}
                    >
                      {/* Time slot click area */}
                      <button
                        className="w-full h-full rounded hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                        onClick={() => onTimeSlotClick(table.id, slot.time)}
                        aria-label={`Create reservation for ${table.name} at ${slot.label}`}
                        tabIndex={0}
                      />

                      {/* Reservation cards */}
                      {slotReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className={cn(
                            "absolute top-1 left-1 right-1 rounded border cursor-pointer p-1 hover:shadow-md transition-all focus:outline-none focus:ring-1 focus:ring-accent",
                            getReservationColor(reservation)
                          )}
                          style={{
                            width: getReservationWidth(reservation),
                            zIndex: 20
                          }}
                          onClick={() => onReservationClick(reservation)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onReservationClick(reservation);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Reservation for ${reservation.guestName}, ${reservation.partySize} guests at ${format(new Date(reservation.start), "h:mm a")}, status: ${reservation.status}`}
                        >
                          <div className="text-xs font-medium text-white truncate">
                            {reservation.guestName}
                          </div>
                          <div className="text-xs text-white/80 truncate">
                            {reservation.partySize}p • {format(new Date(reservation.start), "h:mm a")}
                          </div>
                        </div>
                      ))}

                      {/* Current time indicator */}
                      {slot.isCurrentTime && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {tables.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin mx-auto" />
            <div className="text-sm text-white/60">Loading timeline...</div>
          </div>
        </div>
      )}

      {/* Empty state when tables exist but no reservations */}
      {tables.length > 0 && reservations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2 bg-slate-900/80 backdrop-blur rounded-lg p-4">
            <div className="text-sm text-white/60">No reservations found</div>
            <div className="text-xs text-white/40">Click on time slots to create new reservations</div>
          </div>
        </div>
      )}

      {/* Current time line overlay */}
      {(() => {
        const currentSlotIndex = timeSlots.findIndex(slot => slot.isCurrentTime);
        if (currentSlotIndex === -1) return null;
        
        return (
          <div 
            className="absolute w-0.5 bg-accent shadow-lg pointer-events-none z-30"
            style={{
              left: `${132 + (currentSlotIndex * 100)}px`,
              top: '56px',
              bottom: '0px'
            }}
          />
        );
      })()}
    </div>
  );
}
