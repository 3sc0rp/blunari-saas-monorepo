import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TableRow, Reservation } from "@/hooks/useCommandCenterData";
import { format, addHours, startOfDay, differenceInMinutes } from "date-fns";
import CurrentTimeMarker from './CurrentTimeMarker';
import DurationBar from './DurationBar';

interface TimelineProps {
  tables: TableRow[];
  reservations: Reservation[];
  focusTableId?: string;
  onReservationClick: (reservation: Reservation) => void;
  onTimeSlotClick: (tableId: string, time: Date) => void;
  rowHeight?: number;
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
  onTimeSlotClick,
  rowHeight = 72
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

  // Generate time slots (every 15 minutes from 5 PM to 11 PM)
  const generateTimeSlots = useCallback((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    const startTime = new Date(today);
    startTime.setHours(17, 0, 0, 0); // Start at 5:00 PM
    
    for (let i = 0; i < 24; i++) { // 6 hours * 4 slots per hour = 24 slots
      const time = new Date(startTime.getTime() + (i * 15 * 60 * 1000)); // Add 15 minutes each iteration
      const isCurrentTime = Math.abs(differenceInMinutes(time, currentTime)) < 15;
      
      slots.push({
        time,
        label: format(time, "H:mm"),
        isCurrentTime
      });
    }
    
    return slots;
  }, [currentTime]);

  const timeSlots = useMemo(() => generateTimeSlots(), [generateTimeSlots]);

  // Calculate table utilization for duration bar
  const getTableUtilization = (tableId: string): number => {
    const tableReservations = reservations.filter(r => r.tableId === tableId);
    if (tableReservations.length === 0) return 0;
    
    // Calculate total booked minutes vs total available minutes (6 hours = 360 minutes)
    const totalMinutes = tableReservations.reduce((acc, reservation) => {
      try {
        const start = new Date(reservation.start);
        const end = new Date(reservation.end);
        return acc + differenceInMinutes(end, start);
      } catch {
        return acc;
      }
    }, 0);
    
    return Math.min(100, (totalMinutes / 360) * 100); // 360 minutes = 6 hours
  };

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
        
        const slotEnd = new Date(slotTime.getTime() + (15 * 60 * 1000)); // Add 15 minutes
        
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
      
      // Each 15-minute slot is 1 unit width
      // Minimum width of 1 slot, maximum of 8 slots
      const slots = Math.max(1, Math.min(8, durationMinutes / 15));
      return `${slots * 100}%`;
    } catch (error) {
      console.warn('Error calculating reservation width:', error);
      return '100%'; // Fallback width
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto glass rounded-lg relative"
      role="region"
      aria-label="Restaurant table timeline showing reservations throughout the day"
    >
      {/* Header with time slots */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/15">
        <div className="flex">
          {/* Table column header */}
          <div className="w-32 p-3 text-sm font-medium text-white/90 border-r border-white/15 bg-slate-800/50">
            <span className="uppercase tracking-wide text-xs text-white/70">Tables</span>
          </div>
          
          {/* Time slot headers */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max relative">
              {timeSlots.map((slot, index) => {
                const isHourStart = slot.time.getMinutes() === 0;
                const hourIndex = Math.floor(index / 4); // Every 4 slots = 1 hour
                const isEvenHour = hourIndex % 2 === 0;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 min-w-[80px] p-3 text-xs font-medium text-center border-r",
                      "transition-colors",
                      isHourStart ? "border-white/15" : "border-white/6",
                      slot.isCurrentTime && "bg-accent/20 text-accent font-semibold",
                      isEvenHour ? "bg-white/[0.02]" : "bg-transparent",
                      isHourStart && "font-semibold uppercase tracking-wide text-white/80"
                    )}
                  >
                    {isHourStart ? format(slot.time, "H:mm") : format(slot.time, ":mm")}
                  </div>
                );
              })}
              
              {/* Current Time Marker in header */}
              <CurrentTimeMarker
                startHour={17}
                endHour={23}
                slotHeight={60}
                slotWidth={80}
                className="top-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-white/10">
        {tables.map((table, tableIndex) => {
          const isEvenRow = tableIndex % 2 === 0;
          const utilization = getTableUtilization(table.id);
          const tableReservations = reservations.filter(r => r.tableId === table.id);
          
          return (
            <div 
              key={table.id}
              className={cn(
                "flex transition-colors relative",
                isEvenRow ? "bg-white/[0.015]" : "bg-transparent",
                "hover:bg-white/[0.05]",
                focusTableId === table.id && "bg-accent/10 hover:bg-accent/15"
              )}
            >
              {/* Table info */}
              <div className={cn(
                "w-32 p-4 border-r border-white/15 bg-slate-800/30",
                isEvenRow && "bg-slate-800/40"
              )}>
                <div className="text-sm font-semibold text-white leading-tight">
                  {table.name}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {table.capacity} seats • {table.section}
                </div>
                <div className={cn(
                  "text-xs font-medium mt-2 px-2 py-0.5 rounded-full inline-block",
                  table.status === 'available' && "text-blue-300 bg-blue-500/20",
                  table.status === 'occupied' && "text-purple-300 bg-purple-500/20",
                  table.status === 'reserved' && "text-amber-300 bg-amber-500/20",
                  table.status === 'maintenance' && "text-red-300 bg-red-500/20"
                )}>
                  {table.status}
                </div>
              </div>

              {/* Timeline slots */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max relative">
                  {timeSlots.map((slot, slotIndex) => {
                    const slotReservations = getReservationsForSlot(table.id, slot.time);
                    const hourIndex = Math.floor(slotIndex / 4); // Every 4 slots = 1 hour
                    const isEvenHour = hourIndex % 2 === 0;
                    const isHourStart = slot.time.getMinutes() === 0;
                    
                    return (
                      <div
                        key={slotIndex}
                        className={cn(
                          "flex-1 min-w-[80px] p-1 border-r relative",
                          isHourStart ? "border-white/10" : "border-white/6",
                          isEvenHour ? "bg-white/[0.02]" : "bg-transparent"
                        )}
                        style={{ minHeight: `${rowHeight}px` }}
                      >
                        {/* Time slot click area */}
                        <button
                          className="w-full h-full rounded hover:bg-white/8 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
                          onClick={() => onTimeSlotClick(table.id, slot.time)}
                          aria-label={`Create reservation for ${table.name} at ${slot.label}`}
                          tabIndex={0}
                        />

                        {/* Reservation cards */}
                        {slotReservations.map((reservation) => (
                          <div
                            key={reservation.id}
                            className={cn(
                              "absolute top-1 left-1 right-1 rounded border cursor-pointer p-2 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent/50",
                              "backdrop-blur-sm",
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
                            aria-label={`Reservation for ${reservation.guestName}, ${reservation.partySize} guests at ${format(new Date(reservation.start), "H:mm")}, status: ${reservation.status}`}
                          >
                            <div className="text-xs font-semibold text-white truncate">
                              {reservation.guestName}
                            </div>
                            <div className="text-xs text-white/80 truncate flex items-center gap-1">
                              <span className="bg-white/20 px-1 rounded text-[10px] font-medium">
                                P{reservation.partySize}
                              </span>
                              <span>{format(new Date(reservation.start), "H:mm")}</span>
                              {reservation.channel && (
                                <span className={cn(
                                  "text-[10px] px-1 rounded",
                                  reservation.channel === 'online' && "bg-blue-400/30 text-blue-200",
                                  reservation.channel === 'phone' && "bg-orange-400/30 text-orange-200",
                                  reservation.channel === 'walkin' && "bg-green-400/30 text-green-200"
                                )}>
                                  {reservation.channel.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  
                  {/* Current Time Marker for this row */}
                  <CurrentTimeMarker
                    startHour={17}
                    endHour={23}
                    slotHeight={rowHeight}
                    slotWidth={80}
                    className="top-0"
                  />
                </div>
              </div>

              {/* Duration Bar */}
              <div className="w-8 border-l border-white/10 p-2 bg-slate-800/20 flex items-center justify-center">
                <DurationBar 
                  utilization={utilization}
                  bookings={tableReservations.length}
                  capacity={1}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          );
        })}
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
          <div className="text-center space-y-3 bg-slate-900/80 backdrop-blur rounded-lg p-6 border border-white/10">
            <div className="text-sm text-white/70 font-medium">No reservations for this date</div>
            <div className="text-xs text-white/50">Click on time slots to add your first booking</div>
            <div className="text-xs text-white/40 bg:white/5 px-2 py-1 rounded">
              Press <kbd className="bg-white/10 px-1 rounded text-white/60">N</kbd> for quick booking
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
