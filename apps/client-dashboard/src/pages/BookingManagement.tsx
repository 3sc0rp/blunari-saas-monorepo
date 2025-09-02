import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/hooks/useTenant";
import { useAdvancedBookings } from "@/hooks/useAdvancedBookings";
import BookingCard from "@/components/dashboard/BookingCard";
import AdvancedBookingStatusOverview from "@/components/booking/AdvancedBookingStatusOverview";
import SmartBookingWizard from "@/components/booking/SmartBookingWizard";
import EnhancedFilters from "@/components/booking/EnhancedFilters";
import OptimizedBookingsTable from "@/components/booking/VirtualizedBookingsTable";
import {
  Plus,
  CalendarIcon,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  Send,
  Edit,
  MoreHorizontal,
  MessageSquare,
  Activity,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";

const BookingManagement: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const {
    bookings,
    isLoading,
    filters,
    setFilters,
    selectedBookings,
    setSelectedBookings,
    bulkOperation,
    isBulkOperationPending,
    updateBooking,
  } = useAdvancedBookings(tenant?.id);

  const [showWizard, setShowWizard] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Group bookings by status
  const bookingsByStatus = React.useMemo(() => {
    const groups = {
      confirmed: bookings.filter((b) => b.status === "confirmed"),
      pending: bookings.filter((b) => b.status === "pending"),
      seated: bookings.filter((b) => b.status === "seated"),
      completed: bookings.filter((b) => b.status === "completed"),
      cancelled: bookings.filter((b) => b.status === "cancelled"),
      noshow: bookings.filter((b) => b.status === "noshow"),
    };
    return groups;
  }, [bookings]);

  const currentBookings =
    selectedStatus === "all"
      ? bookings
      : bookingsByStatus[selectedStatus as keyof typeof bookingsByStatus] || [];

  const statusCounts = {
    all: bookings.length,
    confirmed: bookingsByStatus.confirmed.length,
    pending: bookingsByStatus.pending.length,
    seated: bookingsByStatus.seated.length,
    completed: bookingsByStatus.completed.length,
    cancelled: bookingsByStatus.cancelled.length,
    noshow: bookingsByStatus.noshow.length,
  };

  // Calculate key metrics
  const todaysBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.booking_time).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  });

  const metrics = {
    totalToday: todaysBookings.length,
    pendingToday: todaysBookings.filter((b) => b.status === "pending").length,
    confirmedToday: todaysBookings.filter((b) => b.status === "confirmed")
      .length,
    totalGuests: todaysBookings.reduce((sum, b) => sum + b.party_size, 0),
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === currentBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(currentBookings.map((b) => b.id));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId],
    );
  };

  const handleBulkStatusUpdate = (status: string) => {
    bulkOperation({
      type: "status_update",
      bookingIds: selectedBookings,
      data: { status },
    });
    setSelectedBookings([]); // Clear selection after bulk operation
  };

  const handleBulkNotification = () => {
    bulkOperation({
      type: "send_notification",
      bookingIds: selectedBookings,
      data: {
        type: "reminder",
        template: "booking_reminder",
      },
    });
    setSelectedBookings([]); // Clear selection after bulk operation
  };

  const handleBulkDelete = () => {
    bulkOperation({
      type: "delete",
      bookingIds: selectedBookings,
      data: {},
    });
    setSelectedBookings([]); // Clear selection after bulk operation
  };

  const handleExportCSV = () => {
    const bookingsToExport =
      selectedBookings.length > 0
        ? currentBookings.filter((b) => selectedBookings.includes(b.id))
        : currentBookings;

    bulkOperation({
      type: "export",
      bookingIds: bookingsToExport.map((b) => b.id),
      data: {},
    });
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading restaurant data...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Restaurant Found</h3>
            <p className="text-muted-foreground">
              Please ensure you have a valid restaurant setup to view bookings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header with Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-h1 font-bold text-text">Booking Management</h1>
            <p className="text-body text-text-muted">
              Comprehensive booking lifecycle management with smart features
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="flex items-center gap-2 px-3 py-1 bg-surface-2 border-surface-3"
            >
              <Activity className="h-4 w-4" />
              Real-time Updates
            </Badge>
          </div>
        </div>

        {/* Today's Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-surface border-surface-2 shadow-elev-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">
                    Today's Bookings
                  </p>
                  <p className="text-h3 font-bold text-text font-tabular">
                    {metrics.totalToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-surface-2 shadow-elev-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">Pending</p>
                  <p className="text-h3 font-bold text-text font-tabular">
                    {metrics.pendingToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-surface-2 shadow-elev-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">
                    Confirmed
                  </p>
                  <p className="text-h3 font-bold text-text font-tabular">
                    {metrics.confirmedToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-surface-2 shadow-elev-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">
                    Total Guests
                  </p>
                  <p className="text-h3 font-bold text-text font-tabular">
                    {metrics.totalGuests}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <EnhancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalBookings={bookings.length}
          onExportCSV={handleExportCSV}
          onNewBooking={() => setShowWizard(true)}
        />
      </motion.div>

      {/* Enhanced Bulk Actions */}
      {selectedBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-surface border-surface-2 shadow-elev-2 border-l-4 border-l-brand">
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedBookings.length === currentBookings.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-semibold text-lg text-text">
                    {selectedBookings.length} of {currentBookings.length}{" "}
                    selected
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-brand/10 text-brand border-brand/20"
                  >
                    Bulk Actions Available
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate("confirmed")}
                    disabled={isBulkOperationPending}
                    className="shadow-sm"
                  >
                    {isBulkOperationPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate("seated")}
                    disabled={isBulkOperationPending}
                    className="shadow-sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Seat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkNotification}
                    disabled={isBulkOperationPending}
                    className="shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notify
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBulkOperationPending}
                        className="shadow-sm border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete Selected Bookings
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          {selectedBookings.length} booking(s)? This action
                          cannot be undone and will permanently remove all
                          booking data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Permanently
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

      {/* Advanced Booking Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AdvancedBookingStatusOverview
          bookings={bookings}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Virtualized Bookings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <OptimizedBookingsTable
          bookings={currentBookings}
          selectedBookings={selectedBookings}
          onSelectBooking={handleSelectBooking}
          onSelectAll={handleSelectAll}
          onBookingClick={(booking) => console.log("Booking clicked:", booking)}
          onStatusUpdate={(id, status) =>
            updateBooking({ id, updates: { status } })
          }
          isLoading={isLoading}
          height={600}
        />
      </motion.div>

      {/* Smart Booking Wizard */}
      <SmartBookingWizard open={showWizard} onOpenChange={setShowWizard} />
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
  onUpdateBooking,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CalendarIcon className="h-16 w-16 text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-3">
            No bookings found
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            No bookings match your current search criteria. Try adjusting your
            filters, search terms, or date range.
          </p>
          <Button variant="outline" className="mt-6">
            <Plus className="w-4 h-4 mr-2" />
            Create New Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map((booking, index) => (
        <motion.div
          key={booking.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="relative group"
        >
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={selectedBookings.includes(booking.id)}
              onCheckedChange={() => onSelectBooking(booking.id)}
              className="bg-background/80 backdrop-blur-sm border-2 shadow-sm"
            />
          </div>
          <div className="transform transition-transform group-hover:scale-[1.02]">
            <BookingCard
              booking={booking}
              onUpdate={(updates) =>
                onUpdateBooking({ id: booking.id, updates })
              }
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BookingManagement;
