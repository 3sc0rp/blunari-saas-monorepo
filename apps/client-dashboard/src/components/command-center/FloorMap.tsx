import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTodayData } from "@/hooks/useTodayData";
import { 
  Square, 
  Circle, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Utensils,
  Timer,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape: 'rectangle' | 'circle' | 'square';
  seats: number;
  number: string;
  section?: string;
}

interface TableStatus {
  id: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';
  currentBooking?: BookingData;
  nextBooking?: BookingData;
  timeRemaining?: number;
  partySize?: number;
}

interface BookingData {
  id: string;
  booking_time: string;
  party_size: number;
  status: string;
  table_number?: string;
  customer_name?: string;
  duration_minutes?: number;
}

// Mock floor plan data - in real app this would come from the database
const MOCK_FLOOR_PLAN: TablePosition[] = [
  // Main dining area
  { id: '1', x: 50, y: 50, width: 80, height: 80, shape: 'circle', seats: 4, number: '1', section: 'Main' },
  { id: '2', x: 200, y: 50, width: 80, height: 80, shape: 'circle', seats: 4, number: '2', section: 'Main' },
  { id: '3', x: 350, y: 50, width: 80, height: 80, shape: 'circle', seats: 4, number: '3', section: 'Main' },
  
  { id: '4', x: 50, y: 180, width: 120, height: 60, shape: 'rectangle', seats: 6, number: '4', section: 'Main' },
  { id: '5', x: 230, y: 180, width: 120, height: 60, shape: 'rectangle', seats: 6, number: '5', section: 'Main' },
  
  { id: '6', x: 50, y: 310, width: 80, height: 80, shape: 'circle', seats: 4, number: '6', section: 'Main' },
  { id: '7', x: 200, y: 310, width: 80, height: 80, shape: 'circle', seats: 4, number: '7', section: 'Main' },
  { id: '8', x: 350, y: 310, width: 80, height: 80, shape: 'circle', seats: 4, number: '8', section: 'Main' },
  
  // Bar area
  { id: '9', x: 500, y: 50, width: 60, height: 60, shape: 'square', seats: 2, number: '9', section: 'Bar' },
  { id: '10', x: 580, y: 50, width: 60, height: 60, shape: 'square', seats: 2, number: '10', section: 'Bar' },
  { id: '11', x: 660, y: 50, width: 60, height: 60, shape: 'square', seats: 2, number: '11', section: 'Bar' },
  
  // Private dining
  { id: '12', x: 500, y: 180, width: 160, height: 100, shape: 'rectangle', seats: 8, number: '12', section: 'Private' },
  { id: '13', x: 500, y: 310, width: 160, height: 100, shape: 'rectangle', seats: 8, number: '13', section: 'Private' },
];

const FloorMap: React.FC = () => {
  const { data, isLoading, error } = useTodayData();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate table statuses based on current bookings
  const tableStatuses = useMemo((): Record<string, TableStatus> => {
    if (!data?.bookings || !data?.tables) return {};

    const statuses: Record<string, TableStatus> = {};
    const now = new Date();

    // Initialize all tables as available
    data.tables.forEach(table => {
      statuses[table.id] = {
        id: table.id,
        status: 'available'
      };
    });

    // Update with current bookings
    data.bookings.forEach(booking => {
      if (!booking.table_number) return;

      const tableId = booking.table_number.toString();
      const bookingTime = new Date(booking.booking_time);
      const bookingEndTime = new Date(bookingTime.getTime() + (booking.duration_minutes || 120) * 60000);

      // Check if booking is currently active
      const isActive = now >= bookingTime && now <= bookingEndTime;
      const isUpcoming = bookingTime > now && (bookingTime.getTime() - now.getTime()) < 3600000; // Within 1 hour

      if (isActive) {
        statuses[tableId] = {
          id: tableId,
          status: booking.status === 'seated' ? 'occupied' : 'reserved',
          currentBooking: booking,
          partySize: booking.party_size,
          timeRemaining: Math.round((bookingEndTime.getTime() - now.getTime()) / 60000)
        };
      } else if (isUpcoming && !statuses[tableId].currentBooking) {
        statuses[tableId] = {
          ...statuses[tableId],
          status: 'reserved',
          nextBooking: booking
        };
      }
    });

    return statuses;
  }, [data?.bookings, data?.tables]);

  const getTableColor = (status: TableStatus['status'], isSelected: boolean) => {
    const colors = {
      available: isSelected ? "fill-slate-300 stroke-slate-400" : "fill-slate-100 stroke-slate-300 hover:fill-slate-200",
      occupied: isSelected ? "fill-green-400 stroke-green-600" : "fill-green-300 stroke-green-500 hover:fill-green-400",
      reserved: isSelected ? "fill-blue-400 stroke-blue-600" : "fill-blue-300 stroke-blue-500 hover:fill-blue-400",
      cleaning: isSelected ? "fill-amber-400 stroke-amber-600" : "fill-amber-300 stroke-amber-500 hover:fill-amber-400",
      blocked: isSelected ? "fill-red-400 stroke-red-600" : "fill-red-300 stroke-red-500 hover:fill-red-400"
    };
    return colors[status] || colors.available;
  };

  const getStatusIcon = (status: TableStatus['status']) => {
    switch (status) {
      case 'occupied':
        return <Utensils className="w-3 h-3" />;
      case 'reserved':
        return <Clock className="w-3 h-3" />;
      case 'cleaning':
        return <Timer className="w-3 h-3" />;
      case 'blocked':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <CheckCircle className="w-3 h-3" />;
    }
  };

  const getStatusBadgeColor = (status: TableStatus['status']) => {
    switch (status) {
      case 'occupied':
        return "bg-green-500 text-white";
      case 'reserved':
        return "bg-blue-500 text-white";
      case 'cleaning':
        return "bg-amber-500 text-white";
      case 'blocked':
        return "bg-red-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  // Handle table selection
  const handleTableClick = useCallback((tableId: string) => {
    setSelectedTable(prev => prev === tableId ? null : tableId);
  }, []);

  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.8;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedTable(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === document.body) {
        const tables = Object.keys(tableStatuses);
        if (!tables.length) return;

        const currentIndex = selectedTable ? tables.indexOf(selectedTable) : -1;

        switch (e.key) {
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight': {
            e.preventDefault();
            const nextIndex = e.key === 'ArrowUp' || e.key === 'ArrowLeft' 
              ? Math.max(0, currentIndex - 1)
              : Math.min(tables.length - 1, currentIndex + 1);
            setSelectedTable(tables[nextIndex]);
            break;
          }
          case 'Enter':
            if (selectedTable) {
              // TODO: Open details drawer
              console.log('Open details for table:', selectedTable);
            }
            break;
          case 'Escape':
            setSelectedTable(null);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTable, tableStatuses]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <p className="font-semibold text-destructive">Failed to load floor plan</p>
            <p className="text-sm text-muted-foreground">Please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-64 h-64 bg-surface-2/30 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Controls */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleZoom('in')}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleZoom('out')}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetView}
              aria-label="Reset view"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Use arrow keys to navigate • Enter to select • Drag to pan
          </div>
        </div>

        {/* Floor Plan */}
        <div className="flex-1 relative overflow-hidden rounded-lg border border-surface-2/50 bg-gradient-to-br from-slate-50 to-slate-100">
          <svg
            ref={svgRef}
            viewBox="0 0 800 500"
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
            }}
            role="img"
            aria-label="Restaurant floor plan"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Section labels */}
            <text x="200" y="30" textAnchor="middle" className="fill-slate-600 text-sm font-semibold">Main Dining</text>
            <text x="580" y="30" textAnchor="middle" className="fill-slate-600 text-sm font-semibold">Bar</text>
            <text x="580" y="160" textAnchor="middle" className="fill-slate-600 text-sm font-semibold">Private Dining</text>

            {/* Tables */}
            {MOCK_FLOOR_PLAN.map(table => {
              const status = tableStatuses[table.id] || { id: table.id, status: 'available' as const };
              const isSelected = selectedTable === table.id;

              return (
                <Tooltip key={table.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <g
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => handleTableClick(table.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTableClick(table.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Table ${table.number}, ${status.status}, ${table.seats} seats`}
                    >
                      {/* Table shape */}
                      {table.shape === 'circle' ? (
                        <circle
                          cx={table.x + table.width / 2}
                          cy={table.y + table.height / 2}
                          r={table.width / 2}
                          className={cn(
                            "stroke-2 transition-all duration-200",
                            getTableColor(status.status, isSelected),
                            isSelected && "drop-shadow-lg"
                          )}
                        />
                      ) : (
                        <rect
                          x={table.x}
                          y={table.y}
                          width={table.width}
                          height={table.height}
                          rx={table.shape === 'square' ? 8 : 12}
                          className={cn(
                            "stroke-2 transition-all duration-200",
                            getTableColor(status.status, isSelected),
                            isSelected && "drop-shadow-lg"
                          )}
                        />
                      )}

                      {/* Table number */}
                      <text
                        x={table.x + table.width / 2}
                        y={table.y + table.height / 2 - 8}
                        textAnchor="middle"
                        className="fill-slate-800 text-sm font-bold pointer-events-none"
                      >
                        {table.number}
                      </text>

                      {/* Seat count */}
                      <text
                        x={table.x + table.width / 2}
                        y={table.y + table.height / 2 + 8}
                        textAnchor="middle"
                        className="fill-slate-600 text-xs pointer-events-none"
                      >
                        {table.seats} seats
                      </text>

                      {/* Status indicator */}
                      {status.status !== 'available' && (
                        <circle
                          cx={table.x + table.width - 10}
                          cy={table.y + 10}
                          r={6}
                          className={cn(
                            "stroke-white stroke-2",
                            status.status === 'occupied' && "fill-green-500",
                            status.status === 'reserved' && "fill-blue-500",
                            status.status === 'cleaning' && "fill-amber-500",
                            status.status === 'blocked' && "fill-red-500"
                          )}
                        />
                      )}

                      {/* Selection highlight */}
                      {isSelected && (
                        <motion.g
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {table.shape === 'circle' ? (
                            <circle
                              cx={table.x + table.width / 2}
                              cy={table.y + table.height / 2}
                              r={table.width / 2 + 8}
                              fill="none"
                              stroke="rgb(59, 130, 246)"
                              strokeWidth="3"
                              strokeDasharray="5,5"
                              className="animate-pulse"
                            />
                          ) : (
                            <rect
                              x={table.x - 8}
                              y={table.y - 8}
                              width={table.width + 16}
                              height={table.height + 16}
                              rx={16}
                              fill="none"
                              stroke="rgb(59, 130, 246)"
                              strokeWidth="3"
                              strokeDasharray="5,5"
                              className="animate-pulse"
                            />
                          )}
                        </motion.g>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeColor(status.status)}>
                          {getStatusIcon(status.status)}
                          <span className="ml-1 capitalize">{status.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <p className="font-semibold">Table {table.number}</p>
                        <p className="text-muted-foreground">{table.seats} seats • {table.section}</p>
                      </div>

                      {status.currentBooking && (
                        <div className="text-sm border-t pt-2">
                          <p className="font-medium">Current Booking:</p>
                          <p>{status.currentBooking.customer_name}</p>
                          <p className="text-muted-foreground">
                            Party of {status.partySize} • {status.timeRemaining}m remaining
                          </p>
                        </div>
                      )}

                      {status.nextBooking && (
                        <div className="text-sm border-t pt-2">
                          <p className="font-medium">Next Booking:</p>
                          <p>{status.nextBooking.customer_name}</p>
                          <p className="text-muted-foreground">
                            {new Date(status.nextBooking.booking_time).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 flex items-center justify-center gap-4 mt-4 text-xs">
          {[
            { status: 'available' as const, label: 'Available', color: 'bg-slate-300' },
            { status: 'occupied' as const, label: 'Occupied', color: 'bg-green-500' },
            { status: 'reserved' as const, label: 'Reserved', color: 'bg-blue-500' },
            { status: 'cleaning' as const, label: 'Cleaning', color: 'bg-amber-500' },
            { status: 'blocked' as const, label: 'Blocked', color: 'bg-red-500' }
          ].map(({ status, label, color }) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-full", color)} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FloorMap;
