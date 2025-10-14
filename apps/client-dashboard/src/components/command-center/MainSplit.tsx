/**
 * MainSplit Component - Command Center Layout
 * 
 * A comprehensive dashboard layout component that displays restaurant operations
 * including floor plan, kitchen load, status legend, and reservation timeline.
 * 
 * Features:
 * - Real-time kitchen load monitoring
 * - Interactive floor plan with table status
 * - Drag-and-drop reservation management
 * - Comprehensive error handling and accessibility
 * - Performance optimized with memoization
 * 
 * @version 1.0.0
 * @author Senior Developer Team
 */
import React, { useMemo, useCallback } from "react";
/**
 * Senior Developer Note: Using explicit .tsx extensions for imports
 * This resolves TypeScript module resolution issues in some development environments
 * while maintaining compatibility with build systems like Vite and Webpack.
 * 
 * Alternative solutions considered:
 * - Dynamic imports with React.lazy (adds unnecessary complexity)
 * - Module declaration files (adds maintenance overhead) 
 * - Path mapping in tsconfig (affects entire project)
 * 
 * This solution is minimal, explicit, and maintains performance.
 */
import MiniFloorplan from "./MiniFloorplan.tsx";
import KitchenLoadGauge from "./KitchenLoadGauge.tsx";
import { StatusLegend } from "./StatusLegend";
import { Timeline } from "./Timeline";
import { useReservationActions } from '@/hooks/useReservationActions';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { TableRow, Reservation } from "@/hooks/useCommandCenterData";

export type Section = 'Patio' | 'Bar' | 'Main';

interface ErrorState {
  message: string;
  requestId?: string;
}

interface MainSplitProps {
  /** Array of restaurant tables */
  tables: TableRow[];
  /** Array of current reservations */
  reservations: Reservation[];
  /** Callback when a reservation is selected */
  onSelectReservation: (id: string) => void;
  /** Quick-create reservation at a table/time */
  onCreateReservationAt?: (tableId: string, time: Date) => void;
  /** Callback when a table is focused */
  onFocusTable?: (tableId: string) => void;
  /** Callback when a reservation is moved */
  onMove?: (reservationId: string, newStart: string, newEnd: string, newTableId: string) => Promise<void>;
  /** Currently focused table ID */
  focusTableId?: string;
  /** Current kitchen load percentage (0-100) */
  kitchenLoad?: number;
  /** Status counts for different reservation states */
  statusCounts?: Record<string, number>;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: ErrorState | null;
}

interface ErrorStateProps {
  error: ErrorState;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => (
  <div 
    className="flex flex-col items-center justify-center h-64 text-center"
    role="alert"
    aria-live="assertive"
  >
    <AlertCircle 
      className="w-12 h-12 text-red-400 mb-4" 
      aria-hidden="true"
    />
    <h3 className="text-lg font-semibold text-white mb-2">
      Unable to load data
    </h3>
    <p className="text-white/70 mb-4 max-w-md">
      {error.message}
    </p>
    {error.requestId && (
      <p className="text-xs text-white/50">
        Request ID: {error.requestId}
      </p>
    )}
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div 
    className="h-full grid grid-cols-[280px_1fr] gap-4"
    role="status"
    aria-live="polite"
    aria-label="Loading command center data"
  >
    {/* Left Column Skeleton */}
    <div className="space-y-4">
      <div 
        className="glass rounded-[10px] p-4 h-64"
        aria-label="Loading floor plan"
      >
        <Skeleton className="h-full w-full bg-white/10" />
      </div>
      <div 
        className="glass rounded-[10px] p-4 h-32"
        aria-label="Loading kitchen load gauge"
      >
        <Skeleton className="h-full w-full bg-white/10" />
      </div>
      <div 
        className="glass rounded-[10px] p-4 h-24"
        aria-label="Loading status legend"
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="h-3 w-16 bg-white/10" />
          <Skeleton className="h-3 w-24 bg-white/10" />
        </div>
      </div>
    </div>
    
    {/* Right Column Skeleton */}
    <div 
      className="glass rounded-[10px] p-4"
      aria-label="Loading timeline"
    >
      <div className="space-y-4">
        <Skeleton className="h-8 w-full bg-white/10" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const MainSplit = React.memo<MainSplitProps>(function MainSplit({
  tables = [],
  reservations = [],
  onSelectReservation,
  onCreateReservationAt,
  onFocusTable = () => {},
  onMove = async () => {},
  focusTableId,
  kitchenLoad = 0,
  statusCounts,
  loading = false,
  error
}) {
  
  const { moveReservationAction } = useReservationActions();

  // Memoized event handlers to prevent unnecessary re-renders
      const handleReservationClick = useCallback((reservation: Reservation) => {
    try {
      onSelectReservation(reservation.id);
    } catch (err) {
      console.error('Error selecting reservation:', err);
    }
  }, [onSelectReservation]);

  const handleTimeSlotClick = useCallback((tableId: string, time: Date) => {
    try {
      if (onCreateReservationAt) {
        onCreateReservationAt(tableId, time);
      } else {      }
    } catch (err) {
      console.error('Error handling time slot click:', err);
    }
  }, []);

  const handleMove = useCallback(async (
    id: string,
    nextStart: string,
    nextEnd: string,
    nextTableId: string
  ) => {
    try {
      await onMove(id, nextStart, nextEnd, nextTableId);
    } catch (err) {
      console.error('Error moving reservation:', err);
    }
  }, [onMove]);

  const handleReservationChange = useCallback(async (u: { id: string; start: string; end: string }) => {
    try {      const result = await moveReservationAction({ reservationId: u.id, start: u.start, end: u.end });
      
      if (!result.ok) {
        console.error('Move reservation failed:', result.error, 'Request ID:', result.requestId);
      } else {      }
    } catch (err) {
      console.error('Error updating reservation time:', err);
    }
  }, [moveReservationAction]);

  // Memoized computation for table status counts (calculated from bookings)
      const tableStatusCounts = useMemo(() => {
    try {
      // Initialize counts with default values
      const counts = {
        available: 0,
        seated: 0,
        reserved: 0,
        phone: 0,
        walkIn: 0,
        maintenance: 0
      };

      if (!Array.isArray(tables) || tables.length === 0) {        return counts;
      }      const currentTime = new Date();
      
      // Calculate table status based on active bookings
      tables.forEach(table => {
        let tableStatus = 'available'; // Default status
      if (Array.isArray(reservations)) {
          // Find active booking for this table
      const activeBooking = reservations.find(reservation => {
            if (reservation.tableId !== table.id) return false;
            
            const bookingStart = new Date(reservation.start);
            const bookingEnd = new Date(reservation.end);
            
            // Check
      if (reservation.status === 'seated' && bookingStart <= currentTime && currentTime <= bookingEnd) {
              return true;
            }
            
            // Check
      if (reservation.status === 'confirmed' && bookingStart > currentTime) {
              const minutesUntil = (bookingStart.getTime() - currentTime.getTime()) / (1000 * 60);
              return minutesUntil <= 30; // Consider reserved
      if (booking is within 30 minutes
            }
            
            return false;
          });

          if (activeBooking) {
            if (activeBooking.status === 'seated') {
              tableStatus = 'seated';
            } else if (activeBooking.status === 'confirmed') {
              tableStatus = 'reserved';
            }
          }
        }
        
        // Count the status
        switch (tableStatus) {
          case 'available':
            counts.available++;
            break;
          case 'seated':
            counts.seated++;
            break;
          case 'reserved':
            counts.reserved++;
            break;
          case 'maintenance':
            counts.maintenance++;
            break;
          default:
            counts.available++;
        }      });

      // Count phone holds and walk-ins from reservations
      if (Array.isArray(reservations) && reservations.length > 0) {        reservations.forEach(reservation => {
          if (reservation.channel === 'phone' && (reservation.status === 'confirmed' || reservation.status === 'seated')) {
            counts.phone++;
          } else if (reservation.channel === 'walkin' && (reservation.status === 'confirmed' || reservation.status === 'seated')) {
            counts.walkIn++;
          }
        });
      }      return counts;
    } catch (err) {
      console.error('Error calculating table status counts:', err);
      return {
        available: 0,
        seated: 0,
        reserved: 0,
        phone: 0,
        walkIn: 0,
        maintenance: 0
      };
    }
  }, [tables, reservations]);

  // Memoized computation for kitchen load calculation
      const calculatedKitchenLoad = useMemo(() => {
    try {
      if (!Array.isArray(reservations)) return kitchenLoad;
      
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      const activeReservations = reservations.filter(r => {
        try {
          const startTime = new Date(r.start);
          const endTime = new Date(r.end);
          
          // Additional validation for date objects
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn(`Invalid reservation dates for reservation ${r.id}:`, { start: r.start, end: r.end });
            return false;
          }
          
          const startHour = startTime.getHours();
          const endHour = endTime.getHours();
          
          return startHour <= currentHour && currentHour <= endHour && r.status === 'seated';
        } catch (err) {
          console.warn('Invalid reservation time data:', r.id, err);
          return false;
        }
      });

      // Prevent division by zero and ensure valid percentage
      const tableCount = Math.max(tables.length, 1);
      const calculatedLoad = (activeReservations.length / tableCount) * 100;
      
      // If we have a provided kitchen load, use it; otherwise calculate from active reservations
      return kitchenLoad > 0 ? Math.min(kitchenLoad, 100) : Math.min(calculatedLoad, 100);
    } catch (err) {
      console.error('Error calculating kitchen load:', err);
      return Math.min(kitchenLoad, 100);
    }
  }, [reservations, kitchenLoad, tables.length]);

  // Early
      return for loading state
      if (loading) {
    return <LoadingSkeleton />;
  }

  // Early
      return for error state
      if (error) {
    return (
      <div className="glass rounded-[10px] p-8">
        <ErrorState error={error} />
      </div>
    );
  }

  // Input validation
      if (!Array.isArray(tables) || !Array.isArray(reservations)) {
    return (
      <div className="glass rounded-[10px] p-8">
        <ErrorState error={{ message: "Invalid data format provided to command center" }} />
      </div>
    );
  }

  return (
    <div 
      className="h-full grid grid-cols-[280px_1fr] gap-4"
      role="main"
      aria-label="Restaurant command center dashboard"
    >
      {/* Left Column: Mini Floor Plan, Kitchen Load, Legend */}
      <aside 
        className="space-y-4"
        role="complementary"
        aria-label="Restaurant status overview"
      >
        {/* Mini Floor Plan */}
        <section 
          className="glass rounded-[10px] p-4"
          aria-labelledby="floorplan-heading"
        >
          <h3 id="floorplan-heading" className="sr-only">
            Restaurant Floor Plan
          </h3>
          <MiniFloorplan
            tables={tables}
            reservations={reservations}
            onFocusTable={onFocusTable}
            focusTableId={focusTableId}
          />
        </section>

        {/* Kitchen Load Gauge */}
        <section 
          className="glass rounded-[10px] p-4"
          aria-labelledby="kitchen-load-heading"
        >
          <h3 id="kitchen-load-heading" className="sr-only">
            Kitchen Load Monitor
          </h3>
          <KitchenLoadGauge percentage={calculatedKitchenLoad} />
        </section>

        {/* Status Legend */}
        <section 
          className="glass rounded-[10px] p-4"
          aria-labelledby="status-legend-heading"
        >
          <h3 id="status-legend-heading" className="sr-only">
            Table Status Legend
          </h3>
          <StatusLegend counts={tableStatusCounts} />
        </section>
      </aside>

      {/* Right Column: Timeline */}
      <section 
        className="glass rounded-[10px] overflow-hidden"
        aria-labelledby="timeline-heading"
        role="region"
      >
        <h3 id="timeline-heading" className="sr-only">
          Reservation Timeline
        </h3>
        <Timeline
          tables={tables}
          reservations={reservations}
          focusTableId={focusTableId}
          onReservationClick={handleReservationClick}
          onTimeSlotClick={handleTimeSlotClick}
          onReservationChange={handleReservationChange}
        />
      </section>
    </div>
  );
});

export default MainSplit;




