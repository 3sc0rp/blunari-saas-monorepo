import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { useAdvancedBookings } from "@/hooks/useAdvancedBookings";
import OptimizedBookingsTable from "@/components/booking/VirtualizedBookingsTable";
import BookingsCalendar from "@/components/booking/BookingsCalendar";
import ReservationDrawer from "@/components/booking/ReservationDrawer";
import SmartBookingWizard from "@/components/booking/SmartBookingWizard";
import AdvancedFilters from "@/components/booking/AdvancedFilters";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  CheckSquare,
  Clock,
  Users,
  Activity,
  BarChart3,
  List,
  CalendarDays,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { ExtendedBooking, BookingStatus } from "@/types/booking";

/**
 * Tab-Based Booking Management
 * Organized like CateringManagement for consistency
 */
export default function BookingsTabbed() {
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

  const [activeTab, setActiveTab] = useState('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysBookings = bookings.filter(b => 
      b.booking_time.split('T')[0] === today
    );

    return {
      total: bookings.length,
      totalToday: todaysBookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      seated: bookings.filter(b => b.status === 'seated').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      pendingToday: todaysBookings.filter(b => b.status === 'pending').length,
      confirmedToday: todaysBookings.filter(b => b.status === 'confirmed').length,
    };
  }, [bookings]);

  const handleBookingClick = (booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBooking({ bookingId, updates: { status: newStatus } });
    toast.success(`Booking updated to ${newStatus}`);
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Booking Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage reservations, view analytics, and configure your booking widget
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </Badge>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">All Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Widget</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total}</div>
                <p className="text-xs text-muted-foreground">{metrics.totalToday} today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.pending}</div>
                <p className="text-xs text-muted-foreground">{metrics.pendingToday} today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <CheckSquare className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.confirmed}</div>
                <p className="text-xs text-muted-foreground">{metrics.confirmedToday} today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.completed}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common booking management tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button 
                onClick={() => setShowWizard(true)} 
                variant="outline" 
                className="flex items-center gap-2 justify-start"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
              <Button 
                onClick={() => setActiveTab('bookings')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <List className="w-4 h-4" />
                View All Bookings
              </Button>
              <Button 
                onClick={() => setActiveTab('calendar')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <CalendarDays className="w-4 h-4" />
                Calendar View
              </Button>
              <Button 
                onClick={() => setActiveTab('widget')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <Settings className="w-4 h-4" />
                Widget Settings
              </Button>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest reservations</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.slice(0, 5).map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleBookingClick(booking)}
                >
                  <div>
                    <p className="font-medium">{booking.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.booking_time).toLocaleString()} • {booking.party_size} guests
                    </p>
                  </div>
                  <Badge className={
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'seated' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <AdvancedFilters filters={filters} onFiltersChange={setFilters} />
          
          <OptimizedBookingsTable
            bookings={bookings}
            selectedBookings={selectedBookings}
            onSelectBooking={(id) => {
              setSelectedBookings(prev => 
                prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
              );
            }}
            onSelectAll={() => {
              setSelectedBookings(selectedBookings.length === bookings.length ? [] : bookings.map(b => b.id));
            }}
            onBookingClick={handleBookingClick}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading}
            height={600}
          />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <BookingsCalendar 
            bookings={bookings} 
            onSelectBooking={handleBookingClick} 
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Booking Analytics</CardTitle>
              <CardDescription>Performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-4">Status Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500"
                            style={{ width: `${(metrics.pending / metrics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{metrics.pending}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Confirmed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${(metrics.confirmed / metrics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{metrics.confirmed}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Seated</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${(metrics.seated / metrics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{metrics.seated}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gray-500"
                            style={{ width: `${(metrics.completed / metrics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{metrics.completed}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Quick Stats</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Party Size:</span>
                      <span className="font-medium">
                        {bookings.length > 0 
                          ? (bookings.reduce((sum, b) => sum + b.party_size, 0) / bookings.length).toFixed(1)
                          : '0'
                        } guests
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmation Rate:</span>
                      <span className="font-medium">
                        {metrics.total > 0 
                          ? ((metrics.confirmed / metrics.total) * 100).toFixed(1)
                          : '0'
                        }%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No-Shows:</span>
                      <span className="font-medium">
                        {bookings.filter(b => b.status === 'noshow').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget Tab - Link to WidgetManagement */}
        <TabsContent value="widget">
          <Card>
            <CardHeader>
              <CardTitle>Booking Widget Configuration</CardTitle>
              <CardDescription>
                Configure and embed your booking widget
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Widget Configuration</h3>
              <p className="text-muted-foreground mb-6">
                Customize your booking widget colors, branding, and settings
              </p>
              <Button onClick={() => window.location.href = '/dashboard/widget-management'}>
                <Settings className="w-4 h-4 mr-2" />
                Open Widget Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reservation Drawer */}
      <ReservationDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
        onUpdateBooking={(updates) => {
          if (selectedBooking) {
            updateBooking({ bookingId: selectedBooking.id, updates });
          }
        }}
      />

      {/* Smart Booking Wizard */}
      <SmartBookingWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
}

