import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChefHat, Calendar, Users, DollarSign, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface CateringOrder {
  id: string;
  tenant_id: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  guest_count: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  venue_name: string;
  venue_address: any;
  status: string;
  service_type: string;
  total_amount: number;
  created_at: string;
  catering_packages?: {
    id: string;
    name: string;
    price_per_person: number;
  };
  tenants?: {
    id: string;
    name: string;
  };
}

interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price_per_person: number;
  min_guests: number;
  max_guests: number;
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  popular: boolean;
  active: boolean;
  created_at: string;
  tenants?: {
    id: string;
    name: string;
  };
}

const CateringManagement = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch all catering orders - temporarily disabled until database migration is applied
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-catering-orders', statusFilter, tenantFilter, searchQuery],
    queryFn: async () => {
      try {
        // Using .from() with any to bypass TypeScript errors until migration is applied
        let query = (supabase as any)
          .from('catering_orders')
          .select(`
            *,
            catering_packages (
              id,
              name,
              price_per_person
            )
          `)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (tenantFilter !== 'all') {
          query = query.eq('tenant_id', tenantFilter);
        }

        if (searchQuery) {
          query = query.or(`event_name.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('Catering orders table not found - apply database migration first');
          return [];
        }
        return data as CateringOrder[];
      } catch (error) {
        console.warn('Catering system not ready - apply database migration first');
        return [];
      }
    },
  });

  // Fetch all catering packages - temporarily disabled until database migration is applied
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['admin-catering-packages', tenantFilter],
    queryFn: async () => {
      try {
        let query = (supabase as any)
          .from('catering_packages')
          .select(`
            *,
            tenants (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (tenantFilter !== 'all') {
          query = query.eq('tenant_id', tenantFilter);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('Catering packages table not found - apply database migration first');
          return [];
        }
        return data as CateringPackage[];
      } catch (error) {
        console.warn('Catering packages system not ready - apply database migration first');
        return [];
      }
    },
  });

  // Fetch all tenants for filters
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      inquiry: { color: 'bg-blue-100 text-blue-800', label: 'Inquiry' },
      quoted: { color: 'bg-yellow-100 text-yellow-800', label: 'Quoted' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inquiry;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getServiceTypeBadge = (serviceType: string) => {
    const typeConfig = {
      pickup: 'Pickup',
      delivery: 'Delivery',
      full_service: 'Full Service',
      drop_off: 'Drop Off',
    };
    return typeConfig[serviceType as keyof typeof typeConfig] || serviceType;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const calculateMetrics = () => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const confirmedOrders = orders.filter(o => ['confirmed', 'completed'].includes(o.status)).length;
    const avgOrderValue = confirmedOrders > 0 ? totalRevenue / confirmedOrders : 0;

    return {
      totalOrders,
      totalRevenue: totalRevenue / 100, // Convert to dollars
      confirmedOrders,
      avgOrderValue: avgOrderValue / 100,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catering Management</h1>
          <p className="text-muted-foreground">
            Manage catering orders and packages across all tenants
          </p>
        </div>
        <ChefHat className="h-8 w-8 text-primary" />
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue * 100)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.confirmedOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue * 100)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
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
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="flex justify-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No catering orders found</p>
                <p className="text-muted-foreground">Orders will appear here when customers submit requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.event_name}</CardTitle>
                        <CardDescription>
                          {order.tenants?.name} • Order #{order.id.slice(0, 8)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(order.status)}
                        <Badge variant="outline">{getServiceTypeBadge(order.service_type)}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(order.event_date), 'PPP')} at {order.event_start_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.guest_count} guests</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.venue_name || 'Venue TBD'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.contact_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.contact_phone}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {order.catering_packages && (
                          <div>
                            <p className="text-sm font-medium">{order.catering_packages.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(order.catering_packages.price_per_person)} per person
                            </p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm font-medium">Total Amount</p>
                          <p className="text-lg font-bold">{formatCurrency(order.total_amount || 0)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View Details</Button>
                          <Button size="sm">Update Status</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          {packagesLoading ? (
            <div className="flex justify-center py-8">Loading packages...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <div className="flex gap-1">
                        {pkg.popular && <Badge className="bg-yellow-100 text-yellow-800">Popular</Badge>}
                        <Badge variant={pkg.active ? "default" : "secondary"}>
                          {pkg.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{pkg.tenants?.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">{formatCurrency(pkg.price_per_person)}</span>
                        <span className="text-sm text-muted-foreground">per person</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pkg.min_guests}-{pkg.max_guests || '∞'} guests
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pkg.includes_setup && <Badge variant="outline" className="text-xs">Setup</Badge>}
                        {pkg.includes_service && <Badge variant="outline" className="text-xs">Service</Badge>}
                        {pkg.includes_cleanup && <Badge variant="outline" className="text-xs">Cleanup</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="outline">
                          {pkg.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CateringManagement;
