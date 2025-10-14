import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useCustomerManagement, Customer } from "@/hooks/useCustomerManagement";
import {
  Plus,
  User,
  Star,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Filter,
  Crown,
  Loader2,
  Eye,
  Award,
} from "lucide-react";

const CustomerProfiles: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  // Use real customer data from the hook
  const { 
    customers, 
    isLoading: customerLoading, 
    error: customerError,
    addCustomer,
    isAdding
  } = useCustomerManagement(tenant?.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form state adapted for real Customer type
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    preferences: [],
    allergies: [],
  });

  // Filter customers based on search and segment
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      const matchesSegment = (() => {
        switch (selectedSegment) {
          case "vip":
            return customer.customer_type === "vip";
          case "regular":
            return customer.customer_type === "regular";
          case "new":
            return customer.customer_type === "new";
          case "inactive":
            return customer.customer_type === "inactive";
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
    const vipCustomers = customers.filter(c => c.customer_type === "vip").length;
    const avgVisits = customers.length > 0 ? 
      customers.reduce((sum, c) => sum + c.total_visits, 0) / customers.length : 0;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const avgOrderValue = customers.length > 0 ?
      customers.reduce((sum, c) => sum + (c.total_spent / c.total_visits || 0), 0) / customers.length : 0;

    return {
      totalCustomers,
      vipCustomers,
      avgVisits: Math.round(avgVisits),
      totalRevenue,
      avgOrderValue: Math.round(avgOrderValue),
    };
  }, [customers]);

  const resetCustomerForm = () => {
    setCustomerForm({
      name: "",
      email: "",
      phone: "",
      preferences: [],
      allergies: [],
    });
  };

  const handleCreateCustomer = async () => {
    try {
      if (!customerForm.name) {
        toast({
          title: "Validation Error",
          description: "Please enter customer name",
          variant: "destructive",
        });
        return;
      }

      if (customerForm.email && customers.some(c => c.email === customerForm.email)) {
        toast({
          title: "Validation Error",
          description: "Customer with this email already exists",
          variant: "destructive",
        });
        return;
      }

      await addCustomer({
        name: customerForm.name!,
        email: customerForm.email || "",
        phone: customerForm.phone || undefined,
        preferences: customerForm.preferences || [],
        allergies: customerForm.allergies || [],
      });

      setShowCustomerDialog(false);
      resetCustomerForm();
      
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    }
  };

  const openDetailsDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "vip": return "bg-purple-100 text-purple-800 border-purple-200";
      case "regular": return "bg-blue-100 text-blue-800 border-blue-200";
      case "new": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (tenantLoading || customerLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (customerError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load customers</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your customers and build lasting relationships
          </p>
        </div>
        <Button onClick={() => setShowCustomerDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.vipCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalCustomers > 0 ? Math.round((analytics.vipCustomers / analytics.totalCustomers) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgVisits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSegment} onValueChange={setSelectedSegment}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="vip">VIP Customers</SelectItem>
            <SelectItem value="regular">Regular Customers</SelectItem>
            <SelectItem value="new">New Customers</SelectItem>
            <SelectItem value="inactive">Inactive Customers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No customers found</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openDetailsDialog(customer)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{customer.name}</h3>
                        <Badge className={getCustomerTypeColor(customer.customer_type)}>
                          {customer.customer_type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{customer.total_visits} visits</span>
                        <span>{formatCurrency(customer.total_spent)} spent</span>
                        <span>Last visit: {new Date(customer.last_visit).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer profile for your restaurant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={customerForm.name || ""}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerForm.email || ""}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={customerForm.phone || ""}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                    <Badge className={getCustomerTypeColor(selectedCustomer.customer_type)}>
                      {selectedCustomer.customer_type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Information</Label>
                    <div className="space-y-2 mt-2">
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Visit Statistics</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Visits:</span>
                        <span className="text-sm font-medium">{selectedCustomer.total_visits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Spent:</span>
                        <span className="text-sm font-medium">{formatCurrency(selectedCustomer.total_spent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Party Size:</span>
                        <span className="text-sm font-medium">{selectedCustomer.average_party_size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Visit:</span>
                        <span className="text-sm font-medium">{new Date(selectedCustomer.last_visit).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4">
                <div>
                  <Label>Dining Preferences</Label>
                  <div className="mt-2">
                    {selectedCustomer.preferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.preferences.map((pref, index) => (
                          <Badge key={index} variant="secondary">{pref}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No preferences recorded</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Allergies</Label>
                  <div className="mt-2">
                    {selectedCustomer.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive">{allergy}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No allergies recorded</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Special Occasions</Label>
                  <div className="mt-2">
                    {selectedCustomer.special_occasions && selectedCustomer.special_occasions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCustomer.special_occasions.map((occasion, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{occasion.type}: {new Date(occasion.date).toLocaleDateString()}</span>
                            {occasion.notes && <span className="text-sm text-muted-foreground">({occasion.notes})</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No special occasions recorded</p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="loyalty" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Loyalty Points</Label>
                    <div className="text-2xl font-bold">{selectedCustomer.loyalty_points}</div>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
                
                <Separator />
                
                <div>
                  <Label>Customer Since</Label>
                  <p className="text-sm text-muted-foreground">First visit data not available</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerProfiles;
