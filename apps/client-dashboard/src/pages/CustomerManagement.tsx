import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/hooks/useTenant";
import { useCustomerManagement, Customer } from "@/hooks/useCustomerManagement";
import PageHeader from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state";
import {
  SkeletonList,
  SkeletonMetricsCard,
} from "@/components/ui/skeleton-components";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  Star,
  MapPin,
  Gift,
  AlertTriangle,
  Plus,
  UserPlus,
} from "lucide-react";

const CustomerManagement: React.FC = () => {
  const { tenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerType, setSelectedCustomerType] =
    useState<string>("all");

  // Fetch real customer data from database
  const { customers, isLoading, addCustomer } = useCustomerManagement(
    tenant?.id,
  );

  // Filter customers based on search and type
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm));

    const matchesType =
      selectedCustomerType === "all" ||
      customer.customer_type === selectedCustomerType;

    return matchesSearch && matchesType;
  });

  // Customer statistics
  const customerStats = {
    total: customers.length,
    new: customers.filter((c) => c.customer_type === "new").length,
    regular: customers.filter((c) => c.customer_type === "regular").length,
    vip: customers.filter((c) => c.customer_type === "vip").length,
    inactive: customers.filter((c) => c.customer_type === "inactive").length,
    total_revenue: customers.reduce((sum, c) => sum + c.total_spent, 0),
    average_spend:
      customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length,
  };

  const getCustomerTypeColor = (type: Customer["customer_type"]) => {
    switch (type) {
      case "vip":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white";
      case "regular":
        return "bg-primary text-primary-foreground";
      case "new":
        return "bg-success text-success-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleAddCustomer = () => {
    console.log("Adding new customer...");
  };

  const handleExportCustomers = () => {
    console.log("Exporting customer list...");
  };

  // Loading state
  if (isLoading && customers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Customer Management"
          description="Manage customer relationships and track dining preferences"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonMetricsCard key={i} />
          ))}
        </div>
        <SkeletonList items={8} />
      </motion.div>
    );
  }

  // Empty state
  if (!isLoading && customers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Customer Management"
          description="Manage customer relationships and track dining preferences"
          primaryAction={{
            label: "Add Customer",
            onClick: handleAddCustomer,
            icon: UserPlus,
          }}
        />
        <EmptyState
          variant="no-customers"
          action={{
            label: "Add First Customer",
            onClick: handleAddCustomer,
            icon: UserPlus,
          }}
          secondaryAction={{
            label: "View Bookings",
            onClick: () => (window.location.href = "/dashboard/bookings"),
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Customer Management"
        description="Manage customer relationships and track dining preferences"
        primaryAction={{
          label: "Add Customer",
          onClick: handleAddCustomer,
          icon: UserPlus,
        }}
        secondaryActions={[
          {
            label: "Export",
            onClick: handleExportCustomers,
            variant: "outline",
          },
        ]}
        tabs={[
          { value: "all", label: `All (${customerStats.total})` },
          { value: "vip", label: `VIP (${customerStats.vip})` },
          { value: "regular", label: `Regular (${customerStats.regular})` },
          { value: "new", label: `New (${customerStats.new})` },
          { value: "inactive", label: `Inactive (${customerStats.inactive})` },
        ]}
        activeTab={selectedCustomerType}
        onTabChange={setSelectedCustomerType}
      />

      {/* Customer Statistics */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {[...Array(6)].map((_, i) => (
            <SkeletonMetricsCard key={i} />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{customerStats.total}</div>
                <div className="text-sm text-muted-foreground">
                  Total Customers
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {customerStats.vip}
                </div>
                <div className="text-sm text-muted-foreground">VIP</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {customerStats.regular}
                </div>
                <div className="text-sm text-muted-foreground">Regular</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {customerStats.new}
                </div>
                <div className="text-sm text-muted-foreground">New</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${customerStats.total_revenue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Revenue
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${Math.round(customerStats.average_spend)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Spend</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search customers"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Filter by:
                  </span>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Customer type filters"
                >
                  {[
                    { value: "all", label: "All" },
                    { value: "vip", label: "VIP" },
                    { value: "regular", label: "Regular" },
                    { value: "new", label: "New" },
                    { value: "inactive", label: "Inactive" },
                  ].map((filter) => (
                    <Button
                      key={filter.value}
                      variant={
                        selectedCustomerType === filter.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedCustomerType(filter.value)}
                      className="text-xs h-8 px-3 transition-all duration-200"
                      role="button"
                      aria-pressed={selectedCustomerType === filter.value}
                      aria-label={`Filter by ${filter.label} customers`}
                    >
                      {filter.label}
                      {filter.value !== "all" && (
                        <span className="ml-1 text-xs opacity-75">
                          (
                          {filter.value === "vip"
                            ? customerStats.vip
                            : filter.value === "regular"
                              ? customerStats.regular
                              : filter.value === "new"
                                ? customerStats.new
                                : customerStats.inactive}
                          )
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportCustomers}
                  className="h-10 px-4"
                >
                  Export
                </Button>
                <Button onClick={handleAddCustomer} className="h-10 px-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {isLoading ? (
          <SkeletonList items={6} className="mt-6" />
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50 bg-surface/50">
            <CardContent className="flex flex-col items-center justify-center text-center py-16 px-8">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-6 ring-1 ring-border/10">
                  <Users className="h-10 w-10 text-text-muted" />
                </div>
              </div>

              <div className="max-w-md space-y-3 mb-8">
                <h3 className="text-xl font-semibold text-foreground">
                  {searchTerm || selectedCustomerType !== "all"
                    ? "No customers found"
                    : "No customers yet"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {searchTerm || selectedCustomerType !== "all"
                    ? "No customers match your current search criteria. Try adjusting your filters or search terms."
                    : "Customer profiles will appear here once you receive your first booking."}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                {searchTerm || selectedCustomerType !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCustomerType("all");
                    }}
                    className="transition-brand"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() =>
                      (window.location.href = "/dashboard/bookings")
                    }
                    className="transition-brand"
                  >
                    View Bookings
                  </Button>
                )}

                <Button
                  onClick={handleAddCustomer}
                  className="transition-brand shadow-elev-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {customers.length === 0
                    ? "Add First Customer"
                    : "Add Customer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <CustomerCard
                  customer={customer}
                  getCustomerTypeColor={getCustomerTypeColor}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Customer Card Component
const CustomerCard: React.FC<{
  customer: Customer;
  getCustomerTypeColor: (type: Customer["customer_type"]) => string;
}> = ({ customer, getCustomerTypeColor }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
          <Badge className={getCustomerTypeColor(customer.customer_type)}>
            {customer.customer_type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {customer.address.city}, {customer.address.state}
              </span>
            </div>
          )}
        </div>

        {/* Visit Stats */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-b">
          <div className="text-center">
            <div className="font-semibold">{customer.total_visits}</div>
            <div className="text-xs text-muted-foreground">Visits</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">${customer.total_spent}</div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </div>
        </div>

        {/* Preferences & Allergies */}
        {(customer.preferences.length > 0 || customer.allergies.length > 0) && (
          <div className="space-y-2">
            {customer.preferences.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Preferences
                </h4>
                <div className="flex flex-wrap gap-1">
                  {customer.preferences.slice(0, 2).map((pref, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                  {customer.preferences.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.preferences.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {customer.allergies.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Allergies
                </h4>
                <div className="flex flex-wrap gap-1">
                  {customer.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Occasions */}
        {customer.special_occasions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">
              Upcoming
            </h4>
            {customer.special_occasions.slice(0, 1).map((occasion, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-warning" />
                <span>
                  {occasion.type} -{" "}
                  {new Date(occasion.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Loyalty Points */}
        {customer.loyalty_points > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              <span>Loyalty Points</span>
            </div>
            <span className="font-semibold">{customer.loyalty_points}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button size="sm" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;
