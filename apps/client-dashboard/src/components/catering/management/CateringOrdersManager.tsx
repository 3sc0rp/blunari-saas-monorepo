import React, { useState, useMemo } from 'react';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Eye, Calendar, Users, DollarSign, Package, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { CateringOrder, CateringOrderStatus } from '@/types/catering';
import { CATERING_STATUS_COLORS, CATERING_SERVICE_TYPE_LABELS } from '@/types/catering';

interface CateringOrdersManagerProps {
  tenantId: string;
}

export function CateringOrdersManager({ tenantId }: CateringOrdersManagerProps) {
  const {
    orders,
    isLoading,
    updateOrderStatus,
    isUpdating,
  } = useCateringOrders(tenantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Filter orders
      const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.event_name?.toLowerCase().includes(query) ||
        order.contact_name?.toLowerCase().includes(query) ||
        order.contact_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const handleViewOrder = (order: CateringOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: CateringOrderStatus) => {
    await updateOrderStatus({ orderId, status: newStatus });
    toast.success(`Order status updated to ${newStatus}`);
  };

  const getStatusBadge = (status: CateringOrderStatus) => {
    const colors = CATERING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <Badge className={colors}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Catering Orders</CardTitle>
              <CardDescription>
                Manage and track all catering orders
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.event_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(order.event_date), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.contact_name}</div>
                        <div className="text-muted-foreground">{order.contact_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {order.guest_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATERING_SERVICE_TYPE_LABELS[order.service_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.total_amount ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {(order.total_amount / 100).toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Pending quote</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Catering orders will appear here'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedOrder.event_name}</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Status Update */}
              <div className="flex items-center gap-4">
                <Label>Status:</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) => handleStatusChange(selectedOrder.id, value as CateringOrderStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-48">
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

              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Event Date</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(selectedOrder.event_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Time</Label>
                  <p className="text-sm font-medium mt-1">{selectedOrder.event_start_time}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Guest Count</Label>
                  <p className="text-sm font-medium mt-1">{selectedOrder.guest_count} guests</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Type</Label>
                  <p className="text-sm font-medium mt-1">
                    {CATERING_SERVICE_TYPE_LABELS[selectedOrder.service_type]}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Contact Information</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium mt-1">{selectedOrder.contact_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium mt-1">{selectedOrder.contact_email}</p>
                  </div>
                  {selectedOrder.contact_phone && (
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="text-sm font-medium mt-1">{selectedOrder.contact_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue Details */}
              {(selectedOrder.venue_name || selectedOrder.venue_address) && (
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Venue Details</Label>
                  <div className="space-y-2">
                    {selectedOrder.venue_name && (
                      <div>
                        <Label className="text-muted-foreground">Venue Name</Label>
                        <p className="text-sm font-medium mt-1">{selectedOrder.venue_name}</p>
                      </div>
                    )}
                    {selectedOrder.venue_address && (
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p className="text-sm font-medium mt-1">{selectedOrder.venue_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {selectedOrder.special_instructions && (
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Special Instructions</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.special_instructions}</p>
                </div>
              )}

              {/* Dietary Requirements */}
              {selectedOrder.dietary_requirements && selectedOrder.dietary_requirements.length > 0 && (
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Dietary Requirements</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.dietary_requirements.map((diet) => (
                      <Badge key={diet} variant="secondary">{diet}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {selectedOrder.total_amount && (
                <div className="border-t pt-4">
                  <Label className="text-lg font-semibold mb-3 block">Pricing</Label>
                  <div className="space-y-2">
                    {selectedOrder.subtotal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>${(selectedOrder.subtotal / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.tax_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>${(selectedOrder.tax_amount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.service_fee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Fee:</span>
                        <span>${(selectedOrder.service_fee / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Fee:</span>
                        <span>${(selectedOrder.delivery_fee / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>${(selectedOrder.total_amount / 100).toFixed(2)}</span>
                    </div>
                    {selectedOrder.deposit_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Deposit Required:</span>
                        <span className={selectedOrder.deposit_paid ? 'text-green-600' : ''}>
                          ${(selectedOrder.deposit_amount / 100).toFixed(2)}
                          {selectedOrder.deposit_paid && ' (Paid)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


