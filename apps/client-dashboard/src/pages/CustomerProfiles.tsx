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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Edit,
  Trash2,
  User,
  Star,
  Gift,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Search,
  Filter,
  Crown,
  Cake,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  History,
  Loader2,
  Eye,
  Send,
  Award,
} from "lucide-react";
import {
  Customer,
  LoyaltyProgram,
  LoyaltyTransaction,
  DietaryRestriction,
} from "@/types/restaurant";

// Mock data for customers
const mockCustomers: Customer[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice.johnson@email.com",
    phone: "(555) 123-4567",
    birthday: "1990-03-15",
    dietary_restrictions: ["vegetarian"],
    allergies: ["nuts"],
    preferences: "Likes spicy food, prefers window seating",
    total_visits: 47,
    total_spent: 142850, // $1,428.50
    avg_order_value: 3038, // $30.38
    last_visit: "2024-09-02",
    loyalty_points: 2856,
    vip_status: true,
    marketing_consent: true,
    notes: "Regular customer, always orders the signature pasta",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-09-02T19:30:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    first_name: "Bob",
    last_name: "Smith",
    email: "bob.smith@email.com",
    phone: "(555) 234-5678",
    birthday: "1985-07-22",
    dietary_restrictions: [],
    allergies: [],
    preferences: "Loves steaks, prefers booth seating",
    total_visits: 23,
    total_spent: 89200, // $892.00
    avg_order_value: 3878, // $38.78
    last_visit: "2024-08-28",
    loyalty_points: 1784,
    vip_status: false,
    marketing_consent: true,
    created_at: "2024-03-01T00:00:00Z",
    updated_at: "2024-08-28T20:15:00Z",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    first_name: "Carol",
    last_name: "Davis",
    email: "carol.davis@email.com",
    phone: "(555) 345-6789",
    birthday: "1992-11-08",
    dietary_restrictions: ["gluten_free", "dairy_free"],
    allergies: ["shellfish"],
    preferences: "Always asks for gluten-free options",
    total_visits: 15,
    total_spent: 38750, // $387.50
    avg_order_value: 2583, // $25.83
    last_visit: "2024-09-01",
    loyalty_points: 775,
    vip_status: false,
    marketing_consent: false,
    notes: "Very careful about cross-contamination",
    created_at: "2024-05-10T00:00:00Z",
    updated_at: "2024-09-01T18:45:00Z",
  },
];

// Mock loyalty program
const mockLoyaltyProgram: LoyaltyProgram = {
  id: "1",
  tenant_id: "tenant-1",
  name: "Blunari Rewards",
  description: "Earn points with every visit and unlock exclusive rewards",
  points_per_dollar: 10, // 10 points per $1 spent
  dollars_per_point: 0.01, // 1 point = $0.01
  welcome_bonus: 500,
  birthday_bonus: 250,
  referral_bonus: 1000,
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Mock loyalty transactions
const mockLoyaltyTransactions: LoyaltyTransaction[] = [
  {
    id: "1",
    customer_id: "1",
    order_id: "order-123",
    transaction_type: "earned",
    points: 304,
    description: "Points earned from order #123",
    created_at: "2024-09-02T19:30:00Z",
  },
  {
    id: "2",
    customer_id: "1",
    transaction_type: "bonus",
    points: 250,
    description: "Birthday bonus points",
    created_at: "2024-03-15T00:00:00Z",
  },
  {
    id: "3",
    customer_id: "1",
    transaction_type: "redeemed",
    points: -500,
    description: "Redeemed for $5 off",
    created_at: "2024-08-15T12:00:00Z",
  },
];

const dietaryRestrictionOptions: DietaryRestriction[] = [
  "vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "kosher", "halal", "keto", "paleo"
];

const dietaryColors = {
  vegetarian: "bg-green-100 text-green-800",
  vegan: "bg-emerald-100 text-emerald-800",
  gluten_free: "bg-yellow-100 text-yellow-800",
  dairy_free: "bg-blue-100 text-blue-800",
  nut_free: "bg-red-100 text-red-800",
  kosher: "bg-purple-100 text-purple-800",
  halal: "bg-indigo-100 text-indigo-800",
  keto: "bg-orange-100 text-orange-800",
  paleo: "bg-amber-100 text-amber-800",
};

const CustomerProfiles: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [loyaltyProgram] = useState<LoyaltyProgram>(mockLoyaltyProgram);
  const [loyaltyTransactions] = useState<LoyaltyTransaction[]>(mockLoyaltyTransactions);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form states
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birthday: "",
    dietary_restrictions: [],
    allergies: [],
    preferences: "",
    marketing_consent: true,
    notes: "",
  });

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      const matchesSegment = (() => {
        switch (selectedSegment) {
          case "vip":
            return customer.vip_status;
          case "frequent":
            return customer.total_visits >= 20;
          case "recent":
            const lastVisit = new Date(customer.last_visit || 0);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return lastVisit >= thirtyDaysAgo;
          case "birthday":
            if (!customer.birthday) return false;
            const birthday = new Date(customer.birthday);
            const today = new Date();
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const thisBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
            return thisBirthday >= today && thisBirthday <= nextWeek;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesSegment;
    });
  }, [customers, searchTerm, selectedSegment]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalCustomers = customers.length;
    const vipCustomers = customers.filter(c => c.vip_status).length;
    const avgVisits = customers.length > 0 ? 
      customers.reduce((sum, c) => sum + c.total_visits, 0) / customers.length : 0;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const avgOrderValue = customers.length > 0 ?
      customers.reduce((sum, c) => sum + c.avg_order_value, 0) / customers.length : 0;
    
    const upcomingBirthdays = customers.filter(customer => {
      if (!customer.birthday) return false;
      const birthday = new Date(customer.birthday);
      const today = new Date();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const thisBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      return thisBirthday >= today && thisBirthday <= nextWeek;
    }).length;

    return {
      totalCustomers,
      vipCustomers,
      avgVisits: Math.round(avgVisits),
      totalRevenue,
      avgOrderValue: Math.round(avgOrderValue),
      upcomingBirthdays,
    };
  }, [customers]);

  // Get customer loyalty transactions
  const getCustomerTransactions = (customerId: string) => {
    return loyaltyTransactions.filter(t => t.customer_id === customerId);
  };

  const handleCreateCustomer = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!customerForm.first_name || !customerForm.last_name) {
        toast({
          title: "Validation Error",
          description: "Please fill in required fields",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate email/phone
      if (customerForm.email && customers.some(c => c.email === customerForm.email)) {
        toast({
          title: "Validation Error",
          description: "Customer with this email already exists",
          variant: "destructive",
        });
        return;
      }

      // Create new customer
      const newCustomer: Customer = {
        id: `customer-${Date.now()}`,
        tenant_id: tenant?.id || "",
        first_name: customerForm.first_name!,
        last_name: customerForm.last_name!,
        email: customerForm.email || undefined,
        phone: customerForm.phone || undefined,
        birthday: customerForm.birthday || undefined,
        dietary_restrictions: customerForm.dietary_restrictions || [],
        allergies: customerForm.allergies || [],
        preferences: customerForm.preferences || "",
        total_visits: 0,
        total_spent: 0,
        avg_order_value: 0,
        loyalty_points: loyaltyProgram.welcome_bonus,
        vip_status: false,
        marketing_consent: customerForm.marketing_consent || false,
        notes: customerForm.notes || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCustomers(prev => [...prev, newCustomer]);
      setShowCustomerDialog(false);
      resetCustomerForm();
      
      toast({
        title: "Success",
        description: `Customer created with ${loyaltyProgram.welcome_bonus} welcome bonus points`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      setIsLoading(true);
      
      const updatedCustomer: Customer = {
        ...editingCustomer,
        first_name: customerForm.first_name!,
        last_name: customerForm.last_name!,
        email: customerForm.email || undefined,
        phone: customerForm.phone || undefined,
        birthday: customerForm.birthday || undefined,
        dietary_restrictions: customerForm.dietary_restrictions || [],
        allergies: customerForm.allergies || [],
        preferences: customerForm.preferences || "",
        marketing_consent: customerForm.marketing_consent || false,
        notes: customerForm.notes || "",
        updated_at: new Date().toISOString(),
      };

      setCustomers(prev => prev.map(customer => 
        customer.id === editingCustomer.id ? updatedCustomer : customer
      ));
      
      setShowCustomerDialog(false);
      setEditingCustomer(null);
      resetCustomerForm();
      
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const handleToggleVipStatus = async (customerId: string) => {
    try {
      setCustomers(prev => prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, vip_status: !customer.vip_status, updated_at: new Date().toISOString() }
          : customer
      ));
      
      const customer = customers.find(c => c.id === customerId);
      toast({
        title: "Success",
        description: `${customer?.first_name} ${customer?.last_name} ${customer?.vip_status ? 'removed from' : 'added to'} VIP status`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update VIP status",
        variant: "destructive",
      });
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      birthday: "",
      dietary_restrictions: [],
      allergies: [],
      preferences: "",
      marketing_consent: true,
      notes: "",
    });
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      birthday: customer.birthday,
      dietary_restrictions: customer.dietary_restrictions,
      allergies: customer.allergies,
      preferences: customer.preferences,
      marketing_consent: customer.marketing_consent,
      notes: customer.notes,
    });
    setShowCustomerDialog(true);
  };

  const openDetailsDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const getCustomerTier = (customer: Customer) => {
    if (customer.vip_status) return "VIP";
    if (customer.total_visits >= 50) return "Platinum";
    if (customer.total_visits >= 25) return "Gold";
    if (customer.total_visits >= 10) return "Silver";
    return "Bronze";
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "VIP": return "bg-purple-100 text-purple-800";
      case "Platinum": return "bg-gray-100 text-gray-800";
      case "Gold": return "bg-yellow-100 text-yellow-800";
      case "Silver": return "bg-gray-100 text-gray-600";
      default: return "bg-amber-100 text-amber-800";
    }
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
          <h1 className="text-3xl font-bold text-foreground">Customer Profiles</h1>
          <p className="text-muted-foreground">
            Manage customer relationships and loyalty program
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button onClick={() => setShowCustomerDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
              </div>
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP Members</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.vipCustomers}</p>
              </div>
              <Crown className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Visits</p>
                <p className="text-2xl font-bold">{analytics.avgVisits}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.avgOrderValue)}</p>
              </div>
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Birthdays</p>
                <p className="text-2xl font-bold text-pink-600">{analytics.upcomingBirthdays}</p>
              </div>
              <Cake className="w-6 h-6 text-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="vip">VIP Members</SelectItem>
                    <SelectItem value="frequent">Frequent Visitors (20+)</SelectItem>
                    <SelectItem value="recent">Recent Visitors</SelectItem>
                    <SelectItem value="birthday">Upcoming Birthdays</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Directory ({filteredCustomers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCustomers.map(customer => (
                  <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1" onClick={() => openDetailsDialog(customer)}>
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="text-lg">
                              {customer.first_name[0]}{customer.last_name[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-lg">
                                {customer.first_name} {customer.last_name}
                              </h4>
                              <Badge className={getTierColor(getCustomerTier(customer))}>
                                {getCustomerTier(customer)}
                              </Badge>
                              {customer.vip_status && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Crown className="w-3 h-3 mr-1" />
                                  VIP
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{customer.email || "No email"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                <span>{customer.phone || "No phone"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>{customer.total_visits} visits</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{formatCurrency(customer.total_spent)} spent</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              {customer.dietary_restrictions.map(restriction => (
                                <Badge key={restriction} className={`text-xs ${dietaryColors[restriction]}`}>
                                  {restriction.replace('_', ' ')}
                                </Badge>
                              ))}
                              {customer.loyalty_points > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Award className="w-3 h-3 mr-1" />
                                  {customer.loyalty_points} pts
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVipStatus(customer.id);
                            }}
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(customer);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {customer.first_name} {customer.last_name}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6">
          {/* Loyalty Program Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                {loyaltyProgram.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{loyaltyProgram.description}</p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{loyaltyProgram.points_per_dollar}</p>
                  <p className="text-sm text-muted-foreground">Points per $1</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{loyaltyProgram.welcome_bonus}</p>
                  <p className="text-sm text-muted-foreground">Welcome Bonus</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{loyaltyProgram.birthday_bonus}</p>
                  <p className="text-sm text-muted-foreground">Birthday Bonus</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{loyaltyProgram.referral_bonus}</p>
                  <p className="text-sm text-muted-foreground">Referral Bonus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Customer Segmentation</h3>
              <p className="text-muted-foreground">
                Advanced customer segmentation and marketing tools coming soon. 
                Create targeted campaigns based on customer behavior and preferences.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>
                  {selectedCustomer?.first_name[0]}{selectedCustomer?.last_name[0]}
                </AvatarFallback>
              </Avatar>
              {selectedCustomer?.first_name} {selectedCustomer?.last_name}
              {selectedCustomer?.vip_status && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{selectedCustomer.total_visits}</p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedCustomer.total_spent)}</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">{selectedCustomer.loyalty_points}</p>
                  <p className="text-sm text-muted-foreground">Loyalty Points</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedCustomer.avg_order_value)}</p>
                  <p className="text-sm text-muted-foreground">Avg Order</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{selectedCustomer.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{selectedCustomer.phone || "No phone"}</span>
                    </div>
                    {selectedCustomer.birthday && (
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4" />
                        <span>{formatDate(selectedCustomer.birthday)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Preferences & Restrictions</h4>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.dietary_restrictions.map(restriction => (
                        <Badge key={restriction} className={`text-xs ${dietaryColors[restriction]}`}>
                          {restriction.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                    {selectedCustomer.allergies.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Allergies: </span>
                        <span className="text-sm text-red-600">{selectedCustomer.allergies.join(", ")}</span>
                      </div>
                    )}
                    {selectedCustomer.preferences && (
                      <div>
                        <span className="text-sm font-medium">Preferences: </span>
                        <span className="text-sm">{selectedCustomer.preferences}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Recent Loyalty Activity</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getCustomerTransactions(selectedCustomer.id).map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm">{transaction.description}</span>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                      </div>
                      <Badge variant={transaction.points > 0 ? "default" : "secondary"}>
                        {transaction.points > 0 ? "+" : ""}{transaction.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Notes</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer information" : "Create a new customer profile"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={customerForm.first_name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={customerForm.last_name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={customerForm.birthday}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, birthday: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Marketing Consent</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={customerForm.marketing_consent}
                    onCheckedChange={(checked) => setCustomerForm(prev => ({ ...prev, marketing_consent: checked }))}
                  />
                  <span className="text-sm">Allow marketing communications</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryRestrictionOptions.map(restriction => (
                  <Badge
                    key={restriction}
                    variant={customerForm.dietary_restrictions?.includes(restriction) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = customerForm.dietary_restrictions || [];
                      const updated = current.includes(restriction)
                        ? current.filter(r => r !== restriction)
                        : [...current, restriction];
                      setCustomerForm(prev => ({ ...prev, dietary_restrictions: updated }));
                    }}
                  >
                    {restriction.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (comma-separated)</Label>
              <Input
                id="allergies"
                value={customerForm.allergies?.join(", ") || ""}
                onChange={(e) => setCustomerForm(prev => ({ 
                  ...prev, 
                  allergies: e.target.value.split(",").map(a => a.trim()).filter(a => a)
                }))}
                placeholder="nuts, shellfish, dairy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferences">Preferences</Label>
              <Textarea
                id="preferences"
                value={customerForm.preferences}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, preferences: e.target.value }))}
                placeholder="Likes spicy food, prefers window seating..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={customerForm.notes}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this customer..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCustomer ? "Update Customer" : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerProfiles;
