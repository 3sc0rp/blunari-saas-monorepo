import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TableRow, Reservation } from "@/hooks/useCommandCenterData";
import { format, addHours, startOfDay, differenceInMinutes } from "date-fns";
import CurrentTimeMarker from './CurrentTimeMarker';
import DurationBar from './DurationBar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Clock, Users, Calendar, Phone, Globe, User } from "lucide-react";
import "./Timeline.css";

interface TimelineProps {
  tables: TableRow[];
  reservations: Reservation[];
  focusTableId?: string;
  onReservationClick: (reservation: Reservation) => void;
  onTimeSlotClick: (tableId: string, time: Date) => void;
  rowHeight?: number;
  onReservationChange?: (update: { id: string; start: string; end: string }) => void;
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
  rowHeight = 72,
  onReservationChange
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slotWidth, setSlotWidth] = useState<80 | 120 | 160>(80); // 15/30/60 min zoom

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
        label: format(time, "h:mm a"), // Use 12-hour format with AM/PM
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

  // Compute non-overlapping lanes for a set of reservations (per table)
  const computeLanes = (items: Reservation[]) => {
    const sorted = [...items].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const lanes: Reservation[][] = [];
    const laneIndexById: Record<string, number> = {};

    for (const r of sorted) {
      const rStart = new Date(r.start).getTime();
      const rEnd = new Date(r.end).getTime();
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        const last = lanes[i][lanes[i].length - 1];
        const lastEnd = new Date(last.end).getTime();
        if (rStart >= lastEnd) {
          lanes[i].push(r);
          laneIndexById[r.id] = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([r]);
        laneIndexById[r.id] = lanes.length - 1;
      }
    }

    return { laneIndexById, laneCount: Math.max(1, lanes.length) };
  };

  // Calculate left/width percentages for a reservation spanning the entire row timeline
  const getReservationPosition = (reservation: Reservation) => {
    try {
      const startTime = timeSlots[0]?.time;
      const endTime = addHours(timeSlots[0]?.time || new Date(), 6); // 6-hour window
      if (!startTime || !endTime) {
        return { left: '0%', width: '0%' };
      }
      const resStart = new Date(reservation.start);
      const resEnd = new Date(reservation.end);

      const totalMin = Math.max(1, differenceInMinutes(endTime, startTime));
      const leftMin = Math.max(0, Math.min(totalMin, differenceInMinutes(resStart, startTime)));
      const endMin = Math.max(0, Math.min(totalMin, differenceInMinutes(resEnd, startTime)));
      const spanMin = Math.max(1, endMin - leftMin);

      const leftPct = (leftMin / totalMin) * 100;
      const widthPct = (spanMin / totalMin) * 100;
      return { left: `${leftPct}%`, width: `${widthPct}%` };
    } catch {
      return { left: '0%', width: '0%' };
    }
  };

  // Get enhanced status color with gradients for reservation card
  const getReservationColor = (reservation: Reservation) => {
    const baseClasses = 'shadow-lg border-2 backdrop-blur-md';
    
    switch (reservation.status) {
      case 'confirmed':
        return `${baseClasses} bg-gradient-to-r from-blue-500/90 via-blue-600/85 to-blue-500/90 border-blue-400/60 shadow-blue-500/30`;
      case 'seated':
        return `${baseClasses} bg-gradient-to-r from-purple-500/90 via-purple-600/85 to-purple-500/90 border-purple-400/60 shadow-purple-500/30`;
      case 'completed':
        return `${baseClasses} bg-gradient-to-r from-emerald-500/90 via-emerald-600/85 to-emerald-500/90 border-emerald-400/60 shadow-emerald-500/30`;
      case 'no_show':
        return `${baseClasses} bg-gradient-to-r from-red-500/90 via-red-600/85 to-red-500/90 border-red-400/60 shadow-red-500/30`;
      case 'cancelled':
        return `${baseClasses} bg-gradient-to-r from-gray-500/90 via-gray-600/85 to-gray-500/90 border-gray-400/60 shadow-gray-500/30`;
      default:
        return `${baseClasses} bg-gradient-to-r from-slate-500/90 via-slate-600/85 to-slate-500/90 border-slate-400/60 shadow-slate-500/30`;
    }
  };

  // Get status icon for reservation
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Calendar className="w-3 h-3 text-blue-200" />;
      case 'seated':
        return <Users className="w-3 h-3 text-purple-200" />;
      case 'completed':
        return <Clock className="w-3 h-3 text-emerald-200" />;
      case 'no_show':
        return <Clock className="w-3 h-3 text-red-200" />;
      case 'cancelled':
        return <Clock className="w-3 h-3 text-gray-200" />;
      default:
        return <Calendar className="w-3 h-3 text-slate-200" />;
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
      {/* Enhanced Header with time slots */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="flex">
          {/* Enhanced table column header */}
          <div className="w-44 p-4 text-sm font-medium text-white/90 border-r border-white/20 bg-gradient-to-b from-slate-800/60 to-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/70" />
                <span className="uppercase tracking-wide text-xs text-white/70 font-semibold">Tables</span>
              </div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/80 font-medium">{tables.length} Active Tables</div>
              <div className="text-[10px] text-white/50 leading-tight">
                {reservations.length} Total Bookings
              </div>
            </div>
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
                      "flex-1 p-4 text-xs font-medium text-center border-r relative",
                      "transition-all duration-200 hover:bg-white/5",
                      isHourStart ? "border-white/20" : "border-white/8",
                      slot.isCurrentTime && "bg-gradient-to-b from-accent/30 to-accent/10 text-accent font-bold shadow-inner",
                      isEvenHour ? "bg-white/[0.03]" : "bg-transparent",
                      isHourStart && "font-bold text-white/90 bg-gradient-to-b from-white/10 to-transparent"
                    )}
                    style={{ minWidth: `${slotWidth}px` }}
                  >
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        isHourStart ? "text-sm font-bold" : "text-xs opacity-75",
                        slot.isCurrentTime && "animate-pulse"
                      )}>
                        {isHourStart ? format(slot.time, "h a") : format(slot.time, "h:mm")}
                      </div>
                      {!isHourStart && (
                        <div className="text-[10px] text-white/40 leading-none">
                          {format(slot.time, "mm")}
                        </div>
                      )}
                      {slot.isCurrentTime && (
                        <div className="w-1 h-1 bg-accent rounded-full mt-1 animate-pulse" />
                      )}
                    </div>
                    {isHourStart && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    )}
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
              {/* Enhanced zoom controls */}
              <div className="absolute right-4 top-3 flex items-center gap-2 bg-slate-800/80 backdrop-blur rounded-lg p-1 border border-white/10">
                <div className="flex items-center gap-1 px-2">
                  <Clock className="w-3 h-3 text-white/60" />
                  <span className="text-xs text-white/70 font-medium">Zoom:</span>
                </div>
                <div className="flex gap-1">
                  {[
                    { width: 80, label: '15m', icon: ZoomIn },
                    { width: 120, label: '30m', icon: Clock },
                    { width: 160, label: '60m', icon: ZoomOut }
                  ].map(({ width, label, icon: Icon }) => (
                    <Button
                      key={width}
                      variant={width === slotWidth ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs",
                        width === slotWidth 
                          ? "bg-accent text-accent-foreground shadow-sm" 
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      )}
                      onClick={() => setSlotWidth(width as any)}
                      aria-label={`Set zoom to ${label} slots`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
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
          const { laneIndexById, laneCount } = computeLanes(tableReservations);
          const laneHeight = Math.max(rowHeight, 56);
          
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
              {/* Premium table info panel */}
              <div className={cn(
                "w-44 p-4 border-r border-white/20 bg-gradient-to-br transition-all duration-300",
                isEvenRow ? "from-slate-800/60 via-slate-800/40 to-slate-800/30" : "from-slate-800/40 via-slate-800/25 to-slate-800/15",
                focusTableId === table.id && "from-accent/25 via-accent/15 to-accent/10 border-accent/40 shadow-lg shadow-accent/10",
                "hover:from-slate-700/60 hover:via-slate-700/40 hover:to-slate-700/30 backdrop-blur-sm"
              )}>
                <div className="space-y-3">
                  {/* Table header with enhanced status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full shadow-sm",
                        table.status === 'available' && "bg-emerald-400 shadow-emerald-400/30",
                        table.status === 'occupied' && "bg-purple-400 shadow-purple-400/30",
                        table.status === 'reserved' && "bg-amber-400 shadow-amber-400/30",
                        table.status === 'maintenance' && "bg-red-400 shadow-red-400/30"
                      )} />
                      <div className="text-sm font-bold text-white leading-tight drop-shadow-sm">
                        {table.name}
                      </div>
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-2 py-1 font-bold uppercase tracking-wider border backdrop-blur-sm shadow-sm",
                        table.status === 'available' && "bg-emerald-500/30 text-emerald-100 border-emerald-400/60 shadow-emerald-500/20",
                        table.status === 'occupied' && "bg-purple-500/30 text-purple-100 border-purple-400/60 shadow-purple-500/20",
                        table.status === 'reserved' && "bg-amber-500/30 text-amber-100 border-amber-400/60 shadow-amber-500/20",
                        table.status === 'maintenance' && "bg-red-500/30 text-red-100 border-red-400/60 shadow-red-500/20"
                      )}
                    >
                      {table.status === 'available' ? 'Open' : 
                       table.status === 'occupied' ? 'Busy' :
                       table.status === 'reserved' ? 'Hold' : 'Fix'}
                    </Badge>
                  </div>
                  
                  {/* Table details */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-white/80">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-medium">{table.capacity} seats</span>
                    </div>
                    
                    <div className="text-white/60 font-medium bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                      {table.section}
                    </div>
                  </div>
                  
                  {/* Enhanced booking count indicator */}
                  <div className="flex items-center justify-between text-xs">
                    {tableReservations.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-accent" />
                        <span className="text-white/70 font-medium">
                          <span className="text-accent font-bold">{tableReservations.length}</span> booking{tableReservations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-white/40">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">No bookings</span>
                      </div>
                    )}
                    
                    {/* Table utilization indicator */}
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      utilization > 75 ? "bg-red-500/20 text-red-300" :
                      utilization > 50 ? "bg-amber-500/20 text-amber-300" :
                      utilization > 25 ? "bg-blue-500/20 text-blue-300" :
                      "bg-emerald-500/20 text-emerald-300"
                    )}>
                      {Math.round(utilization)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline slots */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max relative">
                  {timeSlots.map((slot, slotIndex) => {
                    const hourIndex = Math.floor(slotIndex / 4); // Every 4 slots = 1 hour
                    const isEvenHour = hourIndex % 2 === 0;
                    const isHourStart = slot.time.getMinutes() === 0;
                    return (
                      <div
                        key={slotIndex}
                        className={cn(
                          "flex-1 p-1 border-r relative",
                          isHourStart ? "border-white/10" : "border-white/6",
                          isEvenHour ? "bg-white/[0.02]" : "bg-transparent"
                        )}
                        style={{ minHeight: `${laneHeight * laneCount}px`, minWidth: `${slotWidth}px` }}
                      >
                        {/* Time slot click area */}
                        <button
                          className="w-full h-full rounded hover:bg-white/8 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
                          onClick={() => onTimeSlotClick(table.id, slot.time)}
                          aria-label={`Create reservation for ${table.name} at ${slot.label}`}
                          tabIndex={0}
                        />
                      </div>
                    );
                  })}

                  {/* Reservation overlay: render each reservation once spanning the timeline and stack by lanes */}
                  <div className="absolute inset-0">
                    {tableReservations.map((reservation) => {
                      const pos = getReservationPosition(reservation);
                      const laneIdx = laneIndexById[reservation.id] ?? 0;
                      const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
                        if (!onReservationChange) return;
                        const rowEl = (e.currentTarget.parentElement?.parentElement) as HTMLElement;
                        if (!rowEl) return;
                        const startX = e.clientX;
                        const origStart = new Date(reservation.start);
                        const onMove = (ev: MouseEvent) => {
                          const dx = ev.clientX - startX;
                          const minutesPerPx = (15 / (slotWidth)); // 15 min per slotWidth px
                          const moveMin = Math.round(dx * minutesPerPx);
                          const newStart = new Date(origStart.getTime() + moveMin * 60000);
                          const duration = new Date(reservation.end).getTime() - origStart.getTime();
                          const newEnd = new Date(newStart.getTime() + duration);
                          onReservationChange?.({ id: reservation.id, start: newStart.toISOString(), end: newEnd.toISOString() });
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      };

                      const handleResize = (e: React.MouseEvent<HTMLDivElement>, edge: 'start' | 'end') => {
                        if (!onReservationChange) return;
                        e.stopPropagation();
                        const startX = e.clientX;
                        const origStart = new Date(reservation.start);
                        const origEnd = new Date(reservation.end);
                        const onMove = (ev: MouseEvent) => {
                          const dx = ev.clientX - startX;
                          const minutesPerPx = (15 / (slotWidth));
                          const deltaMin = Math.round(dx * minutesPerPx);
                          let newStart = origStart;
                          let newEnd = origEnd;
                          if (edge === 'start') {
                            newStart = new Date(origStart.getTime() + deltaMin * 60000);
                          } else {
                            newEnd = new Date(origEnd.getTime() + deltaMin * 60000);
                          }
                          if (newEnd > newStart) {
                            onReservationChange?.({ id: reservation.id, start: newStart.toISOString(), end: newEnd.toISOString() });
                          }
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      };

                      return (
                        <TooltipProvider delayDuration={200} key={reservation.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute rounded-xl cursor-pointer p-3 transition-all duration-300 ease-out",
                                  "hover:shadow-2xl hover:scale-[1.02] hover:z-50 focus:outline-none focus:ring-2 focus:ring-white/40",
                                  "group overflow-hidden transform-gpu will-change-transform",
                                  "border-l-4 relative",
                                  getReservationColor(reservation)
                                )}
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  top: 4 + laneIdx * laneHeight,
                                  height: laneHeight - 8,
                                  zIndex: 25 + laneIdx
                                }}
                                onClick={() => onReservationClick(reservation)}
                                onMouseDown={handleDrag}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onReservationClick(reservation);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Reservation for ${reservation.guestName}, ${reservation.partySize} guests from ${format(new Date(reservation.start), "h:mm a")} to ${format(new Date(reservation.end), "h:mm a")}, status: ${reservation.status}`}
                              >
                                {/* Resize handles */}
                                {onReservationChange && (
                                  <>
                                    <div
                                      className="absolute inset-y-1 left-0 w-1 bg-white/40 hover:bg-white/70 cursor-ew-resize rounded"
                                      onMouseDown={(ev) => handleResize(ev, 'start')}
                                      aria-label="Resize start"
                                      role="separator"
                                    />
                                    <div
                                      className="absolute inset-y-1 right-0 w-1 bg-white/40 hover:bg-white/70 cursor-ew-resize rounded"
                                      onMouseDown={(ev) => handleResize(ev, 'end')}
                                      aria-label="Resize end"
                                      role="separator"
                                    />
                                  </>
                                )}
                                {/* Premium reservation content with enhanced customer display */}
                                <div className="relative h-full flex flex-col justify-between z-10">
                                  {/* Header with customer name and status */}
                                  <div className="flex items-start justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5 text-white min-w-0 flex-1">
                                      {getStatusIcon(reservation.status)}
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold truncate text-white drop-shadow-sm">
                                          {reservation.guestName}
                                        </div>
                                        <div className="text-[10px] text-white/80 font-medium capitalize">
                                          {reservation.status}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <Badge 
                                        variant="secondary" 
                                        className="bg-white/30 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm backdrop-blur-sm border border-white/20"
                                      >
                                        <Users className="w-2.5 h-2.5 mr-1" />
                                        {reservation.partySize}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Time and channel information */}
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1 text-white/95">
                                      <Clock className="w-3 h-3 opacity-80" />
                                      <span className="font-semibold text-[11px] drop-shadow-sm">
                                        {format(new Date(reservation.start), "h:mm a")}
                                      </span>
                                      <span className="text-white/70 mx-0.5">–</span>
                                      <span className="font-semibold text-[11px] drop-shadow-sm">
                                        {format(new Date(reservation.end), "h:mm a")}
                                      </span>
                                    </div>
                                    
                                    {reservation.channel && (
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          "text-[9px] px-1.5 py-0.5 border-white/40 backdrop-blur-sm font-semibold",
                                          reservation.channel === 'online' && "bg-blue-400/30 text-blue-100 border-blue-400/50",
                                          reservation.channel === 'phone' && "bg-orange-400/30 text-orange-100 border-orange-400/50",
                                          reservation.channel === 'walkin' && "bg-green-400/30 text-green-100 border-green-400/50"
                                        )}
                                      >
                                        {reservation.channel === 'online' && <Globe className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel === 'phone' && <Phone className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel === 'walkin' && <User className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel.charAt(0).toUpperCase() + reservation.channel.slice(1)}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Enhanced hover effects */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl" />
                                  <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-white/20 transition-all duration-300 rounded-xl" />
                                </div>
                                
                                {/* Premium glass effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 rounded-xl pointer-events-none" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm text-xs bg-slate-900/95 border-slate-700 shadow-xl backdrop-blur-md">
                              <div className="space-y-2 p-1">
                                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                                  <div className="font-semibold text-white text-sm">{reservation.guestName}</div>
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] px-2 py-0.5 font-medium border",
                                    reservation.status === 'confirmed' && "bg-blue-500/20 text-blue-200 border-blue-500/40",
                                    reservation.status === 'seated' && "bg-purple-500/20 text-purple-200 border-purple-500/40",
                                    reservation.status === 'completed' && "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
                                    reservation.status === 'no_show' && "bg-red-500/20 text-red-200 border-red-500/40",
                                    reservation.status === 'cancelled' && "bg-gray-500/20 text-gray-200 border-gray-500/40",
                                    reservation.status === 'pending' && "bg-orange-500/20 text-orange-200 border-orange-500/40"
                                  )}>
                                    {reservation.status?.toUpperCase() || 'PENDING'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-slate-300">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-blue-400" />
                                      <span className="font-medium text-white">{format(new Date(reservation.start), "h:mm a")}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 ml-4">Start time</div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-purple-400" />
                                      <span className="font-medium text-white">{format(new Date(reservation.end), "h:mm a")}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 ml-4">End time</div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-emerald-400" />
                                    <span className="font-medium text-white">{reservation.partySize} guests</span>
                                  </div>
                                  
                                  {reservation.channel && (
                                    <div className="flex items-center gap-1">
                                      {reservation.channel === 'online' && <Globe className="w-3 h-3 text-blue-400" />}
                                      {reservation.channel === 'phone' && <Phone className="w-3 h-3 text-orange-400" />}
                                      {reservation.channel === 'walkin' && <User className="w-3 h-3 text-green-400" />}
                                      <span className="text-slate-300 capitalize text-[11px]">{reservation.channel}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {(reservation.guestPhone || reservation.specialRequests) && (
                                  <div className="border-t border-slate-700/50 pt-2 space-y-1">
                                    {reservation.guestPhone && (
                                      <div className="text-[11px] text-slate-400">
                                        📱 {reservation.guestPhone}
                                      </div>
                                    )}
                                    {reservation.specialRequests && (
                                      <div className="text-[11px] text-slate-400">
                                        📝 {reservation.specialRequests}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                  
                  {/* Current Time Marker for this row */}
                  <CurrentTimeMarker
                    startHour={17}
                    endHour={23}
                    slotHeight={laneHeight * laneCount}
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
