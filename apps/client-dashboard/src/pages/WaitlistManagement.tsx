import React, { useState, useMemo, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Clock,
  Users,
  Phone,
  MessageSquare,
  Bell,
  Send,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Timer,
  Zap,
  AlertCircle,
  CheckCircle,
  Star,
  Crown,
  TrendingUp,
  BarChart3,
  Settings,
  Loader2,
  RefreshCw,
  Volume2,
  Smartphone,
  Mail,
} from "lucide-react";

// Enhanced waitlist interfaces
export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  seating_preference: SeatingPreference;
  special_requests?: string[];
  estimated_wait_minutes: number;
  actual_wait_minutes?: number;
  priority: WaitlistPriority;
  status: WaitlistStatus;
  position: number;
  joined_at: string;
  notified_at?: string;
  seated_at?: string;
  cancelled_at?: string;
  no_show_at?: string;
  table_ready_at?: string;
  sms_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  last_notification_sent?: string;
  notification_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type WaitlistStatus = 
  | "waiting"
  | "table_ready"
  | "notified"
  | "seated"
  | "cancelled"
  | "no_show";

export type WaitlistPriority = 
  | "low"
  | "normal" 
  | "high"
  | "vip";

export type SeatingPreference = 
  | "no_preference"
  | "window"
  | "booth" 
  | "bar"
  | "patio"
  | "private_room"
  | "quiet_area"
  | "high_top";

export interface WaitlistAnalytics {
  total_entries: number;
  current_waiting: number;
  average_wait_time: number;
  longest_wait_time: number;
  seated_today: number;
  no_shows_today: number;
  satisfaction_rate: number;
  notification_response_rate: number;
  peak_wait_hours: Array<{ hour: number; count: number }>;
  wait_time_by_party_size: Array<{ size: number; avg_wait: number }>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: "sms" | "email" | "push";
  trigger: "table_ready" | "position_update" | "reminder";
  message: string;
  active: boolean;
}

export interface WaitlistSettings {
  max_party_size: number;
  max_wait_time_minutes: number;
  auto_remove_no_show_minutes: number;
  sms_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  position_update_notifications: boolean;
  reminder_intervals: number[]; // minutes
  estimated_wait_accuracy_target: number; // percentage
}

// Mock data for waitlist entries
const mockWaitlistEntries: WaitlistEntry[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    customer_name: "Jennifer Smith",
    customer_phone: "(555) 123-4567",
    customer_email: "jennifer.smith@email.com",
    party_size: 4,
    seating_preference: "booth",
    special_requests: ["high_chair", "near_restroom"],
    estimated_wait_minutes: 25,
    priority: "normal",
    status: "waiting",
    position: 1,
    joined_at: "2024-09-04T19:15:00Z",
    sms_notifications_enabled: true,
    email_notifications_enabled: false,
    notification_count: 0,
    notes: "Family with young children",
    created_at: "2024-09-04T19:15:00Z",
    updated_at: "2024-09-04T19:15:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    customer_name: "David Kim",
    customer_phone: "(555) 234-5678",
    party_size: 2,
    seating_preference: "window",
    estimated_wait_minutes: 15,
    priority: "vip",
    status: "table_ready",
    position: 2,
    joined_at: "2024-09-04T19:25:00Z",
    table_ready_at: "2024-09-04T19:40:00Z",
    sms_notifications_enabled: true,
    email_notifications_enabled: true,
    notification_count: 1,
    last_notification_sent: "2024-09-04T19:40:00Z",
    notes: "VIP customer - priority seating",
    created_at: "2024-09-04T19:25:00Z",
    updated_at: "2024-09-04T19:40:00Z",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    customer_name: "Maria Rodriguez",
    customer_phone: "(555) 345-6789",
    party_size: 6,
    seating_preference: "no_preference",
    estimated_wait_minutes: 35,
    priority: "high",
    status: "notified",
    position: 3,
    joined_at: "2024-09-04T19:20:00Z",
    notified_at: "2024-09-04T19:45:00Z",
    sms_notifications_enabled: true,
    email_notifications_enabled: false,
    notification_count: 2,
    last_notification_sent: "2024-09-04T19:45:00Z",
    notes: "Large party - birthday celebration",
    created_at: "2024-09-04T19:20:00Z",
    updated_at: "2024-09-04T19:45:00Z",
  },
  {
    id: "4",
    tenant_id: "tenant-1",
    customer_name: "Robert Johnson",
    customer_phone: "(555) 456-7890",
    party_size: 3,
    seating_preference: "bar",
    estimated_wait_minutes: 20,
    actual_wait_minutes: 18,
    priority: "normal",
    status: "seated",
    position: 4,
    joined_at: "2024-09-04T18:50:00Z",
    seated_at: "2024-09-04T19:08:00Z",
    sms_notifications_enabled: true,
    email_notifications_enabled: true,
    notification_count: 1,
    created_at: "2024-09-04T18:50:00Z",
    updated_at: "2024-09-04T19:08:00Z",
  },
];

// Mock notification templates
const mockNotificationTemplates: NotificationTemplate[] = [
  {
    id: "1",
    name: "Table Ready SMS",
    type: "sms",
    trigger: "table_ready",
    message: "Hi {{customer_name}}! Your table for {{party_size}} is ready at {{restaurant_name}}. Please check in within 10 minutes. Reply STOP to opt out.",
    active: true,
  },
  {
    id: "2",
    name: "Position Update SMS",
    type: "sms",
    trigger: "position_update",
    message: "Hi {{customer_name}}! You're now #{{position}} on our waitlist. Estimated wait: {{estimated_wait}} minutes. Thanks for your patience!",
    active: true,
  },
  {
    id: "3",
    name: "Table Ready Email",
    type: "email",
    trigger: "table_ready",
    message: "Your table is ready! Please return to the host stand within 10 minutes to be seated.",
    active: false,
  },
];

// Mock settings
const mockSettings: WaitlistSettings = {
  max_party_size: 12,
  max_wait_time_minutes: 120,
  auto_remove_no_show_minutes: 15,
  sms_notifications_enabled: true,
  email_notifications_enabled: false,
  position_update_notifications: true,
  reminder_intervals: [5, 10, 15],
  estimated_wait_accuracy_target: 85,
};

const statusColors = {
  waiting: "bg-yellow-100 text-yellow-800",
  table_ready: "bg-green-100 text-green-800",
  notified: "bg-blue-100 text-blue-800",
  seated: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  vip: "bg-purple-100 text-purple-800",
};

const seatingPreferenceOptions: SeatingPreference[] = [
  "no_preference", "window", "booth", "bar", "patio", "private_room", "quiet_area", "high_top"
];

const WaitlistManagement: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(mockWaitlistEntries);
  const [notificationTemplates] = useState<NotificationTemplate[]>(mockNotificationTemplates);
  const [settings, setSettings] = useState<WaitlistSettings>(mockSettings);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  
  // Form states
  const [entryForm, setEntryForm] = useState<Partial<WaitlistEntry>>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    party_size: 2,
    seating_preference: "no_preference",
    special_requests: [],
    sms_notifications_enabled: true,
    email_notifications_enabled: false,
    notes: "",
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter waitlist entries
  const filteredEntries = useMemo(() => {
    return waitlistEntries.filter(entry => {
      const matchesSearch = 
        entry.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.customer_phone?.includes(searchTerm);
      
      const matchesStatus = (() => {
        switch (statusFilter) {
          case "active":
            return ["waiting", "table_ready", "notified"].includes(entry.status);
          case "completed":
            return ["seated", "cancelled", "no_show"].includes(entry.status);
          default:
            return entry.status === statusFilter || statusFilter === "all";
        }
      })();
      
      return matchesSearch && matchesStatus;
    });
  }, [waitlistEntries, searchTerm, statusFilter]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = waitlistEntries.filter(entry => 
      entry.created_at.startsWith(today)
    );
    
    const currentWaiting = waitlistEntries.filter(entry => 
      ["waiting", "table_ready", "notified"].includes(entry.status)
    ).length;
    
    const seatedToday = todayEntries.filter(entry => entry.status === "seated").length;
    const noShowsToday = todayEntries.filter(entry => entry.status === "no_show").length;
    
    const completedWithWaitTime = todayEntries.filter(entry => 
      entry.actual_wait_minutes !== undefined
    );
    
    const avgWaitTime = completedWithWaitTime.length > 0 ? 
      completedWithWaitTime.reduce((sum, entry) => sum + (entry.actual_wait_minutes || 0), 0) / completedWithWaitTime.length : 0;
    
    const longestWaitTime = Math.max(...completedWithWaitTime.map(entry => entry.actual_wait_minutes || 0), 0);

    return {
      total_entries: todayEntries.length,
      current_waiting: currentWaiting,
      average_wait_time: Math.round(avgWaitTime),
      longest_wait_time: longestWaitTime,
      seated_today: seatedToday,
      no_shows_today: noShowsToday,
      satisfaction_rate: 92, // Mock data
      notification_response_rate: 78, // Mock data
    };
  }, [waitlistEntries]);

  const calculateWaitTime = (joinedAt: string) => {
    const joined = new Date(joinedAt);
    const now = currentTime;
    return Math.floor((now.getTime() - joined.getTime()) / (1000 * 60));
  };

  const handleAddToWaitlist = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!entryForm.customer_name || !entryForm.party_size) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Calculate position (next in line)
      const activeEntries = waitlistEntries.filter(entry => 
        ["waiting", "table_ready", "notified"].includes(entry.status)
      );
      const nextPosition = activeEntries.length + 1;

      // Estimate wait time based on position and party size
      const estimatedWait = calculateEstimatedWaitTime(nextPosition, entryForm.party_size || 2);

      // Create new waitlist entry
      const newEntry: WaitlistEntry = {
        id: `waitlist-${Date.now()}`,
        tenant_id: tenant?.id || "",
        customer_name: entryForm.customer_name!,
        customer_phone: entryForm.customer_phone,
        customer_email: entryForm.customer_email,
        party_size: entryForm.party_size || 2,
        seating_preference: entryForm.seating_preference || "no_preference",
        special_requests: entryForm.special_requests || [],
        estimated_wait_minutes: estimatedWait,
        priority: determinePriority(entryForm),
        status: "waiting",
        position: nextPosition,
        joined_at: new Date().toISOString(),
        sms_notifications_enabled: entryForm.sms_notifications_enabled || false,
        email_notifications_enabled: entryForm.email_notifications_enabled || false,
        notification_count: 0,
        notes: entryForm.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setWaitlistEntries(prev => [...prev, newEntry]);
      setShowAddDialog(false);
      resetEntryForm();
      
      toast({
        title: "Success",
        description: `${newEntry.customer_name} added to waitlist (Position #${nextPosition})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to waitlist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (entryId: string, newStatus: WaitlistStatus) => {
    try {
      setWaitlistEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { 
              ...entry, 
              status: newStatus,
              ...(newStatus === "table_ready" ? { table_ready_at: new Date().toISOString() } : {}),
              ...(newStatus === "notified" ? { notified_at: new Date().toISOString() } : {}),
              ...(newStatus === "seated" ? { 
                seated_at: new Date().toISOString(),
                actual_wait_minutes: calculateWaitTime(entry.joined_at)
              } : {}),
              ...(newStatus === "no_show" ? { no_show_at: new Date().toISOString() } : {}),
              ...(newStatus === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
              updated_at: new Date().toISOString()
            }
          : entry
      ));
      
      // Update positions for remaining entries
      if (["seated", "cancelled", "no_show"].includes(newStatus)) {
        reorderWaitlist();
      }
      
      toast({
        title: "Success",
        description: `Status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async (entryId: string, type: "sms" | "email") => {
    try {
      const entry = waitlistEntries.find(e => e.id === entryId);
      if (!entry) return;

      // Update notification count and timestamp
      setWaitlistEntries(prev => prev.map(e => 
        e.id === entryId 
          ? { 
              ...e, 
              notification_count: e.notification_count + 1,
              last_notification_sent: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : e
      ));
      
      toast({
        title: "Notification Sent",
        description: `${type.toUpperCase()} notification sent to ${entry.customer_name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
  };

  const calculateEstimatedWaitTime = (position: number, partySize: number) => {
    // Base wait time calculation
    let baseTime = position * 15; // 15 minutes per position ahead
    
    // Adjust for party size (larger parties typically wait longer)
    if (partySize >= 6) baseTime += 10;
    else if (partySize >= 4) baseTime += 5;
    
    return Math.max(baseTime, 5); // Minimum 5 minute wait
  };

  const determinePriority = (entry: Partial<WaitlistEntry>): WaitlistPriority => {
    // Mock priority logic - in real implementation, this would consider customer history, etc.
    if (entry.party_size && entry.party_size >= 8) return "high";
    return "normal";
  };

  const reorderWaitlist = () => {
    setWaitlistEntries(prev => {
      const activeEntries = prev.filter(entry => 
        ["waiting", "table_ready", "notified"].includes(entry.status)
      );
      const inactiveEntries = prev.filter(entry => 
        !["waiting", "table_ready", "notified"].includes(entry.status)
      );
      
      // Reorder active entries by priority and join time
      const reordered = activeEntries
        .sort((a, b) => {
          // VIP priority first
          if (a.priority === "vip" && b.priority !== "vip") return -1;
          if (b.priority === "vip" && a.priority !== "vip") return 1;
          
          // Then by join time
          return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        })
        .map((entry, index) => ({ ...entry, position: index + 1 }));
      
      return [...reordered, ...inactiveEntries];
    });
  };

  const resetEntryForm = () => {
    setEntryForm({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      party_size: 2,
      seating_preference: "no_preference",
      special_requests: [],
      sms_notifications_enabled: true,
      email_notifications_enabled: false,
      notes: "",
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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
          <h1 className="text-3xl font-bold text-foreground">Waitlist Management</h1>
          <p className="text-muted-foreground">
            Real-time queue management with automated notifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Waitlist
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Waiting</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.current_waiting}</p>
              </div>
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.average_wait_time)}</p>
              </div>
              <Timer className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seated Today</p>
                <p className="text-2xl font-bold text-green-600">{analytics.seated_today}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{analytics.notification_response_rate}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="waitlist" className="space-y-6">
        <TabsList>
          <TabsTrigger value="waitlist">Current Waitlist</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="waitlist" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer name or phone..."
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
                    <SelectItem value="active">Active (Waiting)</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="table_ready">Table Ready</SelectItem>
                    <SelectItem value="notified">Notified</SelectItem>
                    <SelectItem value="seated">Seated</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Waitlist Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Waitlist Queue ({filteredEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEntries
                  .sort((a, b) => {
                    // Active entries first, sorted by position
                    if (["waiting", "table_ready", "notified"].includes(a.status) && 
                        !["waiting", "table_ready", "notified"].includes(b.status)) {
                      return -1;
                    }
                    if (!["waiting", "table_ready", "notified"].includes(a.status) && 
                        ["waiting", "table_ready", "notified"].includes(b.status)) {
                      return 1;
                    }
                    return a.position - b.position;
                  })
                  .map((entry, index) => {
                    const waitTime = calculateWaitTime(entry.joined_at);
                    const isActive = ["waiting", "table_ready", "notified"].includes(entry.status);
                    
                    return (
                      <Card key={entry.id} className={`relative ${
                        entry.status === "table_ready" ? "border-green-300 bg-green-50" : ""
                      } ${entry.priority === "vip" ? "border-purple-300" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isActive && (
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold">
                                  #{entry.position}
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-lg">{entry.customer_name}</h4>
                                  <Badge className={statusColors[entry.status]}>
                                    {entry.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge className={priorityColors[entry.priority]}>
                                    {entry.priority === "vip" && <Crown className="w-3 h-3 mr-1" />}
                                    {entry.priority}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{entry.party_size} guests</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{isActive ? `${waitTime}m waiting` : formatDuration(entry.actual_wait_minutes || waitTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Timer className="w-4 h-4" />
                                    <span>Est. {entry.estimated_wait_minutes}m</span>
                                  </div>
                                  {entry.customer_phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-4 h-4" />
                                      <span>{entry.customer_phone}</span>
                                    </div>
                                  )}
                                </div>

                                {entry.seating_preference !== "no_preference" && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      Prefers: {entry.seating_preference.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                )}

                                {entry.notes && (
                                  <p className="text-sm text-muted-foreground italic mt-1">
                                    "{entry.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {entry.status === "waiting" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(entry.id, "table_ready")}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Table Ready
                                </Button>
                              )}
                              
                              {entry.status === "table_ready" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(entry.id, "seated")}
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  Seat Now
                                </Button>
                              )}
                              
                              {entry.status === "notified" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(entry.id, "seated")}
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  Seat Now
                                </Button>
                              )}

                              {(entry.status === "table_ready" || entry.status === "waiting") && entry.sms_notifications_enabled && entry.customer_phone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendNotification(entry.id, "sms")}
                                >
                                  <Smartphone className="w-4 h-4" />
                                </Button>
                              )}

                              {isActive && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove from Waitlist</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove {entry.customer_name} from the waitlist?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleUpdateStatus(entry.id, "cancelled")}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                      <AlertDialogAction 
                                        onClick={() => handleUpdateStatus(entry.id, "no_show")}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Mark No Show
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>

                          {/* Notification status */}
                          {entry.notification_count > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Bell className="w-3 h-3" />
                                <span>
                                  {entry.notification_count} notification{entry.notification_count > 1 ? 's' : ''} sent
                                  {entry.last_notification_sent && (
                                    <span> (last: {new Date(entry.last_notification_sent).toLocaleTimeString()})</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                {filteredEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No waitlist entries found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Waitlist History</h3>
              <p className="text-muted-foreground">
                Historical waitlist data and trends will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Waitlist Analytics</h3>
              <p className="text-muted-foreground">
                Advanced analytics including wait time predictions, peak hour analysis, and customer satisfaction metrics.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add to Waitlist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
            <DialogDescription>
              Add a new customer to the waitlist with their preferences and contact information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={entryForm.customer_name}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, customer_name: e.target.value }))}
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
                  value={entryForm.party_size}
                  onChange={(e) => setEntryForm(prev => ({ 
                    ...prev, 
                    party_size: parseInt(e.target.value) || 1
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={entryForm.customer_phone}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={entryForm.customer_email}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="john.doe@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seating_preference">Seating Preference</Label>
              <Select
                value={entryForm.seating_preference}
                onValueChange={(value) => setEntryForm(prev => ({ 
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

            <div className="space-y-4">
              <Label>Notification Preferences</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={entryForm.sms_notifications_enabled}
                    onCheckedChange={(checked) => setEntryForm(prev => ({ 
                      ...prev, 
                      sms_notifications_enabled: checked 
                    }))}
                  />
                  <span className="text-sm">SMS notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={entryForm.email_notifications_enabled}
                    onCheckedChange={(checked) => setEntryForm(prev => ({ 
                      ...prev, 
                      email_notifications_enabled: checked 
                    }))}
                  />
                  <span className="text-sm">Email notifications</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Requests / Notes</Label>
              <Textarea
                id="notes"
                value={entryForm.notes}
                onChange={(e) => setEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests, accessibility needs, or notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToWaitlist}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitlistManagement;
