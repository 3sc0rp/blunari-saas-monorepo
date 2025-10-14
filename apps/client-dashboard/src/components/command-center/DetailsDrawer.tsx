import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  MapPin,
  MessageSquare,
  Edit,
  Trash,
  CheckCircle,
  AlertCircle,
  Calendar,
  Timer,
  Utensils,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeCommandCenterContext } from "@/contexts/RealtimeCommandCenterContext";
import type { BookingData, TableData, WaitlistData } from "./utils/drawer-state";

interface DetailsDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  type?: 'booking' | 'table' | 'waitlist';
  data?: BookingData | TableData | WaitlistData;
}

// Global state for drawer - in real app this would be handled by state management
      const drawerState = {
  isOpen: false,
  type: 'booking' as 'booking' | 'table' | 'waitlist',
  data: null as BookingData | TableData | WaitlistData | null
};

const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen = drawerState.isOpen,
  onClose,
  type = drawerState.type,
  data = drawerState.data
}) => {
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  const { metrics } = useRealtimeCommandCenterContext();

  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setLocalIsOpen(false);
    drawerState.isOpen = false;
    onClose?.();
  };

  // If no data provided, try to get from real data
      const selectedData = data || (() => {
    if (type === 'booking') {
      // For booking, we'll need to pass actual booking data from parent
      return null;
    } else if (type === 'table') {
      // For table, we'll need to pass actual table data from parent
      return null;
    } else if (type === 'waitlist') {
      // For waitlist, we could use the first item from real waitlist data
      return metrics?.waitlistData?.[0] || null;
    }
    return null;
  })();

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      seated: 'bg-green-500/10 text-green-700 border-green-500/20',
      completed: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
      cancelled: 'bg-red-500/10 text-red-700 border-red-500/20',
      occupied: 'bg-green-500/10 text-green-700 border-green-500/20',
      available: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
      waiting: 'bg-amber-500/10 text-amber-700 border-amber-500/20'
    };
    return colors[status as keyof typeof colors] || colors.confirmed;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderBookingDetails = () => {
    const booking = type === 'booking' ? selectedData as BookingData : null;
    if (!booking) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Booking Data</h3>
          <p className="text-sm text-muted-foreground">
            No booking information available to display.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Customer info */}
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={booking.avatarUrl} alt={booking.customerName} />
            <AvatarFallback>
              {getInitials(booking.customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{booking.customerName}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>{booking.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{booking.phone}</span>
              </div>
            </div>
            {booking.previousVisits && booking.previousVisits > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  {booking.previousVisits} previous visits
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Booking details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(booking.bookingTime)} at {formatTime(booking.bookingTime)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Party Size</p>
                <p className="text-sm text-muted-foreground">{booking.partySize} guests</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Table</p>
                <p className="text-sm text-muted-foreground">Table {booking.tableNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">{booking.duration || 120} minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Special requests */}
        {booking.specialRequests && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Special Requests
              </h4>
              <p className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                {booking.specialRequests}
              </p>
            </div>
          </>
        )}

        {/* Status and actions */}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(booking.status)} variant="outline">
              {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
              {booking.status === 'seated' && <Utensils className="w-3 h-3 mr-1" />}
              <span className="capitalize">{booking.status}</span>
            </Badge>
            {booking.estimatedRevenue && (
              <span className="text-sm text-muted-foreground">
                Est. Revenue: ${booking.estimatedRevenue}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTableDetails = () => {
    const table = type === 'table' ? selectedData as TableData : null;
    if (!table) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Utensils className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Table Data</h3>
          <p className="text-sm text-muted-foreground">
            No table information available to display.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Table info */}
        <div className="text-center">
          <h3 className="font-semibold text-2xl mb-2">Table {table.number}</h3>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{table.seats} seats</span>
            <span>•</span>
            <span>{table.section} section</span>
          </div>
        </div>

        <Separator />

        {/* Current booking */}
        {table.currentBooking && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Current Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(table.currentBooking.customerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{table.currentBooking.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    Party of {table.currentBooking.partySize}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(table.currentBooking.bookingTime)}</span>
                </div>
                {table.timeRemaining && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Timer className="w-3 h-3" />
                    <span>{table.timeRemaining}m remaining</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{table.totalTurns || 0}</p>
              <p className="text-xs text-muted-foreground">Turns Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">${table.todayRevenue || 0}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Badge className={getStatusColor(table.status)} variant="outline">
                <span className="capitalize">{table.status}</span>
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderWaitlistDetails = () => {
    const waitlist = type === 'waitlist' ? selectedData as WaitlistData : null;
    if (!waitlist) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Waitlist Data</h3>
          <p className="text-sm text-muted-foreground">
            No waitlist information available to display.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Customer info */}
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              {getInitials(waitlist.customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{waitlist.customerName}</h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{waitlist.phone}</span>
            </div>
            {waitlist.priority && waitlist.priority !== 'normal' && (
              <Badge className="mt-2" variant="secondary">
                {waitlist.priority.toUpperCase()} PRIORITY
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Wait details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Party Size</p>
                <p className="text-sm text-muted-foreground">{waitlist.partySize} guests</p>
              </div>
            </div>
            
            {waitlist.waitTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Wait Time</p>
                  <p className="text-sm text-muted-foreground">{waitlist.waitTime} minutes</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {waitlist.estimatedWait && (
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Estimated Wait</p>
                  <p className="text-sm text-muted-foreground">{waitlist.estimatedWait} minutes</p>
                </div>
              </div>
            )}
            
            {waitlist.quotedTime && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Quoted Time</p>
                  <p className="text-sm text-muted-foreground">{waitlist.quotedTime}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Special requests */}
        {waitlist.specialRequests && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Special Requests
              </h4>
              <p className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                {waitlist.specialRequests}
              </p>
            </div>
          </>
        )}

        {/* Status */}
        <Separator />
        <div className="flex items-center justify-center">
          <Badge className={cn(getStatusColor(waitlist.status), "px-3 py-1")} variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            <span className="capitalize">{waitlist.status}</span>
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {localIsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-surface-2 shadow-xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-surface-2">
                <h2 className="font-semibold text-lg capitalize">
                  {type} Details
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    aria-label="Close drawer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {type === 'booking' && renderBookingDetails()}
                {type === 'table' && renderTableDetails()}
                {type === 'waitlist' && renderWaitlistDetails()}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 p-6 border-t border-surface-2">
                <div className="flex items-center gap-2">
                  <Button className="flex-1" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {type === 'booking' && 'Seat Guests'}
                    {type === 'table' && 'Clear Table'}
                    {type === 'waitlist' && 'Seat Now'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DetailsDrawer;

