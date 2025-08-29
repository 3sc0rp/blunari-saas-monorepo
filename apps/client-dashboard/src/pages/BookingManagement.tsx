import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTenant } from '@/hooks/useTenant';
import { useAdvancedBookings } from '@/hooks/useAdvancedBookings';
import BookingCard from '@/components/dashboard/BookingCard';
import SmartBookingWizard from '@/components/booking/SmartBookingWizard';
import AdvancedFilters from '@/components/booking/AdvancedFilters';
import { 
  Plus, 
  CalendarIcon,
  CheckSquare,
  Square,
  Trash2,
  Send,
  Edit,
  MoreHorizontal,
  MessageSquare,
  Activity
} from 'lucide-react';

const BookingManagement: React.FC = () => {
  const { tenant } = useTenant();
  const {
    bookings,
    isLoading,
    filters,
    setFilters,
    selectedBookings,
    setSelectedBookings,
    bulkOperation,
    isBulkOperationPending,
    updateBooking
  } = useAdvancedBookings(tenant?.id);

  const [showWizard, setShowWizard] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Group bookings by status
  const bookingsByStatus = React.useMemo(() => {
    const groups = {
      confirmed: bookings.filter(b => b.status === 'confirmed'),
      pending: bookings.filter(b => b.status === 'pending'),
      seated: bookings.filter(b => b.status === 'seated'),
      completed: bookings.filter(b => b.status === 'completed'),
      cancelled: bookings.filter(b => b.status === 'cancelled'),
      noshow: bookings.filter(b => b.status === 'noshow'),
    };
    return groups;
  }, [bookings]);

  const currentBookings = selectedStatus === 'all' ? bookings : bookingsByStatus[selectedStatus as keyof typeof bookingsByStatus] || [];

  const statusCounts = {
    all: bookings.length,
    confirmed: bookingsByStatus.confirmed.length,
    pending: bookingsByStatus.pending.length,
    seated: bookingsByStatus.seated.length,
    completed: bookingsByStatus.completed.length,
    cancelled: bookingsByStatus.cancelled.length,
    noshow: bookingsByStatus.noshow.length,
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === currentBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(currentBookings.map(b => b.id));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleBulkStatusUpdate = (status: string) => {
    bulkOperation({
      type: 'status_update',
      bookingIds: selectedBookings,
      data: { status }
    });
  };

  const handleBulkNotification = () => {
    bulkOperation({
      type: 'send_notification',
      bookingIds: selectedBookings,
      data: { 
        type: 'reminder',
        template: 'booking_reminder' 
      }
    });
  };

  const handleBulkDelete = () => {
    bulkOperation({
      type: 'delete',
      bookingIds: selectedBookings,
      data: {}
    });
  };

  const handleExportCSV = () => {
    const bookingsToExport = selectedBookings.length > 0 
      ? currentBookings.filter(b => selectedBookings.includes(b.id))
      : currentBookings;
    
    bulkOperation({
      type: 'export',
      bookingIds: bookingsToExport.map(b => b.id),
      data: {}
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Booking Management</h1>
          <p className="text-muted-foreground">
            Comprehensive booking lifecycle management with smart features
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Real-time Updates
          </Badge>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Smart Booking
          </Button>
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <AdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalBookings={bookings.length}
          onExportCSV={handleExportCSV}
        />
      </motion.div>

      {/* Bulk Actions */}
      {selectedBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedBookings.length === currentBookings.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-medium">
                    {selectedBookings.length} of {currentBookings.length} selected
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('confirmed')}
                    disabled={isBulkOperationPending}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('seated')}
                    disabled={isBulkOperationPending}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Seat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkNotification}
                    disabled={isBulkOperationPending}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Notify
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBulkOperationPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Bookings</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedBookings.length} booking(s)? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Booking Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              <Badge variant="secondary" className="text-xs">
                {statusCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending
              <Badge variant="secondary" className="text-xs">
                {statusCounts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              Confirmed
              <Badge variant="secondary" className="text-xs">
                {statusCounts.confirmed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="seated" className="flex items-center gap-2">
              Seated
              <Badge variant="secondary" className="text-xs">
                {statusCounts.seated}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              Completed
              <Badge variant="secondary" className="text-xs">
                {statusCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              Cancelled
              <Badge variant="secondary" className="text-xs">
                {statusCounts.cancelled}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="noshow" className="flex items-center gap-2">
              No Show
              <Badge variant="secondary" className="text-xs">
                {statusCounts.noshow}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-6">
            <BookingsList 
              bookings={currentBookings} 
              isLoading={isLoading}
              selectedBookings={selectedBookings}
              onSelectBooking={handleSelectBooking}
              onUpdateBooking={updateBooking}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Smart Booking Wizard */}
      <SmartBookingWizard 
        open={showWizard}
        onOpenChange={setShowWizard}
      />
    </div>
  );
};

// Enhanced Bookings List Component
const BookingsList: React.FC<{ 
  bookings: any[]; 
  isLoading: boolean;
  selectedBookings: string[];
  onSelectBooking: (id: string) => void;
  onUpdateBooking: (data: { id: string; updates: any }) => void;
}> = ({ 
  bookings, 
  isLoading, 
  selectedBookings,
  onSelectBooking,
  onUpdateBooking
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            No bookings match your current search criteria. Try adjusting your filters or search terms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((booking, index) => (
        <motion.div
          key={booking.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="relative"
        >
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={selectedBookings.includes(booking.id)}
              onCheckedChange={() => onSelectBooking(booking.id)}
              className="bg-background border-2"
            />
          </div>
          <BookingCard 
            booking={booking} 
            onUpdate={(updates) => onUpdateBooking({ id: booking.id, updates })}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default BookingManagement;