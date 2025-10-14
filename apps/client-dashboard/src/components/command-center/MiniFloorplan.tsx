import React, { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TableRow, Reservation } from "@/hooks/useCommandCenterData";

interface MiniFloorplanProps {
  tables: TableRow[];
  reservations: Reservation[];
  onFocusTable: (tableId: string) => void;
  focusTableId?: string;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  section: 'Patio' | 'Bar' | 'Main';
}

// Static table positions matching the reference image layout
const TABLE_POSITIONS: readonly TablePosition[] = [
  // Patio Section (top)
  { id: 'table-1', x: 20, y: 20, size: 'small', section: 'Patio' },
  { id: 'table-2', x: 60, y: 20, size: 'medium', section: 'Patio' },
  { id: 'table-3', x: 100, y: 20, size: 'small', section: 'Patio' },
  { id: 'table-4', x: 140, y: 20, size: 'medium', section: 'Patio' },
  { id: 'table-5', x: 180, y: 20, size: 'small', section: 'Patio' },

  // Bar Section (middle)
  { id: 'table-6', x: 30, y: 70, size: 'small', section: 'Bar' },
  { id: 'table-7', x: 70, y: 70, size: 'large', section: 'Bar' },
  { id: 'table-8', x: 120, y: 70, size: 'small', section: 'Bar' },
  { id: 'table-9', x: 160, y: 70, size: 'medium', section: 'Bar' },

  // Main Section (bottom)
  { id: 'table-10', x: 20, y: 120, size: 'medium', section: 'Main' },
  { id: 'table-11', x: 60, y: 120, size: 'small', section: 'Main' },
  { id: 'table-12', x: 100, y: 120, size: 'large', section: 'Main' },
  { id: 'table-13', x: 150, y: 120, size: 'medium', section: 'Main' },
  { id: 'table-14', x: 190, y: 120, size: 'small', section: 'Main' },
  { id: 'table-15', x: 20, y: 160, size: 'small', section: 'Main' },
  { id: 'table-16', x: 60, y: 160, size: 'medium', section: 'Main' },
  { id: 'table-17', x: 110, y: 160, size: 'small', section: 'Main' },
  { id: 'table-18', x: 150, y: 160, size: 'large', section: 'Main' },

  // Additional booth areas (rectangles)
  { id: 'booth-1', x: 220, y: 40, size: 'large', section: 'Main' },
  { id: 'booth-2', x: 220, y: 90, size: 'large', section: 'Main' },
  { id: 'booth-3', x: 220, y: 140, size: 'large', section: 'Main' },
] as const;

export function MiniFloorplan({ 
  tables = [], 
  reservations = [], 
  onFocusTable, 
  focusTableId 
}: MiniFloorplanProps) {
  // Create mapping from hardcoded positions to real table data
  const tablePositionsWithRealData = useMemo(() => {
    const positions: Array<{
      id: string;
      x: number;
      y: number;
      section: string;
      name: string;
      size: 'small' | 'medium' | 'large';
      realTable?: TableRow;
    }> = [];

    // Map real tables to hardcoded positions
    if (Array.isArray(tables) && tables.length > 0) {
      // For each hardcoded position, try to find a matching real table
      TABLE_POSITIONS.forEach((hardcodedPos, index) => {
        let matchingTable: TableRow | undefined;
        
        // Try to find table by matching table number in name (e.g., "Table 1" matches "table-1")
        const tableNumber = hardcodedPos.id.replace('table-', '').replace('booth-', '');
        matchingTable = tables.find(table => 
          table.name.toLowerCase().includes(tableNumber) ||
          table.name.toLowerCase().includes(`table ${tableNumber}`) ||
          table.name.toLowerCase().includes(`table${tableNumber}`)
        );

        // If no match by name, use table by index (fallback)
        if (!matchingTable && index < tables.length) {
          matchingTable = tables[index];
        }

        positions.push({
          id: matchingTable?.id || hardcodedPos.id,
          x: hardcodedPos.x,
          y: hardcodedPos.y,
          section: hardcodedPos.section,
          name: matchingTable?.name || hardcodedPos.id,
          size: hardcodedPos.size,
          realTable: matchingTable
        });
      });
    } else {
      // No real tables, use hardcoded positions as fallback
      TABLE_POSITIONS.forEach(hardcodedPos => {
        positions.push({
          id: hardcodedPos.id,
          x: hardcodedPos.x,
          y: hardcodedPos.y,
          section: hardcodedPos.section,
          name: hardcodedPos.id,
          size: hardcodedPos.size
        });
      });
    }

    return positions;
  }, [tables]);

  // Memoized computation of table statuses for performance
  const tableStatuses = useMemo<Record<string, { status: string; occupancy: number | null; isReserved: boolean }>>(() => {
    try {
      if (!Array.isArray(tables) || !Array.isArray(reservations)) {
        return {};
      }

      const currentTime = new Date();
      
      return tables.reduce<Record<string, { status: string; occupancy: number | null; isReserved: boolean }>>((acc, table) => {
        const tableReservations = reservations.filter(r => r.tableId === table.id);
        const activeReservation = tableReservations.find(r => {
          const reservationStart = new Date(r.start);
          const reservationEnd = new Date(r.end);
          return reservationStart <= currentTime && 
                 reservationEnd >= currentTime && 
                 r.status === 'seated';
        });
        const upcomingReservation = tableReservations.find(r => r.status === 'confirmed');

        let status = 'available';
        let occupancy = null;

        if (activeReservation) {
          status = 'occupied';
          occupancy = activeReservation.partySize;
        } else if (table.status === 'maintenance') {
          status = 'cleaning';
        } else if (upcomingReservation) {
          status = 'reserved';
        }

        acc[table.id] = {
          status,
          occupancy,
          isReserved: Boolean(upcomingReservation),
        };

        return acc;
      }, {});
    } catch (error) {
      console.error('Error computing table statuses:', error);
      return {};
    }
  }, [tables, reservations]);

  const handleTableInteraction = useCallback((tableId: string, eventType: 'click' | 'keydown' = 'click') => {
    try {
      onFocusTable(tableId);
    } catch (error) {
      console.error(`Error handling table interaction for ${tableId}:`, error);
    }
  }, [onFocusTable]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, tableId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTableInteraction(tableId, 'keydown');
    }
  }, [handleTableInteraction]);

  // Error boundary fallback
  if (!Array.isArray(tables)) {
    return (
      <div 
        className="h-64 relative bg-slate-800/20 rounded-lg flex items-center justify-center"
        role="alert"
        aria-live="polite"
      >
        <p className="text-white/70 text-sm">Invalid table data provided</p>
      </div>
    );
  }

  const getTableStatus = (tableId: string) => {
    return tableStatuses[tableId]?.status || 'available';
  };

  const getStatusColor = (status: string, focused: boolean) => {
    const baseClasses = "transition-colors duration-200";
    
    if (focused) {
      return cn(baseClasses, 'ring-2 ring-accent ring-offset-2 ring-offset-transparent');
    }
    
    switch (status) {
      case 'available':
        return cn(baseClasses, 'bg-green-400 hover:bg-green-300');
      case 'occupied':
        return cn(baseClasses, 'bg-red-400 hover:bg-red-300');
      case 'reserved':
        return cn(baseClasses, 'bg-amber-400 hover:bg-amber-300');
      case 'cleaning':
        return cn(baseClasses, 'bg-gray-400 hover:bg-gray-300');
      default:
        return cn(baseClasses, 'bg-gray-400 hover:bg-gray-300');
    }
  };

  const getSizeClasses = (size: string, isBoothStyle = false) => {
    if (isBoothStyle) {
      return 'w-6 h-4 rounded-sm';
    }
    
    switch (size) {
      case 'small':
        return 'w-3 h-3 rounded-full';
      case 'medium':
        return 'w-4 h-4 rounded-full';
      case 'large':
        return 'w-5 h-5 rounded-full';
      default:
        return 'w-4 h-4 rounded-full';
    }
  };

  return (
    <div 
      className="h-64 relative bg-slate-800/20 rounded-lg overflow-hidden"
      role="application"
      aria-label="Restaurant floor plan with interactive tables"
    >
      {/* Background grid for visual reference */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Section labels */}
      <div 
        className="absolute top-2 left-2 text-xs font-medium text-white/60"
        aria-hidden="true"
      >
        Patio
      </div>
      <div 
        className="absolute top-16 left-2 text-xs font-medium text-white/60"
        aria-hidden="true"
      >
        Bar
      </div>
      <div 
        className="absolute top-28 left-2 text-xs font-medium text-white/60"
        aria-hidden="true"
      >
        Main
      </div>

      {/* Table positions */}
      <div 
        className="relative w-full h-full"
        role="group"
        aria-label="Restaurant tables"
      >
        {tablePositionsWithRealData.map((position) => {
          const isBoothStyle = position.id.startsWith('booth-');
          const status = getTableStatus(position.id);
          const focused = focusTableId === position.id;
          const tableInfo = tableStatuses[position.id];
          
          return (
            <button
              key={position.id}
              onClick={() => handleTableInteraction(position.id)}
              onKeyDown={(e) => handleKeyDown(e, position.id)}
              className={cn(
                "absolute transition-all duration-200 cursor-pointer transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50",
                getSizeClasses(position.size || 'medium', isBoothStyle),
                getStatusColor(status, focused)
              )}
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
              }}
              title={`${position.name} (${position.section}) - ${status}${tableInfo?.occupancy ? ` - ${tableInfo.occupancy} guests` : ''}`}
              aria-label={`Table ${position.name} in ${position.section} section, currently ${status}${tableInfo?.occupancy ? ` with ${tableInfo.occupancy} guests` : ''}`}
              aria-pressed={focused}
              tabIndex={0}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div 
        className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-xs text-white/60"
        role="group"
        aria-label="Table status legend"
      >
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" aria-hidden="true"></div>
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true"></div>
          <span>Reserved</span>
        </div>
      </div>

      {/* Scale indicator */}
      <div 
        className="absolute bottom-2 right-2 text-xs text-white/40"
        aria-hidden="true"
      >
        Floor Plan
      </div>
    </div>
  );
}

export default MiniFloorplan;
