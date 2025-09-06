import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Ticket,
  Search,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  UserCheck,
  Calendar,
  RefreshCw,
  Loader2,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupportTicketDetail } from "@/components/support/SupportTicketDetail";
import { debounce } from "lodash";
import { testSupportTicketConnection, createTestTicket } from "@/utils/testSupport";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
  assigned_to?: string;
  category: {
    name: string;
    color: string;
  } | null;
  tenant?: {
    name: string;
  } | null;
  assignee?: {
    id: string;
    user_id: string;
  } | null;
  _count?: {
    messages: number;
  };
}

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ---------- Data Loading ----------
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Loading tickets with filters:", { statusFilter, priorityFilter, searchQuery });

      let query = supabase
        .from("support_tickets")
        .select(
          `*,
          category:support_categories!category_id(name,color),
          tenant:tenants!tenant_id(name),
          assignee:employees!assigned_to(id,user_id)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
      if (searchQuery) {
        // use ilike across common text columns
        query = query.or(
          `subject.ilike.%${searchQuery}%,ticket_number.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      console.log("Loaded tickets:", data?.length || 0);
      setTickets((data as any) || []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading tickets:", err);
      const errorMessage = err?.message || "Failed to load support tickets";
      setError(errorMessage);
      setTickets([]);
      toast({
        title: "Error",
        description: `${errorMessage}. Please try refreshing the page.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, searchQuery, statusFilter, toast]);

  const debouncedLoadTickets = useCallback(debounce(loadTickets, 300), [loadTickets]);

  useEffect(() => {
    debouncedLoadTickets();
    return () => debouncedLoadTickets.cancel();
  }, [debouncedLoadTickets, statusFilter, priorityFilter, searchQuery]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("support-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => loadTickets()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTickets]);

  const refreshTickets = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
    toast({ title: "Refreshed", description: "Support tickets updated" });
  };

  const handleRefresh = () => {
    setError(null);
    refreshTickets();
  };

  const handleTestConnection = async () => {
    try {
      const result = await testSupportTicketConnection();
      if (result.success) {
        toast({
          title: "Database Connection Test",
          description: `✅ Connection successful! Found ${result.data.categories} categories, ${result.data.tickets} tickets, ${result.data.tenants} tenants`,
        });
      } else {
        toast({
          title: "Database Connection Test",
          description: `❌ Connection failed: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Database Connection Test",
        description: `❌ Test failed: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateTestTicket = async () => {
    try {
      const result = await createTestTicket();
      if (result.success) {
        toast({
          title: "Test Ticket Created",
          description: `✅ Test ticket ${result.ticketNumber} created successfully!`,
        });
        // Refresh tickets to show the new test ticket
        loadTickets();
      } else {
        toast({
          title: "Test Ticket Creation Failed",
          description: `❌ Failed to create test ticket: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Ticket Creation Failed",
        description: `❌ Test failed: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // ---------- UI helpers ----------
  const getPriorityColor = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "waiting_customer":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "waiting_customer":
        return <User className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    waiting_customer: tickets.filter((t) => t.status === "waiting_customer").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Support Tickets
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Manage and respond to customer support requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                className="flex items-center gap-2 hover:bg-accent"
              >
                🔧 Test DB
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestTicket}
                className="flex items-center gap-2 hover:bg-accent"
              >
                🧪 Test Create
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 hover:bg-accent"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                    <Plus className="h-4 w-4" />
                    Create Ticket
                  </Button>
                </DialogTrigger>
                <CreateTicketForm
                  onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    loadTickets();
                  }}
                />
              </Dialog>
            </div>
          </div>
          {/* Keyboard Shortcuts */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd>
              <span>Search</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+N</kbd>
              <span>Create</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">R</kbd>
              <span>Refresh</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Tickets" icon={<Ticket className="h-4 w-4 text-primary" />} value={stats.total} hint="All time" />
          <StatCard title="Open" icon={<AlertCircle className="h-4 w-4 text-blue-600" />} value={stats.open} hint="Need attention" valueClass="text-blue-600" iconBg="bg-blue-100" />
          <StatCard title="In Progress" icon={<Clock className="h-4 w-4 text-purple-600" />} value={stats.in_progress} hint="Being worked on" valueClass="text-purple-600" iconBg="bg-purple-100" />
          <StatCard title="Waiting" icon={<User className="h-4 w-4 text-amber-600" />} value={stats.waiting_customer} hint="Customer response" valueClass="text-amber-600" iconBg="bg-amber-100" />
          <StatCard title="Resolved" icon={<CheckCircle className="h-4 w-4 text-green-600" />} value={stats.resolved} hint="Completed" valueClass="text-green-600" iconBg="bg-green-100" />
          <StatCard title="Urgent" icon={<AlertCircle className="h-4 w-4 text-red-600" />} value={stats.urgent} hint="High priority" valueClass="text-red-600" iconBg="bg-red-100" />
        </div>

        {/* Tickets Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>
                  Manage customer support tickets and requests
                </CardDescription>
              </div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ticket-search"
                    placeholder="Search tickets... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Meta Row */}
            {!loading && (
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">
                  {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
                  {(searchQuery || statusFilter !== "all" || priorityFilter !== "all") && (
                    <span className="ml-1">(filtered)</span>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 bg-green-500 rounded-full" /> Live updates enabled
                </div>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load tickets</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your filters or search terms"
                    : "No support tickets have been submitted yet"}
                </p>
                {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Ticket
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="group border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority.toUpperCase()}</Badge>
                          <Badge className={getStatusColor(ticket.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              <span className="hidden sm:inline">{ticket.status.replace("_", " ").toUpperCase()}</span>
                              <span className="sm:hidden">{ticket.status === "in_progress" ? "IN PROGRESS" : ticket.status.toUpperCase()}</span>
                            </div>
                          </Badge>
                          {ticket.category && (
                            <Badge variant="outline" style={{ borderColor: ticket.category.color }}>
                              {ticket.category.name}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.description}</p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{ticket.contact_name}</span>
                          </div>
                          {ticket.tenant?.name && (
                            <div className="flex items-center gap-1">
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">{ticket.tenant.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(ticket.created_at)}
                          </div>
                          {ticket.assignee && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              <span className="hidden sm:inline">Assigned</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View ticket</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Dialog */}
        {selectedTicket && (
          <SupportTicketDetail
            ticketId={selectedTicket}
            open={!!selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdate={loadTickets}
          />)
        }
      </div>
    </div>
  );
};

// ---------- Small components ----------
const StatCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  value: number | string;
  hint?: string;
  valueClass?: string;
  iconBg?: string;
}> = ({ title, icon, value, hint, valueClass = "", iconBg = "bg-primary/10" }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`h-8 w-8 ${iconBg} rounded-full flex items-center justify-center`}>{icon}</div>
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${valueClass}`}>{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

// ---------- Create Ticket Form ----------
interface CreateTicketFormProps {
  onSuccess: () => void;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    tenant_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantsRes, categoriesRes] = await Promise.all([
          supabase.from("tenants").select("id,name").order("name"),
          supabase.from("support_categories").select("id,name").order("name"),
        ]);
        if (tenantsRes.data) setTenants(tenantsRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.description || !formData.contact_name || !formData.contact_email) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email)) {
      toast({ title: "Validation Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      console.log("Creating support ticket with data:", formData);
      
      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
      
      const ticketData = {
        ticket_number: ticketNumber,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: "open" as const,
        contact_name: formData.contact_name.trim(),
        contact_email: formData.contact_email.trim().toLowerCase(),
        contact_phone: formData.contact_phone?.trim() || null,
        tenant_id: formData.tenant_id || null,
        category_id: formData.category_id || null,
        source: "web" as const,
      };

      console.log("Inserting ticket data:", ticketData);

      const { data, error } = await supabase
        .from("support_tickets")
        .insert(ticketData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Ticket created successfully:", data);
      
      toast({ 
        title: "Success", 
        description: `Ticket ${ticketNumber} created successfully`,
      });

      // Reset form
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      
      let errorMessage = "Failed to create support ticket";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setFormData({
      subject: "",
      description: "",
      priority: "medium",
      category_id: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      tenant_id: "",
    });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Create Support Ticket</DialogTitle>
        <DialogDescription>Capture the details below to open a new ticket.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name *</Label>
            <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData((p) => ({ ...p, contact_name: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email *</Label>
            <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData((p) => ({ ...p, contact_email: e.target.value }))} required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant_id">Tenant</Label>
            <Select value={formData.tenant_id} onValueChange={(value) => setFormData((p) => ({ ...p, tenant_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant (optional)" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input id="subject" value={formData.subject} onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={4} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData((p) => ({ ...p, priority: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData((p) => ({ ...p, category_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={resetForm}>
            Reset
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};

export default SupportPage;
