import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChefHat,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Mail,
  Phone,
  Package,
  Utensils,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  Settings
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import {
  CateringOrder,
  CateringStatus,
  CateringServiceType,
  CateringOrderFilters,
  CATERING_STATUS_COLORS,
  CATERING_SERVICE_TYPE_LABELS
} from '@/types/catering';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { useCateringAnalytics } from '@/hooks/useCateringAnalytics';

interface CateringPageProps {}

export default function CateringPage({}: CateringPageProps) {
  const [selectedTab, setSelectedTab] = useState('orders');
  const [filters, setFilters] = useState<CateringOrderFilters>({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    updateOrderStatus,
  } = useCateringOrders(filters);

  const {
    analytics,
    loading: analyticsLoading
  } = useCateringAnalytics();

  // Filter orders based on search query
  const filteredOrders = orders?.filter(order =>
    order.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.venue_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusIcon = (status: CateringStatus) => {
    switch (status) {
      case 'inquiry':
        return <AlertCircle className="h-4 w-4" />;
      case 'quoted':
        return <FileText className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: CateringStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await refetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleViewOrder = (order: CateringOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catering Management</h1>
          <p className="text-muted-foreground">
            Manage catering orders, menus, and event planning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {!analyticsLoading && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_orders}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.average_order_value)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Rating</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.customer_satisfaction.average_rating.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of 5.0
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filters.status?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      status: value === 'all' ? undefined : [value as CateringStatus] 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="inquiry">Inquiries</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.service_type?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      service_type: value === 'all' ? undefined : [value as CateringServiceType] 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Service Types</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="drop_off">Drop-off</SelectItem>
                    <SelectItem value="full_service">Full Service</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Showing {filteredOrders.length} catering orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <ChefHat className="w-8 h-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Details</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.event_name}</div>
                              {order.venue_name && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {order.venue_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.contact_name}</div>
                              <div className="text-sm text-muted-foreground">{order.contact_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {format(parseISO(order.event_date), 'MMM d, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {order.event_start_time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {order.guest_count}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CATERING_SERVICE_TYPE_LABELS[order.service_type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={CATERING_STATUS_COLORS[order.status]}
                              variant="secondary"
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(order.status)}
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(order.total_amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Order
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Quote
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                  disabled={order.status === 'confirmed'}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Confirm Order
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Order
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No catering orders found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search criteria' : 'Start by creating your first catering order'}
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu Management Tab */}
        <TabsContent value="menu" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Menu Management
              </CardTitle>
              <CardDescription>
                Manage your catering menu items and categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Menu management coming soon</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Items
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Catering Packages
              </CardTitle>
              <CardDescription>
                Create and manage pre-designed catering packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Package management coming soon</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Package
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Catering Settings
              </CardTitle>
              <CardDescription>
                Configure catering options and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Settings panel coming soon</p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.event_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Event Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(parseISO(selectedOrder.event_date), 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.event_start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.guest_count} guests</span>
                    </div>
                    {selectedOrder.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.venue_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.contact_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.contact_phone}</span>
                    </div>
                    {selectedOrder.company_name && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.company_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                      <p>{CATERING_SERVICE_TYPE_LABELS[selectedOrder.service_type]}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={CATERING_STATUS_COLORS[selectedOrder.status]} variant="secondary">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(selectedOrder.status)}
                            {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                          </div>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedOrder.special_instructions && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">Special Instructions</label>
                      <p className="mt-1">{selectedOrder.special_instructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pricing Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.service_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Service Fee</span>
                        <span>{formatCurrency(selectedOrder.service_fee)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Quote
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
