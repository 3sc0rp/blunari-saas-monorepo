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
      {/* Enhanced Header with time slots */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="flex">
          {/* Enhanced table column header */}
          <div className="w-40 p-4 text-sm font-medium text-white/90 border-r border-white/20 bg-gradient-to-b from-slate-800/60 to-slate-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-white/70" />
              <span className="uppercase tracking-wide text-xs text-white/70 font-semibold">Tables</span>
            </div>
            <div className="text-xs text-white/50">{tables.length} active</div>
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
                        {isHourStart ? format(slot.time, "H:mm") : format(slot.time, ":mm")}
                      </div>
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
              {/* Enhanced table info */}
              <div className={cn(
                "w-40 p-4 border-r border-white/20 bg-gradient-to-r transition-all duration-200",
                isEvenRow ? "from-slate-800/50 to-slate-800/30" : "from-slate-800/30 to-slate-800/20",
                focusTableId === table.id && "from-accent/20 to-accent/10 border-accent/30",
                "hover:from-slate-700/50 hover:to-slate-700/30"
              )}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-bold text-white leading-tight">
                      {table.name}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5 font-medium",
                        table.status === 'available' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                        table.status === 'occupied' && "bg-purple-500/20 text-purple-300 border-purple-500/30",
                        table.status === 'reserved' && "bg-amber-500/20 text-amber-300 border-amber-500/30",
                        table.status === 'maintenance' && "bg-red-500/20 text-red-300 border-red-500/30"
                      )}
                    >
                      {table.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Users className="w-3 h-3" />
                    <span>{table.capacity} seats</span>
                  </div>
                  
                  <div className="text-xs text-white/60">
                    {table.section}
                  </div>
                  
                  {tableReservations.length > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 bg-accent rounded-full" />
                      <span className="text-accent font-medium">{tableReservations.length} booking{tableReservations.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
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
                                  "absolute rounded-lg border-2 cursor-pointer p-3 transition-all duration-200",
                                  "hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/50",
                                  "backdrop-blur-md hover:backdrop-blur-lg",
                                  "group overflow-hidden",
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
                                aria-label={`Reservation for ${reservation.guestName}, ${reservation.partySize} guests from ${format(new Date(reservation.start), "H:mm")} to ${format(new Date(reservation.end), "H:mm")}, status: ${reservation.status}`}
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
                                {/* Enhanced reservation content */}
                                <div className="relative h-full flex flex-col justify-between">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1 text-white">
                                      <User className="w-3 h-3 opacity-75" />
                                      <span className="text-xs font-bold truncate max-w-[100px]">
                                        {reservation.guestName}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className="bg-white/25 text-white text-[10px] px-1.5 py-0.5 font-bold"
                                    >
                                      {reservation.partySize}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs text-white/90">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 opacity-75" />
                                      <span className="font-medium">
                                        {format(new Date(reservation.start), "H:mm")}–{format(new Date(reservation.end), "H:mm")}
                                      </span>
                                    </div>
                                    
                                    {reservation.channel && (
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0.5 border-white/30",
                                          reservation.channel === 'online' && "bg-blue-400/20 text-blue-200 border-blue-400/40",
                                          reservation.channel === 'phone' && "bg-orange-400/20 text-orange-200 border-orange-400/40",
                                          reservation.channel === 'walkin' && "bg-green-400/20 text-green-200 border-green-400/40"
                                        )}
                                      >
                                        {reservation.channel === 'online' && <Globe className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel === 'phone' && <Phone className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel === 'walkin' && <User className="w-2 h-2 mr-0.5" />}
                                        {reservation.channel.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Subtle animation overlay on hover */}
                                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">{reservation.guestName}</div>
                                <div>{format(new Date(reservation.start), "H:mm")}–{format(new Date(reservation.end), "H:mm")}</div>
                                <div>{reservation.partySize} guests{reservation.channel ? ` • ${reservation.channel}` : ''}</div>
                                {reservation.status && (<div className="opacity-80">Status: {reservation.status}</div>)}
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
