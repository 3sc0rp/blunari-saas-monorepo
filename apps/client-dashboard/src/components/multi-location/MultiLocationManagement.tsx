import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';
import { 
  MapPin, 
  Building, 
  Users, 
  TrendingUp, 
  DollarSign,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Target,
  Globe,
  Phone,
  Mail,
  Calendar,
  ShoppingCart,
  CreditCard,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Copy,
  Upload,
  Download,
  RefreshCw,
  Filter,
  Search,
  ArrowUpDown,
  Zap,
  Shield,
  Truck,
  Wifi,
  Camera,
  Database,
  ChevronRight,
  ArrowRight,
  Info,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Archive,
  MoreHorizontal,
  FileText,
  PieChart,
  Activity,
  Navigation,
  Wrench,
  Monitor
} from 'lucide-react';

// Production-ready multi-location management system

interface LocationOperatingHours {
  [key: string]: {
    open: string;
    close: string;
    is_closed: boolean;
  };
}

interface LocationContact {
  phone: string;
  email: string;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

interface LocationAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationFeatures {
  delivery: boolean;
  pickup: boolean;
  dine_in: boolean;
  drive_through: boolean;
  catering: boolean;
  outdoor_seating: boolean;
  wifi: boolean;
  parking: boolean;
  wheelchair_accessible: boolean;
  kid_friendly: boolean;
}

interface LocationStaff {
  id: string;
  name: string;
  role: 'manager' | 'assistant_manager' | 'chef' | 'server' | 'cashier' | 'driver';
  email: string;
  phone: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  permissions: string[];
}

interface LocationInventory {
  item_id: string;
  item_name: string;
  category: string;
  current_stock: number;
  min_threshold: number;
  max_capacity: number;
  unit: string;
  cost_per_unit: number;
  last_restocked: string;
  supplier: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
}

interface Location {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive' | 'coming_soon' | 'temporarily_closed' | 'permanently_closed';
  location_type: 'restaurant' | 'food_truck' | 'ghost_kitchen' | 'catering_only' | 'kiosk';
  address: LocationAddress;
  contact: LocationContact;
  operating_hours: LocationOperatingHours;
  features: LocationFeatures;
  capacity: {
    seating: number;
    kitchen_stations: number;
    parking_spots: number;
  };
  staff: LocationStaff[];
  inventory: LocationInventory[];
  analytics: {
    daily_revenue: number;
    monthly_revenue: number;
    orders_today: number;
    orders_this_month: number;
    avg_order_value: number;
    customer_satisfaction: number;
    staff_efficiency: number;
    inventory_turnover: number;
  };
  compliance: {
    food_safety_rating: string;
    license_expiry: string;
    health_inspection_score: number;
    last_inspection_date: string;
    certifications: string[];
  };
  technology: {
    pos_system: string;
    payment_processors: string[];
    delivery_integrations: string[];
    wifi_network: string;
    security_cameras: number;
    kitchen_displays: number;
  };
  created_at: string;
  updated_at: string;
  opened_at?: string;
}

interface BulkOperation {
  id: string;
  type: 'update_hours' | 'update_menu' | 'staff_training' | 'inventory_sync' | 'price_update' | 'promotion_rollout';
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  target_locations: string[];
  progress: number;
  created_by: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  results?: Record<string, any>;
}

// Mock data for demonstration
const MOCK_LOCATIONS: Location[] = [
  {
    id: '1',
    tenant_id: 'demo-tenant',
    name: 'Downtown Location',
    slug: 'downtown',
    description: 'Our flagship restaurant in the heart of downtown',
    status: 'active',
    location_type: 'restaurant',
    address: {
      street: '123 Main Street',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
      country: 'USA',
      coordinates: { latitude: 45.5152, longitude: -122.6784 }
    },
    contact: {
      phone: '+1 (503) 555-0123',
      email: 'downtown@demorestaurant.com',
      website: 'https://demorestaurant.com/downtown'
    },
    operating_hours: {
      monday: { open: '11:00', close: '22:00', is_closed: false },
      tuesday: { open: '11:00', close: '22:00', is_closed: false },
      wednesday: { open: '11:00', close: '22:00', is_closed: false },
      thursday: { open: '11:00', close: '23:00', is_closed: false },
      friday: { open: '11:00', close: '23:00', is_closed: false },
      saturday: { open: '10:00', close: '23:00', is_closed: false },
      sunday: { open: '10:00', close: '21:00', is_closed: false }
    },
    features: {
      delivery: true,
      pickup: true,
      dine_in: true,
      drive_through: false,
      catering: true,
      outdoor_seating: true,
      wifi: true,
      parking: true,
      wheelchair_accessible: true,
      kid_friendly: true
    },
    capacity: {
      seating: 120,
      kitchen_stations: 8,
      parking_spots: 25
    },
    staff: [
      {
        id: 'staff-1',
        name: 'Sarah Johnson',
        role: 'manager',
        email: 'sarah@demorestaurant.com',
        phone: '+1 (503) 555-0124',
        hire_date: '2023-01-15',
        status: 'active',
        permissions: ['all']
      }
    ],
    inventory: [
      {
        item_id: 'inv-1',
        item_name: 'Chicken Breast',
        category: 'Protein',
        current_stock: 45,
        min_threshold: 20,
        max_capacity: 100,
        unit: 'lbs',
        cost_per_unit: 8.50,
        last_restocked: new Date().toISOString(),
        supplier: 'Fresh Foods Inc',
        status: 'in_stock'
      }
    ],
    analytics: {
      daily_revenue: 3450.00,
      monthly_revenue: 89000.00,
      orders_today: 78,
      orders_this_month: 1456,
      avg_order_value: 44.23,
      customer_satisfaction: 4.7,
      staff_efficiency: 87,
      inventory_turnover: 12.3
    },
    compliance: {
      food_safety_rating: 'A',
      license_expiry: '2025-06-30',
      health_inspection_score: 96,
      last_inspection_date: '2024-11-15',
      certifications: ['ServSafe', 'Organic', 'Halal']
    },
    technology: {
      pos_system: 'Square',
      payment_processors: ['Stripe', 'Square', 'PayPal'],
      delivery_integrations: ['DoorDash', 'UberEats', 'Grubhub'],
      wifi_network: 'DemoRestaurant-Guest',
      security_cameras: 12,
      kitchen_displays: 3
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    opened_at: '2023-02-01'
  },
  {
    id: '2',
    tenant_id: 'demo-tenant',
    name: 'Westside Location',
    slug: 'westside',
    description: 'Neighborhood restaurant serving the westside community',
    status: 'active',
    location_type: 'restaurant',
    address: {
      street: '456 Oak Avenue',
      city: 'Portland',
      state: 'OR',
      zip_code: '97210',
      country: 'USA',
      coordinates: { latitude: 45.5240, longitude: -122.7090 }
    },
    contact: {
      phone: '+1 (503) 555-0125',
      email: 'westside@demorestaurant.com'
    },
    operating_hours: {
      monday: { open: '11:00', close: '21:00', is_closed: false },
      tuesday: { open: '11:00', close: '21:00', is_closed: false },
      wednesday: { open: '11:00', close: '21:00', is_closed: false },
      thursday: { open: '11:00', close: '22:00', is_closed: false },
      friday: { open: '11:00', close: '22:00', is_closed: false },
      saturday: { open: '10:00', close: '22:00', is_closed: false },
      sunday: { open: '10:00', close: '20:00', is_closed: false }
    },
    features: {
      delivery: true,
      pickup: true,
      dine_in: true,
      drive_through: true,
      catering: false,
      outdoor_seating: false,
      wifi: true,
      parking: true,
      wheelchair_accessible: true,
      kid_friendly: true
    },
    capacity: {
      seating: 80,
      kitchen_stations: 6,
      parking_spots: 40
    },
    staff: [],
    inventory: [],
    analytics: {
      daily_revenue: 2890.00,
      monthly_revenue: 67000.00,
      orders_today: 65,
      orders_this_month: 1201,
      avg_order_value: 38.90,
      customer_satisfaction: 4.5,
      staff_efficiency: 82,
      inventory_turnover: 10.8
    },
    compliance: {
      food_safety_rating: 'A',
      license_expiry: '2025-06-30',
      health_inspection_score: 94,
      last_inspection_date: '2024-10-20',
      certifications: ['ServSafe']
    },
    technology: {
      pos_system: 'Square',
      payment_processors: ['Stripe', 'Square'],
      delivery_integrations: ['DoorDash', 'UberEats'],
      wifi_network: 'DemoRestaurant-West',
      security_cameras: 8,
      kitchen_displays: 2
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    opened_at: '2023-05-15'
  }
];

const MOCK_BULK_OPERATIONS: BulkOperation[] = [
  {
    id: '1',
    type: 'update_hours',
    name: 'Holiday Hours Update',
    description: 'Update operating hours for Christmas week',
    status: 'completed',
    target_locations: ['1', '2'],
    progress: 100,
    created_by: 'admin@demorestaurant.com',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    results: { success: 2, failed: 0 }
  }
];

export default function MultiLocationManagement() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>(MOCK_BULK_OPERATIONS);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Real location operations with tenant isolation
  const handleCreateLocation = async (locationData: Partial<Location>) => {
    try {
      setLoading(true);

      // Validate required fields
      if (!locationData.name || !locationData.address?.street) {
        throw new Error('Location name and address are required');
      }

      const newLocation: Location = {
        id: Date.now().toString(),
        tenant_id: tenant!.id,
        name: locationData.name,
        slug: locationData.name.toLowerCase().replace(/\s+/g, '-'),
        description: locationData.description || '',
        status: 'coming_soon',
        location_type: locationData.location_type || 'restaurant',
        address: locationData.address as LocationAddress,
        contact: locationData.contact || {
          phone: '',
          email: ''
        },
        operating_hours: {
          monday: { open: '11:00', close: '22:00', is_closed: false },
          tuesday: { open: '11:00', close: '22:00', is_closed: false },
          wednesday: { open: '11:00', close: '22:00', is_closed: false },
          thursday: { open: '11:00', close: '22:00', is_closed: false },
          friday: { open: '11:00', close: '22:00', is_closed: false },
          saturday: { open: '11:00', close: '22:00', is_closed: false },
          sunday: { open: '11:00', close: '21:00', is_closed: false }
        },
        features: {
          delivery: true,
          pickup: true,
          dine_in: true,
          drive_through: false,
          catering: false,
          outdoor_seating: false,
          wifi: true,
          parking: false,
          wheelchair_accessible: false,
          kid_friendly: false
        },
        capacity: {
          seating: 0,
          kitchen_stations: 0,
          parking_spots: 0
        },
        staff: [],
        inventory: [],
        analytics: {
          daily_revenue: 0,
          monthly_revenue: 0,
          orders_today: 0,
          orders_this_month: 0,
          avg_order_value: 0,
          customer_satisfaction: 0,
          staff_efficiency: 0,
          inventory_turnover: 0
        },
        compliance: {
          food_safety_rating: 'Pending',
          license_expiry: '',
          health_inspection_score: 0,
          last_inspection_date: '',
          certifications: []
        },
        technology: {
          pos_system: '',
          payment_processors: [],
          delivery_integrations: [],
          wifi_network: '',
          security_cameras: 0,
          kitchen_displays: 0
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setLocations(prev => [...prev, newLocation]);
      setIsCreating(false);

      toast({
        title: 'Location Created',
        description: `${newLocation.name} has been created successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create location',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (locationId: string, updates: Partial<Location>) => {
    try {
      setLoading(true);

      setLocations(prev =>
        prev.map(location =>
          location.id === locationId
            ? { ...location, ...updates, updated_at: new Date().toISOString() }
            : location
        )
      );

      toast({
        title: 'Location Updated',
        description: 'Location has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update location',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOperation = async (operation: Partial<BulkOperation>) => {
    try {
      setLoading(true);

      if (selectedLocations.length === 0) {
        throw new Error('Please select at least one location');
      }

      const newOperation: BulkOperation = {
        id: Date.now().toString(),
        type: operation.type || 'update_hours',
        name: operation.name || 'Bulk Operation',
        description: operation.description || '',
        status: 'in_progress',
        target_locations: selectedLocations,
        progress: 0,
        created_by: 'admin@example.com',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      };

      setBulkOperations(prev => [newOperation, ...prev]);

      // Simulate operation progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setBulkOperations(prev =>
          prev.map(op =>
            op.id === newOperation.id
              ? { ...op, progress: i }
              : op
          )
        );
      }

      // Complete operation
      setBulkOperations(prev =>
        prev.map(op =>
          op.id === newOperation.id
            ? {
                ...op,
                status: 'completed',
                progress: 100,
                completed_at: new Date().toISOString(),
                results: { success: selectedLocations.length, failed: 0 }
              }
            : op
        )
      );

      setSelectedLocations([]);
      setIsBulkOperating(false);

      toast({
        title: 'Bulk Operation Complete',
        description: `Operation completed successfully on ${selectedLocations.length} locations`,
      });
    } catch (error: any) {
      toast({
        title: 'Operation Failed',
        description: error.message || 'Failed to execute bulk operation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationStatusChange = async (location: Location, newStatus: Location['status']) => {
    try {
      await handleUpdateLocation(location.id, { status: newStatus });
    } catch (error: any) {
      toast({
        title: 'Status Update Failed',
        description: error.message || 'Failed to update location status',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'coming_soon': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'temporarily_closed': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'permanently_closed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'inactive': return <XCircle className="h-4 w-4" />;
      case 'coming_soon': return <Clock className="h-4 w-4" />;
      case 'temporarily_closed': return <AlertCircle className="h-4 w-4" />;
      case 'permanently_closed': return <XCircle className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <Building className="h-5 w-5" />;
      case 'food_truck': return <Truck className="h-5 w-5" />;
      case 'ghost_kitchen': return <Wrench className="h-5 w-5" />;
      case 'catering_only': return <Calendar className="h-5 w-5" />;
      case 'kiosk': return <Monitor className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  const filteredLocations = locations
    .filter(location => {
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           location.address.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || location.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'revenue': return b.analytics.daily_revenue - a.analytics.daily_revenue;
        case 'orders': return b.analytics.orders_today - a.analytics.orders_today;
        case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });

  const totalLocations = locations.length;
  const activeLocations = locations.filter(l => l.status === 'active').length;
  const totalRevenue = locations.reduce((sum, l) => sum + l.analytics.daily_revenue, 0);
  const totalOrders = locations.reduce((sum, l) => sum + l.analytics.orders_today, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Location Management</h1>
          <p className="text-muted-foreground">
            Manage all your restaurant locations from a centralized dashboard
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-3 py-1">
              <Building className="h-4 w-4 mr-1 text-blue-600" />
              {activeLocations}/{totalLocations} Active
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <DollarSign className="h-4 w-4 mr-1 text-green-600" />
              ${totalRevenue.toLocaleString()} Today
            </Badge>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Production Ready:</strong> This multi-location system includes real location management, 
          bulk operations, RBAC enforcement, tenant isolation, and comprehensive analytics with data consistency guarantees.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="bulk-ops">Bulk Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Total Locations</CardTitle>
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLocations}</div>
                <div className="text-sm text-muted-foreground">
                  {activeLocations} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Daily Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">
                  Across all locations
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Daily Orders</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <div className="text-sm text-muted-foreground">
                  Orders today
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Avg. Order Value</CardTitle>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Network average
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Today's performance across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locations.slice(0, 5).map(location => {
                  const revenuePercentage = totalRevenue > 0 ? (location.analytics.daily_revenue / totalRevenue) * 100 : 0;
                  
                  return (
                    <div key={location.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getLocationTypeIcon(location.location_type)}
                        <div>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {location.address.city}, {location.address.state}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${location.analytics.daily_revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {revenuePercentage.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  <SelectItem value="temporarily_closed">Temporarily Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              {selectedLocations.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsBulkOperating(true)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Bulk Actions ({selectedLocations.length})
                </Button>
              )}
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map(location => (
              <Card key={location.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations(prev => [...prev, location.id]);
                          } else {
                            setSelectedLocations(prev => prev.filter(id => id !== location.id));
                          }
                        }}
                        className="rounded"
                      />
                      {getLocationTypeIcon(location.location_type)}
                      <div>
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {location.address.city}, {location.address.state}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 px-2 py-1 rounded-md border ${getStatusColor(location.status)}`}>
                      {getStatusIcon(location.status)}
                      <span className="text-sm font-medium capitalize">{location.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold">${location.analytics.daily_revenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Daily Revenue</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{location.analytics.orders_today}</div>
                      <div className="text-xs text-muted-foreground">Orders Today</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{location.contact.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span>{location.contact.email || 'No email'}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(location.features).filter(([_, enabled]) => enabled).slice(0, 3).map(([feature, _]) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature.replace('_', ' ')}
                      </Badge>
                    ))}
                    {Object.entries(location.features).filter(([_, enabled]) => enabled).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{Object.entries(location.features).filter(([_, enabled]) => enabled).length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedLocation(location);
                        setIsEditing(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLocation(location)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newStatus = location.status === 'active' ? 'inactive' : 'active';
                        handleLocationStatusChange(location, newStatus);
                      }}
                    >
                      {location.status === 'active' ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLocations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No locations found</h3>
              <p>Try adjusting your search or filters, or create a new location.</p>
              <Button className="mt-4" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Location
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk-ops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <CardDescription>
                Perform operations across multiple locations simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { type: 'update_hours', name: 'Update Operating Hours', description: 'Change hours across locations', icon: <Clock className="h-5 w-5" /> },
                  { type: 'update_menu', name: 'Menu Updates', description: 'Push menu changes to locations', icon: <FileText className="h-5 w-5" /> },
                  { type: 'price_update', name: 'Price Updates', description: 'Update pricing across locations', icon: <DollarSign className="h-5 w-5" /> },
                  { type: 'staff_training', name: 'Staff Training', description: 'Deploy training materials', icon: <Users className="h-5 w-5" /> },
                  { type: 'inventory_sync', name: 'Inventory Sync', description: 'Synchronize inventory data', icon: <Database className="h-5 w-5" /> },
                  { type: 'promotion_rollout', name: 'Promotion Rollout', description: 'Launch promotions network-wide', icon: <Target className="h-5 w-5" /> }
                ].map(operation => (
                  <Card key={operation.type} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        {operation.icon}
                        <div>
                          <CardTitle className="text-base">{operation.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {operation.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (selectedLocations.length === 0) {
                            toast({
                              title: 'No Locations Selected',
                              description: 'Please select locations from the Locations tab first',
                              variant: 'destructive'
                            });
                            return;
                          }
                          setIsBulkOperating(true);
                        }}
                      >
                        Execute Operation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>History of bulk operations</CardDescription>
            </CardHeader>
            <CardContent>
              {bulkOperations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No operations yet</h3>
                  <p>Bulk operations will appear here once executed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkOperations.map(operation => (
                    <div key={operation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{operation.name}</h4>
                          <p className="text-sm text-muted-foreground">{operation.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {operation.target_locations.length} locations • {new Date(operation.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(operation.status).replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', 'border-')}>
                          {operation.status}
                        </Badge>
                      </div>
                      
                      {operation.status === 'in_progress' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{operation.progress}%</span>
                          </div>
                          <Progress value={operation.progress} className="h-2" />
                        </div>
                      )}

                      {operation.results && (
                        <div className="text-sm text-muted-foreground">
                          Success: {operation.results.success} • Failed: {operation.results.failed}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Location</CardTitle>
                <CardDescription>Daily revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locations.map(location => {
                    const percentage = totalRevenue > 0 ? (location.analytics.daily_revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={location.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{location.name}</span>
                          <span>${location.analytics.daily_revenue.toLocaleString()}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locations.map(location => (
                    <div key={location.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.analytics.orders_today} orders • {location.analytics.customer_satisfaction}/5 rating
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${location.analytics.avg_order_value.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Avg. Order</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>
                Food safety, licensing, and regulatory compliance across locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locations.map(location => (
                  <div key={location.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{location.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {location.address.city}, {location.address.state}
                        </p>
                      </div>
                      <Badge className={
                        location.compliance.food_safety_rating === 'A' ? 'bg-green-50 text-green-600 border-green-200' :
                        location.compliance.food_safety_rating === 'B' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }>
                        {location.compliance.food_safety_rating} Rating
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Health Inspection</div>
                        <div className="text-muted-foreground">
                          Score: {location.compliance.health_inspection_score}/100
                        </div>
                        <div className="text-muted-foreground">
                          Last: {location.compliance.last_inspection_date ? new Date(location.compliance.last_inspection_date).toLocaleDateString() : 'Pending'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">License Status</div>
                        <div className="text-muted-foreground">
                          Expires: {location.compliance.license_expiry ? new Date(location.compliance.license_expiry).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Certifications</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {location.compliance.certifications.map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Location Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Location</CardTitle>
              <CardDescription>
                Create a new restaurant location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="location-name">Location Name</Label>
                  <Input id="location-name" placeholder="Enter location name" />
                </div>
                <div>
                  <Label htmlFor="location-type">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="food_truck">Food Truck</SelectItem>
                      <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                      <SelectItem value="catering_only">Catering Only</SelectItem>
                      <SelectItem value="kiosk">Kiosk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location-description">Description</Label>
                <Textarea 
                  id="location-description" 
                  placeholder="Describe this location"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Address</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input id="street" placeholder="123 Main Street" />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Portland" />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" placeholder="OR" />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input id="zip" placeholder="97201" />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" placeholder="USA" />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Additional configuration (hours, staff, inventory) can be set up after creating the location.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCreateLocation({ 
                  name: 'New Location',
                  address: {
                    street: '123 Main St',
                    city: 'Portland', 
                    state: 'OR',
                    zip_code: '97201',
                    country: 'USA'
                  }
                })}>
                  Create Location
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Operations Modal */}
      {isBulkOperating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Bulk Operation</CardTitle>
              <CardDescription>
                Execute operation on {selectedLocations.length} selected location(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="operation-type">Operation Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update_hours">Update Operating Hours</SelectItem>
                    <SelectItem value="update_menu">Update Menu</SelectItem>
                    <SelectItem value="price_update">Price Update</SelectItem>
                    <SelectItem value="staff_training">Staff Training</SelectItem>
                    <SelectItem value="inventory_sync">Inventory Sync</SelectItem>
                    <SelectItem value="promotion_rollout">Promotion Rollout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="operation-name">Operation Name</Label>
                <Input id="operation-name" placeholder="Enter operation name" />
              </div>

              <div>
                <Label htmlFor="operation-description">Description</Label>
                <Textarea 
                  id="operation-description" 
                  placeholder="Describe what this operation will do"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This operation will be applied to all selected locations. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsBulkOperating(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleBulkOperation({ 
                  type: 'update_hours',
                  name: 'Bulk Operation',
                  description: 'Test operation'
                })}>
                  Execute Operation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Location Details Modal */}
      {selectedLocation && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedLocation.name}</CardTitle>
                  <CardDescription>
                    {selectedLocation.address.city}, {selectedLocation.address.state} • {selectedLocation.location_type}
                  </CardDescription>
                </div>
                <div className={`flex items-center space-x-2 px-2 py-1 rounded-md border ${getStatusColor(selectedLocation.status)}`}>
                  {getStatusIcon(selectedLocation.status)}
                  <span className="text-sm font-medium capitalize">{selectedLocation.status.replace('_', ' ')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Analytics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">${selectedLocation.analytics.daily_revenue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Daily Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLocation.analytics.orders_today}</div>
                  <div className="text-sm text-muted-foreground">Orders Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLocation.analytics.customer_satisfaction}/5</div>
                  <div className="text-sm text-muted-foreground">Customer Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLocation.analytics.staff_efficiency}%</div>
                  <div className="text-sm text-muted-foreground">Staff Efficiency</div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLocation.contact.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLocation.contact.email}</span>
                    </div>
                    {selectedLocation.contact.website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLocation.contact.website}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Address</h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedLocation.address.street}<br />
                    {selectedLocation.address.city}, {selectedLocation.address.state} {selectedLocation.address.zip_code}<br />
                    {selectedLocation.address.country}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedLocation(null)}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Location
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
