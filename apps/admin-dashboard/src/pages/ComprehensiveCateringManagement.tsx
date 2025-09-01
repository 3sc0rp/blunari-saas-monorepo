import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarIcon, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChefHat, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Clock, 
  Star, 
  FileText, 
  Phone, 
  Mail, 
  MapPin,
  BarChart3,
  Settings,
  UserCheck
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { useCateringPackages } from '@/hooks/useCateringPackages';
import { useCateringAnalytics } from '@/hooks/useCateringAnalytics';
import { 
  CateringStatus, 
  CateringServiceType, 
  CATERING_STATUS_COLORS, 
  CATERING_SERVICE_TYPE_LABELS,
  CateringOrder,
  CateringOrderFilters,
  CateringPackage,
  CateringMenuItem
} from '@/types/catering';

// Helper functions
const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (date: string) => format(new Date(date), 'MMM dd, yyyy');
const formatTime = (time: string) => format(new Date(`2000-01-01T${time}`), 'h:mm a');

// Status badge component
const StatusBadge: React.FC<{ status: CateringStatus }> = ({ status }) => {
  const colorClass = CATERING_STATUS_COLORS[status] || 'text-gray-600 bg-gray-50';
  return (
    <Badge variant="secondary" className={`${colorClass} font-medium capitalize`}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

// Analytics dashboard component
const AnalyticsDashboard: React.FC = () => {
  const { analytics, loading } = useCateringAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Orders',
      value: analytics?.total_orders || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics?.total_revenue || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Average Order',
      value: formatCurrency(analytics?.average_order_value || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Customer Rating',
      value: `${analytics?.customer_satisfaction?.average_rating?.toFixed(1) || '0.0'}/5`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Order card component
const OrderCard: React.FC<{ 
  order: CateringOrder; 
  onStatusUpdate: (orderId: string, status: CateringStatus, notes?: string) => Promise<void>;
  onEdit: (order: CateringOrder) => void;
  onViewDetails: (order: CateringOrder) => void;
}> = ({ order, onStatusUpdate, onEdit, onViewDetails }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{order.event_name}</h3>
            <p className="text-gray-600 text-sm mb-2">{order.contact_name}</p>
            <div className="flex items-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-1" />
              {order.contact_email}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDate(order.event_date)} at {formatTime(order.event_start_time)}
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            {order.guest_count} guests
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {order.venue_name || 'Venue TBD'}
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            {formatCurrency(order.total_amount)}
          </div>
        </div>

        {order.package?.name && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              📦 {order.package.name}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {CATERING_SERVICE_TYPE_LABELS[order.service_type as CateringServiceType]}
          </Badge>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onViewDetails(order)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Select value={order.status} onValueChange={(status) => onStatusUpdate(order.id, status as CateringStatus)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Package management component
const PackageManagement: React.FC = () => {
  const { packages, menuItems, menuCategories, loading } = useCateringPackages();
  
  if (loading) {
    return <div className="animate-pulse">Loading packages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catering Packages</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages?.map((pkg) => (
          <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{pkg.description}</p>
                </div>
                {pkg.popular && (
                  <Badge className="bg-yellow-100 text-yellow-800">Popular</Badge>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price per person:</span>
                  <span className="font-medium">{formatCurrency(pkg.price_per_person)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Min guests:</span>
                  <span className="font-medium">{pkg.min_guests}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {pkg.includes_setup && (
                  <Badge variant="outline" className="text-xs">Setup</Badge>
                )}
                {pkg.includes_service && (
                  <Badge variant="outline" className="text-xs">Service</Badge>
                )}
                {pkg.includes_cleanup && (
                  <Badge variant="outline" className="text-xs">Cleanup</Badge>
                )}
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Order details modal
const OrderDetailsModal: React.FC<{ 
  order: CateringOrder | null; 
  isOpen: boolean; 
  onClose: () => void 
}> = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{order.event_name}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Order Status and Basic Info */}
            <div className="flex justify-between items-center">
              <StatusBadge status={order.status} />
              <div className="text-right">
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="font-mono text-sm">{order.id}</p>
              </div>
            </div>

            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-medium">
                      {formatDate(order.event_date)} at {formatTime(order.event_start_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">{order.event_duration_hours || 4} hours</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Guest Count</p>
                    <p className="font-medium">{order.guest_count} guests</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-medium">{CATERING_SERVICE_TYPE_LABELS[order.service_type as CateringServiceType]}</p>
                  </div>
                  {order.occasion && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Occasion</p>
                      <p className="font-medium">{order.occasion}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Contact Name</p>
                    <p className="font-medium">{order.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{order.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{order.contact_phone}</p>
                  </div>
                  {order.company_name && (
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-medium">{order.company_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Venue Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.venue_name && (
                    <div>
                      <p className="text-sm text-gray-600">Venue Name</p>
                      <p className="font-medium">{order.venue_name}</p>
                    </div>
                  )}
                  {order.venue_address && (
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">
                        {typeof order.venue_address === 'object' 
                          ? `${order.venue_address.street}, ${order.venue_address.city}, ${order.venue_address.state} ${order.venue_address.zip_code}`
                          : order.venue_address
                        }
                      </p>
                    </div>
                  )}
                  {order.delivery_instructions && (
                    <div>
                      <p className="text-sm text-gray-600">Delivery Instructions</p>
                      <p className="font-medium">{order.delivery_instructions}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.service_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Service Fee</span>
                      <span>{formatCurrency(order.service_fee)}</span>
                    </div>
                  )}
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                  )}
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(order.tax_amount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                  {order.deposit_amount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Deposit {order.deposit_paid ? '(Paid)' : '(Pending)'}</span>
                      <span>{formatCurrency(order.deposit_amount)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {(order.special_instructions || order.dietary_requirements) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Special Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.special_instructions && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Special Instructions</p>
                      <p className="text-sm bg-gray-50 p-3 rounded">{order.special_instructions}</p>
                    </div>
                  )}
                  {order.dietary_requirements && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Dietary Requirements</p>
                      <p className="text-sm bg-gray-50 p-3 rounded">{order.dietary_requirements}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Main catering management component
const CateringManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Build filters
  const filters = useMemo((): CateringOrderFilters => {
    const baseFilters: CateringOrderFilters = {};
    
    if (statusFilter !== 'all') {
      baseFilters.status = [statusFilter as CateringStatus];
    }
    
    if (serviceTypeFilter !== 'all') {
      baseFilters.service_type = [serviceTypeFilter as CateringServiceType];
    }
    
    if (searchQuery) {
      baseFilters.search = searchQuery;
    }

    return baseFilters;
  }, [statusFilter, serviceTypeFilter, searchQuery]);

  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError, 
    updateOrderStatus, 
    refetch 
  } = useCateringOrders(filters);

  // Event handlers
  const handleStatusUpdate = async (orderId: string, status: CateringStatus, notes?: string) => {
    try {
      await updateOrderStatus(orderId, status, notes);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleEditOrder = (order: CateringOrder) => {
    // TODO: Implement order editing
    console.log('Edit order:', order);
  };

  const handleViewOrderDetails = (order: CateringOrder) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChefHat className="w-8 h-8 mr-3 text-orange-600" />
            Catering Management
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive catering order and package management system
          </p>
        </div>
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" />
          New Order
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {/* Orders Section */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search orders by event name, contact, or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="full_service">Full Service</SelectItem>
                  <SelectItem value="drop_off">Drop-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Orders Grid */}
          {ordersLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : ordersError ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Package className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Catering System Not Ready</h3>
                <p className="text-gray-600 mb-4">
                  Apply the database migration to enable full catering functionality.
                </p>
                <Button variant="outline" onClick={refetch}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : !orders || orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <ChefHat className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all' || serviceTypeFilter !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Start by creating your first catering order.'}
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  onEdit={handleEditOrder}
                  onViewDetails={handleViewOrderDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages">
          <PackageManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Advanced Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Detailed analytics and reporting features will be available after database migration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Catering Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Configure catering system settings, pricing rules, and business policies.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderDetailsOpen}
        onClose={() => {
          setIsOrderDetailsOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
};

export default CateringManagement;
