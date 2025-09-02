import React, { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  FileText,
  Package,
  ChefHat,
  Star,
  Eye,
  X,
  DollarSign,
  Loader2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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

import { useCateringPackages } from "@/hooks/useCateringPackages";
import { useCateringOrders } from "@/hooks/useCateringOrders";
import { useCateringAnalytics } from "@/hooks/useCateringAnalytics";
import { useTenant } from "@/hooks/useTenant";
import { CateringSampleDataSeeder } from "@/components/dev/CateringSampleDataSeeder";

import type {
  CateringPackage,
  CateringOrder,
  CreateCateringOrderRequest,
  CateringServiceType,
} from "@/types/catering";

import {
  CATERING_SERVICE_TYPE_LABELS,
  CATERING_STATUS_COLORS,
} from "@/types/catering";

export default function CateringPage() {
  // Get tenant context
  const { tenant, isLoading: tenantLoading } = useTenant();

  // State management
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPackage, setSelectedPackage] =
    useState<CateringPackage | null>(null);
  const [showOrderDetails, setShowOrderDetails] =
    useState<CateringOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<
    CateringServiceType | "all"
  >("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  // Hooks - using real data with tenant context
  const {
    packages,
    isLoading: packagesLoading,
    error: packagesError,
  } = useCateringPackages(tenant?.id);
  const {
    orders,
    isLoading: ordersLoading,
    createOrder,
    cancelOrder,
    isCreating,
    isCancelling,
    error: ordersError,
  } = useCateringOrders(tenant?.id);
  const { analytics, isLoading: analyticsLoading } = useCateringAnalytics(
    tenant?.id,
  );

  // Form state
  const [orderForm, setOrderForm] = useState<
    Partial<CreateCateringOrderRequest>
  >({
    event_date: "",
    event_start_time: "",
    guest_count: 50,
    service_type: "drop_off",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    venue_name: "",
    venue_address: "",
    special_instructions: "",
    dietary_requirements: [],
  });

  // Computed values
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        !searchQuery ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Since CateringPackage doesn't have service_types array, we'll remove the service type filtering for now
      // In a real implementation, you might have a many-to-many relationship between packages and service types

      return matchesSearch;
    });
  }, [packages, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return orderStatusFilter === "all" || order.status === orderStatusFilter;
    });
  }, [orders, orderStatusFilter]);

  const upcomingOrders = useMemo(() => {
    const now = new Date();
    return orders
      .filter(
        (order) =>
          ["confirmed", "in_progress"].includes(order.status) &&
          new Date(order.event_date) >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      );
  }, [orders]);

  // Utility functions
  const formatCurrencyDisplay = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Event handlers
  const handlePackageSelect = (pkg: CateringPackage) => {
    setSelectedPackage(pkg);
    setOrderForm((prev) => ({
      ...prev,
      package_id: pkg.id,
      // Set a default service type since packages don't have service_types array
      service_type: "drop_off",
    }));
    setShowOrderForm(true);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedPackage ||
      !orderForm.event_date ||
      !orderForm.contact_name ||
      !orderForm.contact_email ||
      !tenant
    ) {
      return;
    }

    try {
      const orderData: CreateCateringOrderRequest = {
        package_id: selectedPackage.id,
        event_name: orderForm.event_name || `${selectedPackage.name} Event`,
        event_date: orderForm.event_date!,
        event_start_time: orderForm.event_start_time || "12:00",
        guest_count: orderForm.guest_count!,
        service_type: orderForm.service_type!,
        contact_name: orderForm.contact_name!,
        contact_email: orderForm.contact_email!,
        contact_phone: orderForm.contact_phone,
        venue_name: orderForm.venue_name,
        venue_address: orderForm.venue_address,
        special_instructions: orderForm.special_instructions,
        dietary_requirements: orderForm.dietary_requirements || [],
      };

      await createOrder(orderData);
      setShowOrderForm(false);
      setSelectedPackage(null);
      setOrderForm({
        event_date: "",
        event_start_time: "",
        guest_count: 50,
        service_type: "drop_off",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        venue_name: "",
        venue_address: "",
        special_instructions: "",
        dietary_requirements: [],
      });
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    await cancelOrder(orderId);
    setShowOrderDetails(null);
  };

  // Show loading state while tenant is loading
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading catering services...</span>
        </div>
      </div>
    );
  }

  // Show error if no tenant found
  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Tenant not found</h2>
          <p className="text-muted-foreground">
            Unable to load restaurant information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Catering Services</h1>
          <p className="text-muted-foreground">
            Professional catering for your special events
          </p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{tenant.name}</div>
          <div className="text-muted-foreground text-sm">
            Catering Dashboard
          </div>
        </div>
      </div>

      {/* Development Tools - Remove in production */}
      {process.env.NODE_ENV === "development" && <CateringSampleDataSeeder />}

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="packages">Browse Packages</TabsTrigger>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={serviceTypeFilter}
              onValueChange={(value) => setServiceTypeFilter(value as any)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Service Types</SelectItem>
                <SelectItem value="pickup">Customer Pickup</SelectItem>
                <SelectItem value="delivery">Delivery Only</SelectItem>
                <SelectItem value="drop_off">Drop-off Service</SelectItem>
                <SelectItem value="full_service">
                  Full Service with Staff
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Packages Grid */}
          {filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg) => (
                <Card key={pkg.id} className="relative overflow-hidden">
                  {pkg.popular && (
                    <Badge className="absolute top-4 right-4 bg-yellow-500 text-yellow-900 z-10">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}

                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{pkg.name}</span>
                      <span className="text-primary font-bold text-sm">
                        {formatCurrencyDisplay(pkg.price_per_person)}/person
                      </span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {pkg.min_guests}-{pkg.max_guests} guests
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">
                        Included Services:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {pkg.includes_setup && (
                          <Badge variant="outline" className="text-xs">
                            Setup
                          </Badge>
                        )}
                        {pkg.includes_service && (
                          <Badge variant="outline" className="text-xs">
                            Service
                          </Badge>
                        )}
                        {pkg.includes_cleanup && (
                          <Badge variant="outline" className="text-xs">
                            Cleanup
                          </Badge>
                        )}
                      </div>
                    </div>

                    {pkg.dietary_accommodations &&
                      pkg.dietary_accommodations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">
                            Dietary Options:
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {pkg.dietary_accommodations.map((diet) => (
                              <Badge
                                key={diet}
                                variant="secondary"
                                className="text-xs"
                              >
                                {diet.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    <Button
                      onClick={() => handlePackageSelect(pkg)}
                      className="w-full"
                    >
                      Select Package
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No packages found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Catering Orders</CardTitle>
              <CardDescription>
                Track and manage your catering orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by browsing our catering packages
                </p>
                <Button onClick={() => {}}>Browse Packages</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Events Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
              <p className="text-muted-foreground">
                Your confirmed catering events will appear here
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  0% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Order
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">Avg 0 guests</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Form Dialog */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Catering Quote</DialogTitle>
            {selectedPackage && (
              <p className="text-muted-foreground">
                Package: {selectedPackage.name} -{" "}
                {formatCurrencyDisplay(selectedPackage.price_per_person)}/person
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleOrderSubmit} className="space-y-6">
            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Event Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event_name">Event Name</Label>
                  <Input
                    id="event_name"
                    value={orderForm.event_name || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        event_name: e.target.value,
                      }))
                    }
                    placeholder="Birthday Party, Corporate Event, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="guest_count">Guest Count *</Label>
                  <Input
                    id="guest_count"
                    type="number"
                    value={orderForm.guest_count || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        guest_count: parseInt(e.target.value),
                      }))
                    }
                    min={selectedPackage?.min_guests}
                    max={selectedPackage?.max_guests}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select
                    value={orderForm.service_type}
                    onValueChange={(value) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        service_type: value as CateringServiceType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Customer Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery Only</SelectItem>
                      <SelectItem value="drop_off">Drop-off Service</SelectItem>
                      <SelectItem value="full_service">
                        Full Service with Staff
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="event_date">Event Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={orderForm.event_date}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        event_date: e.target.value,
                      }))
                    }
                    min={format(addDays(new Date(), 3), "yyyy-MM-dd")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="event_start_time">Start Time</Label>
                  <Input
                    id="event_start_time"
                    type="time"
                    value={orderForm.event_start_time}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        event_start_time: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Name *</Label>
                  <Input
                    id="contact_name"
                    value={orderForm.contact_name}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        contact_name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={orderForm.contact_phone || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        contact_phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={orderForm.contact_email}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        contact_email: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Venue Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Venue Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue_name">Venue Name</Label>
                  <Input
                    id="venue_name"
                    value={orderForm.venue_name || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        venue_name: e.target.value,
                      }))
                    }
                    placeholder="Event venue or location name"
                  />
                </div>
                <div>
                  <Label htmlFor="venue_address">Venue Address</Label>
                  <Input
                    id="venue_address"
                    value={orderForm.venue_address || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        venue_address: e.target.value,
                      }))
                    }
                    placeholder="Full address where event will be held"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="special_instructions">
                    Special Instructions
                  </Label>
                  <Textarea
                    id="special_instructions"
                    value={orderForm.special_instructions || ""}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        special_instructions: e.target.value,
                      }))
                    }
                    placeholder="Any special requests, dietary restrictions, setup requirements, etc."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOrderForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <FileText className="h-4 w-4 mr-2" />
                Request Quote
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
