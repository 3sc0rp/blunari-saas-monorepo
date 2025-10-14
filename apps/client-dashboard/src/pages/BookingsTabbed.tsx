import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/useTenant";
import { useAdvancedBookings } from "@/hooks/useAdvancedBookings";
import OptimizedBookingsTable from "@/components/booking/VirtualizedBookingsTable";
import BookingsCalendar from "@/components/booking/BookingsCalendar";
import ReservationDrawer from "@/components/booking/ReservationDrawer";
import SmartBookingWizard from "@/components/booking/SmartBookingWizard";
import AdvancedFilters from "@/components/booking/AdvancedFilters";
import BookingWidgetConfiguration from "@/components/booking/BookingWidgetConfiguration";
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
  Eye,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { ExtendedBooking, BookingStatus } from "@/types/booking";
import { useWidgetAnalytics, formatAnalyticsValue, analyticsFormatters } from '@/widgets/management/useWidgetAnalytics';

/**
 * Tab-Based Booking Management
 * Organized like CateringManagement for consistency
 */
export default function BookingsTabbed() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  
  // Log tenant information for debugging analytics
      if (import.meta.env.DEV) {  }

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
  const [analyticsRange, setAnalyticsRange] = useState<'1d' | '7d' | '30d'>('7d');

  // Use real analytics hook for booking widget
      const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics,
    isAvailable: analyticsAvailable,
    meta: analyticsMeta
  } = useWidgetAnalytics({
    tenantId: tenant?.id || null,
    tenantSlug: tenant?.slug || null,
    widgetType: 'booking',
  });

  // Re-fetch analytics when range changes
  useEffect(() => {
    if (!analyticsAvailable) return;
    if (analyticsRange === '7d' && !analyticsData) return;
    refreshAnalytics(analyticsRange);
  }, [analyticsAvailable, analyticsRange, refreshAnalytics, analyticsData]);

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
    await updateBooking({ id: bookingId, updates: { status: newStatus } });
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
            <Plus className="h-4 w-4 mr-2" />
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
          <AdvancedFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            totalBookings={bookings.length}
            onExportCSV={() => {
              try {
                const rows: string[] = [];
                rows.push('id,guest_name,guest_email,guest_phone,booking_time,party_size,status,special_requests');
                bookings.forEach(b => {
                  rows.push(`${b.id},"${b.guest_name}","${b.guest_email || ''}","${b.guest_phone || ''}","${b.booking_time}",${b.party_size},"${b.status}","${b.special_requests || ''}"`);
                });
                const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                toast.success('Bookings exported successfully');
              } catch (e) { 
                console.error('CSV export failed', e);
                toast.error('Failed to export bookings');
              }
            }}
          />
          
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

        {/* Analytics Tab - Widget Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">Booking Widget Analytics</h3>
                {analyticsMeta?.time_range && (
                  <Badge variant="secondary" className="text-xs">Range: {analyticsMeta.time_range}</Badge>
                )}
                {analyticsMeta?.version && (
                  <Badge variant="outline" className="text-xs">v{analyticsMeta.version}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Performance metrics for your booking widget
                {!analyticsAvailable && " – connect tenant to enable analytics."}
                {(!analyticsLoading && analyticsData && analyticsData.totalViews === 0 && analyticsData.totalBookings === 0) && ' – no recorded activity yet.'}
                {analyticsError && ' – analytics temporarily unavailable.'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={analyticsRange} onValueChange={(v: '1d' | '7d' | '30d') => setAnalyticsRange(v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24h</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
              {analyticsError && (
                <Badge variant="destructive" className="text-xs">Error</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshAnalytics(analyticsRange)}
                disabled={analyticsLoading}
              >
                {analyticsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    const rows: string[] = [];
                    rows.push('source,count');
                    (analyticsData?.topSources || []).forEach(s => rows.push(`${s.source},${s.count}`));
                    rows.push('');
                    rows.push('date,views,bookings,revenue');
                    (analyticsData?.dailyStats || []).forEach(d => rows.push(`${d.date},${d.views},${d.bookings ?? ''},${d.revenue ?? ''}`));
                    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${tenant?.slug || 'tenant'}-booking-analytics.csv`;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                  } catch (e) { console.error('CSV export failed', e); }
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalViews, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalBookings, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Party Size</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.avgPartySize, analyticsFormatters.decimal)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top sources */}
            <Card>
              <CardHeader>
                <CardTitle>Top Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topSources?.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{source.source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ 
                              width: analyticsData?.topSources?.[0] 
                                ? `${(source.count / analyticsData.topSources[0].count) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {formatAnalyticsValue(source.count, analyticsFormatters.count)}
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      {analyticsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading analytics...
                        </div>
                      ) : (
                        "No traffic source data available"
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.peakHours && Array.isArray(analyticsData.peakHours) && analyticsData.peakHours.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Booking Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {analyticsData.peakHours.filter(peakHour => peakHour && typeof peakHour === 'object').map((peakHour, index) => (
                          <Badge key={index} variant="secondary">
                            {peakHour.hour}:00 ({peakHour.bookings} bookings)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium text-green-600">
                        {formatAnalyticsValue(analyticsData?.conversionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Avg Session Duration</span>
                      <span className="font-medium">
                        {formatAnalyticsValue(analyticsData?.avgSessionDuration, analyticsFormatters.duration)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium text-blue-600">
                        {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Daily performance chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.dailyStats?.map((day, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-medium text-blue-600">
                        {formatAnalyticsValue(day.views, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Bookings</p>
                      <p className="font-medium text-green-600">
                        {formatAnalyticsValue(day.bookings, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium text-purple-600">
                        {day.revenue ? formatAnalyticsValue(day.revenue, analyticsFormatters.currency) : '—'}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading daily stats...
                      </div>
                    ) : (
                      "No daily statistics available"
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget Tab - Full Configuration */}
        <TabsContent value="widget">
          <BookingWidgetConfiguration 
            tenantId={tenant?.id} 
            tenantSlug={tenant?.slug} 
          />
        </TabsContent>
      </Tabs>

      {/* Reservation Drawer */}
      <ReservationDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
        onUpdateBooking={(bookingId: string, updates: Partial<ExtendedBooking>) => {
          updateBooking({ id: bookingId, updates });
        }}
      />

      {/* Smart Booking Wizard */}
      <SmartBookingWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
}



