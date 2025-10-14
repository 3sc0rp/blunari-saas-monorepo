import React, { useState, useEffect, memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useTenant } from "@/hooks/useTenant";
import { useAdvancedBookings } from "@/hooks/useAdvancedBookings";
import OptimizedBookingsTable from "@/components/booking/VirtualizedBookingsTable";
import BookingsCalendar from "@/components/booking/BookingsCalendar";
import ReservationDrawer from "@/components/booking/ReservationDrawer";
import { BookingDebugger } from "@/components/debug/BookingDebugger";
import SmartBookingWizard from "@/components/booking/SmartBookingWizard";
import AdvancedFilters from "@/components/booking/AdvancedFilters";
import { toast } from "sonner";
import {
  ExtendedBooking,
  BookingStatus,
  BookingFilters,
} from "@/types/booking";
import {
  Plus,
  Calendar,
  CheckSquare,
  Trash2,
  MessageSquare,
  Activity,
  Clock,
  Users,
  Loader2,
} from "lucide-react";

const Bookings: React.FC = () => {
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
  const [view, setView] = useState<'table'|'calendar'>("table");
  const [selectedBooking, setSelectedBooking] =
    useState<ExtendedBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [bookings]);

  // URL State Management for Filters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<BookingFilters> = {};

    if (params.get("status")) {
      urlFilters.status = params.get("status")!.split(",") as BookingStatus[];
    }
    if (params.get("startDate") && params.get("endDate")) {
      urlFilters.dateRange = {
        start: params.get("startDate")!,
        end: params.get("endDate")!,
      };
    }
    if (params.get("sources")) {
      urlFilters.sources = params.get("sources")!.split(",") as any[];
    }
    if (params.get("search")) {
      urlFilters.search = params.get("search")!;
    }

    if (Object.keys(urlFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...urlFilters }));
    }
  }, [setFilters]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.status.length > 0) {
      params.set("status", filters.status.join(","));
    }
    if (filters.dateRange.start && filters.dateRange.end) {
      params.set("startDate", filters.dateRange.start);
      params.set("endDate", filters.dateRange.end);
    }
    if (filters.sources.length > 0) {
      params.set("sources", filters.sources.join(","));
    }
    if (filters.search) {
      params.set("search", filters.search);
    }

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [filters]);

  // Calculate key metrics - use all bookings for demo since data is from Sept
      const todaysBookings = bookings; // Show all bookings in metrics for demo
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {  }

  const metrics = {
    totalToday: todaysBookings.length,
    pendingToday: todaysBookings.filter((b) => b.status === "pending").length,
    confirmedToday: todaysBookings.filter((b) => b.status === "confirmed")
      .length,
    totalGuests: todaysBookings.reduce((sum, b) => sum + b.party_size, 0),
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map((b) => b.id));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId],
    );
  };

  const handleBookingClick = (booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = (bookingId: string, status: BookingStatus) => {
    updateBooking({ id: bookingId, updates: { status } });
  };

  const handleUpdateBooking = (
    bookingId: string,
    updates: Partial<ExtendedBooking>,
  ) => {
    updateBooking({ id: bookingId, updates });
  };

  const handleBulkStatusUpdate = (status: string) => {
    bulkOperation({
      type: "status_update",
      bookingIds: selectedBookings,
      data: { status },
    });
    setSelectedBookings([]);
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
    setSelectedBookings([]);
  };

  const handleBulkDelete = () => {
    bulkOperation({
      type: "delete",
      bookingIds: selectedBookings,
      data: {},
    });
    setSelectedBookings([]);
  };

  // Quick filter helpers
      const setQuickStatus = (status?: BookingStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? ([status] as BookingStatus[]) : [],
    }));
  };

  const setDatePreset = (preset: 'today' | 'tomorrow' | 'next7' | 'week') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'tomorrow') {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'next7') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    } else {
      // current week (Mon-Sun)
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7; // 0 (Sun) -> 6
      start.setDate(start.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }
    setFilters((prev) => ({
      ...prev,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
    }));
  };

  const handleExportCSV = () => {
    const bookingsToExport =
      selectedBookings.length > 0
        ? bookings.filter((b) => selectedBookings.includes(b.id))
        : bookings;

    bulkOperation({
      type: "export",
      bookingIds: bookingsToExport.map((b) => b.id),
      data: {},
    });
  };

  if (tenantLoading || !tenant) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {tenantLoading
                ? "Loading restaurant data..."
                : "No restaurant found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Booking Management
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Comprehensive reservation management with advanced filtering and
            real-time updates
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
            <span className="text-xs text-muted-foreground">updated {lastUpdated}</span>
          </Badge>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Debug Section */}
      <BookingDebugger />

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground mr-1">Status:</span>
        <Button size="sm" variant={filters.status.length === 0 ? 'default' : 'outline'} onClick={() => setQuickStatus(undefined)}>All</Button>
        <Button size="sm" variant={filters.status.includes('pending' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('pending' as BookingStatus)}>Pending</Button>
        <Button size="sm" variant={filters.status.includes('confirmed' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('confirmed' as BookingStatus)}>Confirmed</Button>
        <Button size="sm" variant={filters.status.includes('seated' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('seated' as BookingStatus)}>Seated</Button>
        <Button size="sm" variant={filters.status.includes('completed' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('completed' as BookingStatus)}>Completed</Button>
        <Button size="sm" variant={filters.status.includes('cancelled' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('cancelled' as BookingStatus)}>Cancelled</Button>
        <Button size="sm" variant={filters.status.includes('noshow' as BookingStatus) ? 'default' : 'outline'} onClick={() => setQuickStatus('noshow' as BookingStatus)}>No‑Show</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Date:</span>
        <Button size="sm" variant="outline" onClick={() => setDatePreset('today')}>Today</Button>
        <Button size="sm" variant="outline" onClick={() => setDatePreset('tomorrow')}>Tomorrow</Button>
        <Button size="sm" variant="outline" onClick={() => setDatePreset('week')}>This Week</Button>
        <Button size="sm" variant="outline" onClick={() => setDatePreset('next7')}>Next 7 days</Button>
      </div>

      {/* Toggle + Today's Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Today's Bookings
                </p>
                <p className="text-2xl font-bold">{metrics.totalToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold">{metrics.pendingToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Confirmed
                </p>
                <p className="text-2xl font-bold">{metrics.confirmedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Guests
                </p>
                <p className="text-2xl font-bold">{metrics.totalGuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant={view==='table'? 'default':'outline'} size="sm" onClick={()=>setView('table')}>List</Button>
          <Button variant={view==='calendar'? 'default':'outline'} size="sm" onClick={()=>setView('calendar')}>Calendar</Button>
        </div>
      </div>

      {/* Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalBookings={bookings.length}
        onExportCSV={handleExportCSV}
      />

      {/* Bulk Actions */}
      {selectedBookings.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {selectedBookings.length} of {bookings.length} selected
                </span>
                <Badge variant="secondary">Bulk Actions Available</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate("confirmed")}
                  disabled={isBulkOperationPending}
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
                  onClick={handleBulkNotification}
                  disabled={isBulkOperationPending}
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
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
                        {selectedBookings.length} booking(s)? This action cannot
                        be undone.
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
      )}

      {/* Data View */}
      {view === 'table' ? (
        <OptimizedBookingsTable
          bookings={bookings}
          selectedBookings={selectedBookings}
          onSelectBooking={handleSelectBooking}
          onSelectAll={handleSelectAll}
          onBookingClick={handleBookingClick}
          onStatusUpdate={handleStatusUpdate}
          isLoading={isLoading}
          height={600}
        />
      ) : (
        <BookingsCalendar bookings={bookings} onSelectBooking={handleBookingClick} />
      )}

      {/* Reservation Drawer */}
      <ReservationDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
        onUpdateBooking={handleUpdateBooking}
      />

      {/* Smart Booking Wizard */}
      <SmartBookingWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
};

export default memo(Bookings);


