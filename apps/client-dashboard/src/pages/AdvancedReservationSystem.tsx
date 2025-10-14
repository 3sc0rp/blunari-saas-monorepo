import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Settings,
  BarChart3,
  Loader2,
  RefreshCw,
  Target,
  Zap,
  Crown,
  Heart,
  Star,
  Gift,
} from "lucide-react";

// Enhanced booking interface with restaurant optimization
export interface AdvancedReservation {
  id: string;
  tenant_id: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  party_size: number;
  date: string;
  time: string;
  duration_minutes: number;
  table_id?: string;
  table_preference?: string;
  status: ReservationStatus;
  seating_preference: SeatingPreference;
  special_occasions?: SpecialOccasion[];
  dietary_requirements?: string[];
  accessibility_needs?: string[];
  marketing_source?: string;
  estimated_spend?: number; // in cents
  priority_score: number;
  arrival_time?: string;
  seated_time?: string;
  completed_time?: string;
  no_show_time?: string;
  notes?: string;
  internal_notes?: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  follow_up_sent: boolean;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 
  | "pending"
  | "confirmed" 
  | "arrived"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export type SeatingPreference = 
  | "no_preference"
  | "window"
  | "booth" 
  | "bar"
  | "patio"
  | "private_room"
  | "quiet_area"
  | "high_top";

export type SpecialOccasion = 
  | "birthday"
  | "anniversary"
  | "date_night"
  | "business_meeting"
  | "celebration"
  | "proposal"
  | "family_gathering";

export interface TableOptimization {
  id: string;
  table_number: string;
  capacity: number;
  location: SeatingPreference;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_reservation_id?: string;
  optimal_party_sizes: number[];
  revenue_per_hour: number;
  turnover_minutes: number;
  accessibility_features: string[];
}

export interface ReservationAnalytics {
  total_reservations: number;
  confirmed_rate: number;
  no_show_rate: number;
  average_party_size: number;
  average_duration: number;
  table_utilization: number;
  revenue_per_reservation: number;
  peak_hours: Array<{ hour: number; count: number }>;
  popular_preferences: Array<{ preference: SeatingPreference; count: number }>;
  conversion_by_source: Array<{ source: string; conversion: number }>;
}

// Real-data-only baseline (empty). To be hydrated via future Supabase queries & realtime.
// TODO(reservations-api): implement fetch + subscription for reservations & tables.
      const initialReservations: AdvancedReservation[] = [];
const initialTables: TableOptimization[] = [];

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  arrived: "bg-green-100 text-green-800",
  seated: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

const seatingPreferenceOptions: SeatingPreference[] = [
  "no_preference", "window", "booth", "bar", "patio", "private_room", "quiet_area", "high_top"
];

const specialOccasionOptions: SpecialOccasion[] = [
  "birthday", "anniversary", "date_night", "business_meeting", "celebration", "proposal", "family_gathering"
];

const AdvancedReservationSystem: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<AdvancedReservation[]>(initialReservations);
  const [tables, setTables] = useState<TableOptimization[]>(initialTables);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
      const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<AdvancedReservation | null>(null);
  
  // Form states
      const [reservationForm, setReservationForm] = useState<Partial<AdvancedReservation>>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    party_size: 2,
    date: new Date().toISOString().split('T')[0],
    time: "19:00",
    duration_minutes: 90,
    seating_preference: "no_preference",
    special_occasions: [],
    dietary_requirements: [],
    notes: "",
  });

  // Filter reservations
      const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      const matchesSearch = 
        reservation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.customer_phone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
      
      const matchesDate = reservation.date === selectedDate.toISOString().split('T')[0];
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [reservations, searchTerm, statusFilter, selectedDate]);

  // Calculate analytics
      const analytics = useMemo(() => {
    const todayReservations = reservations.filter(r => 
      r.date === new Date().toISOString().split('T')[0]
    );
    
    const totalReservations = todayReservations.length;
    const confirmedReservations = todayReservations.filter(r => r.status === "confirmed").length;
    const noShows = todayReservations.filter(r => r.status === "no_show").length;
    const avgPartySize = totalReservations > 0 ? 
      todayReservations.reduce((sum, r) => sum + r.party_size, 0) / totalReservations : 0;
    
    const totalRevenue = todayReservations.reduce((sum, r) => sum + (r.estimated_spend || 0), 0);
    const tableUtilization = tables.length > 0 
      ? (tables.filter(t => t.status !== "available").length / tables.length) * 100 
      : 0;

    return {
      totalReservations,
      confirmedRate: totalReservations > 0 ? (confirmedReservations / totalReservations) * 100 : 0,
      noShowRate: totalReservations > 0 ? (noShows / totalReservations) * 100 : 0,
      avgPartySize: Math.round(avgPartySize * 10) / 10,
      estimatedRevenue: totalRevenue,
      tableUtilization: Math.round(tableUtilization),
    };
  }, [reservations, tables]);

  const handleCreateReservation = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!reservationForm.customer_name || !reservationForm.date || !reservationForm.time) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Calculate priority score based on various factors
      const priorityScore = calculatePriorityScore(reservationForm);

      // Create new reservation
      const newReservation: AdvancedReservation = {
        id: `reservation-${Date.now()}`,
        tenant_id: tenant?.id || "",
        customer_name: reservationForm.customer_name!,
        customer_email: reservationForm.customer_email,
        customer_phone: reservationForm.customer_phone,
        party_size: reservationForm.party_size || 2,
        date: reservationForm.date!,
        time: reservationForm.time!,
        duration_minutes: reservationForm.duration_minutes || 90,
        status: "pending",
        seating_preference: reservationForm.seating_preference || "no_preference",
        special_occasions: reservationForm.special_occasions || [],
        dietary_requirements: reservationForm.dietary_requirements || [],
        priority_score: priorityScore,
        confirmation_sent: false,
        reminder_sent: false,
        follow_up_sent: false,
        notes: reservationForm.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setReservations(prev => [...prev, newReservation]);
      setShowReservationDialog(false);
      resetReservationForm();
      
      toast({
        title: "Success",
        description: `Reservation created for ${newReservation.customer_name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reservation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReservationStatus = async (reservationId: string, newStatus: ReservationStatus) => {
    try {
      setReservations(prev => prev.map(reservation => 
        reservation.id === reservationId 
          ? { 
              ...reservation, 
              status: newStatus,
              ...(newStatus === "arrived" ? { arrival_time: new Date().toISOString() } : {}),
              ...(newStatus === "seated" ? { seated_time: new Date().toISOString() } : {}),
              ...(newStatus === "completed" ? { completed_time: new Date().toISOString() } : {}),
              ...(newStatus === "no_show" ? { no_show_time: new Date().toISOString() } : {}),
              updated_at: new Date().toISOString()
            }
          : reservation
      ));
      
      toast({
        title: "Success",
        description: `Reservation status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reservation status",
        variant: "destructive",
      });
    }
  };

  const calculatePriorityScore = (reservation: Partial<AdvancedReservation>) => {
    let score = 50; // Base score
    
    // Party size factor (larger parties = higher score)
    score += (reservation.party_size || 0) * 5;
    
    // Special occasions boost
      if (reservation.special_occasions?.length) {
      score += reservation.special_occasions.length * 10;
    }
    
    // Business meeting boost
      if (reservation.special_occasions?.includes("business_meeting")) {
      score += 15;
    }
    
    // Peak time adjustment
      const hour = parseInt(reservation.time?.split(':')[0] || '19');
    if (hour >= 19 && hour <= 21) { // Peak dinner hours
      score += 10;
    }
    
    return Math.min(score, 100);
  };

  const resetReservationForm = () => {
    setReservationForm({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      party_size: 2,
      date: new Date().toISOString().split('T')[0],
      time: "19:00",
      duration_minutes: 90,
      seating_preference: "no_preference",
      special_occasions: [],
      dietary_requirements: [],
      notes: "",
    });
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Advanced Reservations</h1>
          <p className="text-muted-foreground">
            Intelligent table optimization and customer experience management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowOptimizationDialog(true)}>
            <Target className="w-4 h-4 mr-2" />
            Table Optimization
          </Button>
          <Button onClick={() => setShowReservationDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Reservations</p>
                <p className="text-2xl font-bold">{analytics.totalReservations}</p>
              </div>
              <CalendarIcon className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmation Rate</p>
                <p className="text-2xl font-bold">{analytics.confirmedRate.toFixed(0)}%</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No-Show Rate</p>
                <p className="text-2xl font-bold text-red-600">{analytics.noShowRate.toFixed(0)}%</p>
              </div>
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Party Size</p>
                <p className="text-2xl font-bold">{analytics.avgPartySize}</p>
              </div>
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.estimatedRevenue)}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Table Utilization</p>
                <p className="text-2xl font-bold">{analytics.tableUtilization}%</p>
              </div>
              <Target className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reservations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="optimization">Table Optimization</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="seated">Seated</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>

                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="w-auto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Reservations List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Reservations for {selectedDate.toLocaleDateString()} ({filteredReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReservations.map(reservation => (
                  <Card key={reservation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{reservation.customer_name}</h4>
                            <Badge className={statusColors[reservation.status]}>
                              {reservation.status}
                            </Badge>
                            {reservation.priority_score >= 80 && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Crown className="w-3 h-3 mr-1" />
                                VIP
                              </Badge>
                            )}
                            {reservation.special_occasions?.length > 0 && (
                              <Badge className="bg-pink-100 text-pink-800">
                                <Heart className="w-3 h-3 mr-1" />
                                {reservation.special_occasions[0]}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(reservation.time)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{reservation.party_size} guests</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{reservation.seating_preference.replace('_', ' ')}</span>
                            </div>
                            {reservation.estimated_spend && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>{formatCurrency(reservation.estimated_spend)}</span>
                              </div>
                            )}
                          </div>

                          {reservation.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              "{reservation.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {reservation.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateReservationStatus(reservation.id, "confirmed")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                          )}
                          
                          {reservation.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateReservationStatus(reservation.id, "arrived")}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          
                          {reservation.status === "arrived" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateReservationStatus(reservation.id, "seated")}
                            >
                              <MapPin className="w-4 h-4 mr-1" />
                              Seat
                            </Button>
                          )}
                          
                          {reservation.status === "seated" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateReservationStatus(reservation.id, "completed")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}

                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredReservations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reservations found for the selected date and filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {/* Table Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Table Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map(table => (
                  <Card key={table.id} className={`border-2 ${
                    table.status === "available" ? "border-green-200" :
                    table.status === "occupied" ? "border-red-200" :
                    table.status === "reserved" ? "border-blue-200" :
                    "border-yellow-200"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Table {table.table_number}</h4>
                        <Badge className={
                          table.status === "available" ? "bg-green-100 text-green-800" :
                          table.status === "occupied" ? "bg-red-100 text-red-800" :
                          table.status === "reserved" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }>
                          {table.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span>{table.capacity} guests</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{table.location.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Revenue/hr:</span>
                          <span>{formatCurrency(table.revenue_per_hour)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Turnover:</span>
                          <span>{table.turnover_minutes} min</span>
                        </div>
                      </div>

                      {table.accessibility_features.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {table.accessibility_features.map(feature => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Detailed reservation analytics, revenue forecasting, and optimization insights coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Reservation Dialog */}
      <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Reservation</DialogTitle>
            <DialogDescription>
              Add a new reservation with advanced customer preferences and requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={reservationForm.customer_name}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_size">Party Size *</Label>
                <Input
                  id="party_size"
                  type="number"
                  min="1"
                  max="20"
                  value={reservationForm.party_size}
                  onChange={(e) => setReservationForm(prev => ({ 
                    ...prev, 
                    party_size: parseInt(e.target.value) || 1
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={reservationForm.customer_email}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="john.doe@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={reservationForm.customer_phone}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={reservationForm.date}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={reservationForm.time}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="30"
                  max="240"
                  step="15"
                  value={reservationForm.duration_minutes}
                  onChange={(e) => setReservationForm(prev => ({ 
                    ...prev, 
                    duration_minutes: parseInt(e.target.value) || 90
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seating_preference">Seating Preference</Label>
              <Select
                value={reservationForm.seating_preference}
                onValueChange={(value) => setReservationForm(prev => ({ 
                  ...prev, 
                  seating_preference: value as SeatingPreference 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select seating preference" />
                </SelectTrigger>
                <SelectContent>
                  {seatingPreferenceOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Special Occasions</Label>
              <div className="flex flex-wrap gap-2">
                {specialOccasionOptions.map(occasion => (
                  <Badge
                    key={occasion}
                    variant={reservationForm.special_occasions?.includes(occasion) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = reservationForm.special_occasions || [];
                      const updated = current.includes(occasion)
                        ? current.filter(o => o !== occasion)
                        : [...current, occasion];
                      setReservationForm(prev => ({ ...prev, special_occasions: updated }));
                    }}
                  >
                    {occasion.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Requests</Label>
              <Textarea
                id="notes"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests, dietary requirements, or preferences..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReservationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReservation}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedReservationSystem;

