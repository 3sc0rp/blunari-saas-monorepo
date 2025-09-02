import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTodayData } from "@/hooks/useTodayData";
import { 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Utensils,
  Timer,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Timeline constants
const HOURS_START = 11; // 11 AM
const HOURS_END = 23; // 11 PM
const MINUTES_INTERVAL = 15; // 15-minute intervals

interface TimelineSlot {
  time: Date;
  timeString: string;
  bookings: BookingData[];
  isCurrentHour: boolean;
}

interface BookingData {
  id: string;
  booking_time: string;
  party_size: number;
  status: string;
  table_number?: string;
  customer_name?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

interface TimelineItemProps {
  booking: BookingData;
  onClick: (booking: BookingData) => void;
  style?: React.CSSProperties;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ booking, onClick, style }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return "bg-blue-500/10 border-blue-500/30 text-blue-700";
      case 'seated':
        return "bg-green-500/10 border-green-500/30 text-green-700";
      case 'completed':
        return "bg-slate-500/10 border-slate-500/30 text-slate-700";
      case 'cancelled':
        return "bg-red-500/10 border-red-500/30 text-red-700";
      case 'no_show':
        return "bg-orange-500/10 border-orange-500/30 text-orange-700";
      case 'waiting':
        return "bg-amber-500/10 border-amber-500/30 text-amber-700";
      default:
        return "bg-slate-500/10 border-slate-500/30 text-slate-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Calendar className="w-3 h-3" />;
      case 'seated':
        return <CheckCircle className="w-3 h-3" />;
      case 'completed':
        return <Utensils className="w-3 h-3" />;
      case 'cancelled':
      case 'no_show':
        return <AlertCircle className="w-3 h-3" />;
      case 'waiting':
        return <Timer className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const customerName = booking.profiles?.first_name && booking.profiles?.last_name 
    ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
    : booking.customer_name || "Guest";

  return (
    <motion.div 
      style={style}
      className="p-1"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card 
        className={cn(
          "p-3 cursor-pointer border-2 transition-all duration-200 hover:shadow-md",
          getStatusColor(booking.status),
          "h-full min-h-[54px]"
        )}
        onClick={() => onClick(booking)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(booking);
          }
        }}
        aria-label={`Booking for ${customerName} at ${formatTime(booking.booking_time)}`}
      >
        <div className="space-y-1">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {getStatusIcon(booking.status)}
              <span className="text-xs font-medium truncate max-w-[60px]">
                {formatTime(booking.booking_time)}
              </span>
            </div>
            <Badge 
              variant="secondary" 
              className="h-5 px-1.5 text-xs"
            >
              {booking.party_size}
            </Badge>
          </div>
          
          {/* Customer name */}
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 opacity-60" />
            <span className="text-xs font-medium truncate">
              {customerName}
            </span>
          </div>
          
          {/* Table info */}
          {booking.table_number && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 opacity-60" />
              <span className="text-xs opacity-75">
                Table {booking.table_number}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

const Timeline: React.FC = () => {
  const { data, isLoading, error } = useTodayData();
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate time slots
  const timeSlots = useMemo((): TimelineSlot[] => {
    const slots: TimelineSlot[] = [];
    const now = new Date();
    const currentHourNum = now.getHours();

    for (let hour = HOURS_START; hour <= HOURS_END; hour++) {
      for (let minute = 0; minute < 60; minute += MINUTES_INTERVAL) {
        const slotTime = new Date();
        slotTime.setHours(hour, minute, 0, 0);
        
        const timeString = slotTime.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true
        });

        // Find bookings for this slot (within the time interval)
        const slotBookings = data?.bookings?.filter(booking => {
          const bookingTime = new Date(booking.booking_time);
          const bookingHour = bookingTime.getHours();
          const bookingMinute = bookingTime.getMinutes();
          
          return bookingHour === hour && 
                 bookingMinute >= minute && 
                 bookingMinute < minute + MINUTES_INTERVAL;
        }) || [];

        slots.push({
          time: slotTime,
          timeString,
          bookings: slotBookings,
          isCurrentHour: hour === currentHourNum
        });
      }
    }

    return slots;
  }, [data?.bookings]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current && timeSlots.length > 0) {
      const currentHourIndex = timeSlots.findIndex(slot => slot.isCurrentHour);
      if (currentHourIndex >= 0) {
        const targetElement = scrollRef.current.children[currentHourIndex] as HTMLElement;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [timeSlots]);

  const handleBookingClick = useCallback((booking: BookingData) => {
    setSelectedBooking(booking);
    // TODO: Trigger details drawer or modal
  }, []);

  const navigateToHour = (direction: 'prev' | 'next') => {
    const newHour = direction === 'prev' ? currentHour - 1 : currentHour + 1;
    if (newHour >= HOURS_START && newHour <= HOURS_END) {
      setCurrentHour(newHour);
      const targetSlotIndex = timeSlots.findIndex(slot => 
        slot.time.getHours() === newHour && slot.time.getMinutes() === 0
      );
      if (targetSlotIndex >= 0 && scrollRef.current) {
        const targetElement = scrollRef.current.children[targetSlotIndex] as HTMLElement;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <p className="font-semibold text-destructive">Failed to load timeline</p>
            <p className="text-sm text-muted-foreground">Please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full p-4">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-20 h-12 bg-surface-2/50 rounded" />
              <div className="flex-1 h-12 bg-surface-2/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full flex flex-col"
      role="region"
      aria-label="Restaurant timeline for today's bookings"
    >
      {/* Navigation header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-surface-2/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToHour('prev')}
            disabled={currentHour <= HOURS_START}
            aria-label="Previous hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center min-w-[100px]">
            <p className="text-sm font-semibold">
              {new Date().setHours(currentHour, 0, 0, 0) && 
                new Date(new Date().setHours(currentHour, 0, 0, 0)).toLocaleTimeString([], {
                  hour: 'numeric',
                  hour12: true
                })
              }
            </p>
            <p className="text-xs text-muted-foreground">Current view</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToHour('next')}
            disabled={currentHour >= HOURS_END}
            aria-label="Next hour"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {data?.bookings?.length || 0} bookings today
        </div>
      </div>

      {/* Scrollable timeline */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-2 scrollbar-track-transparent"
      >
        {timeSlots.map((slot, index) => (
          <div
            key={`${slot.time.getHours()}-${slot.time.getMinutes()}`}
            className="border-b border-surface-2/30 hover:bg-surface-2/10 transition-colors relative h-20"
          >
            <div className="flex items-center h-full px-4">
              {/* Time column */}
              <div className="w-20 flex-shrink-0">
                <div className={cn(
                  "text-xs font-medium",
                  slot.isCurrentHour ? "text-brand font-bold" : "text-text-muted"
                )}>
                  {slot.timeString}
                  {slot.isCurrentHour && (
                    <div className="w-2 h-2 bg-brand rounded-full mt-1 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Bookings */}
              <div className="flex-1 flex items-center gap-2 overflow-x-auto">
                {slot.bookings.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No bookings</span>
                ) : (
                  slot.bookings.map((booking, bookingIndex) => (
                    <TimelineItem
                      key={`${booking.id}-${bookingIndex}`}
                      booking={booking}
                      onClick={handleBookingClick}
                      style={{
                        flexShrink: 0,
                        minWidth: '150px'
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Current time indicator overlay */}
            {slot.isCurrentHour && (
              <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
            )}
          </div>
        ))}
      </div>

      {/* Selected booking indicator */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 bg-surface border border-surface-2 rounded-lg p-3 shadow-lg"
          >
            <p className="text-sm font-semibold">Selected:</p>
            <p className="text-sm text-muted-foreground">
              {selectedBooking.customer_name} - Table {selectedBooking.table_number}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timeline;
