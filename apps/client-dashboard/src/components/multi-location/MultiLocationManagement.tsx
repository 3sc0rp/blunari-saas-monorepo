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
  Database
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  manager: string;
  status: 'active' | 'inactive' | 'coming_soon' | 'maintenance';
  type: 'flagship' | 'standard' | 'express' | 'ghost_kitchen' | 'food_truck';
  openingHours: {
    [key: string]: { open: string; close: string; isClosed: boolean };
  };
  metrics: {
    dailyRevenue: number;
    ordersToday: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    staffCount: number;
    efficiency: number;
  };
  features: string[];
  lastUpdated: Date;
  coordinates: { lat: number; lng: number };
}

interface LocationGroup {
  id: string;
  name: string;
  description: string;
  locationIds: string[];
  color: string;
  manager: string;
}

interface MultiLocationMetrics {
  totalLocations: number;
  activeLocations: number;
  totalRevenue: number;
  totalOrders: number;
  avgCustomerSatisfaction: number;
  bestPerformingLocation: string;
  worstPerformingLocation: string;
}

const locations: Location[] = [
  {
    id: 'loc-downtown',
    name: 'Downtown Flagship',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    phone: '(555) 123-4567',
    email: 'downtown@blunari.com',
    manager: 'Sarah Johnson',
    status: 'active',
    type: 'flagship',
    openingHours: {
      monday: { open: '07:00', close: '22:00', isClosed: false },
      tuesday: { open: '07:00', close: '22:00', isClosed: false },
      wednesday: { open: '07:00', close: '22:00', isClosed: false },
      thursday: { open: '07:00', close: '23:00', isClosed: false },
      friday: { open: '07:00', close: '23:00', isClosed: false },
      saturday: { open: '08:00', close: '23:00', isClosed: false },
      sunday: { open: '08:00', close: '21:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 12450,
      ordersToday: 187,
      averageOrderValue: 66.58,
      customerSatisfaction: 4.7,
      staffCount: 24,
      efficiency: 94
    },
    features: ['Dine-in', 'Takeout', 'Delivery', 'Catering', 'Private Events', 'Bar'],
    lastUpdated: new Date(Date.now() - 300000),
    coordinates: { lat: 40.7505, lng: -73.9934 }
  },
  {
    id: 'loc-midtown',
    name: 'Midtown Express',
    address: '456 Park Avenue',
    city: 'New York',
    state: 'NY',
    zipCode: '10016',
    phone: '(555) 234-5678',
    email: 'midtown@blunari.com',
    manager: 'Michael Chen',
    status: 'active',
    type: 'express',
    openingHours: {
      monday: { open: '06:30', close: '15:00', isClosed: false },
      tuesday: { open: '06:30', close: '15:00', isClosed: false },
      wednesday: { open: '06:30', close: '15:00', isClosed: false },
      thursday: { open: '06:30', close: '15:00', isClosed: false },
      friday: { open: '06:30', close: '15:00', isClosed: false },
      saturday: { open: '08:00', close: '14:00', isClosed: false },
      sunday: { open: '08:00', close: '14:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 8930,
      ordersToday: 156,
      averageOrderValue: 57.24,
      customerSatisfaction: 4.5,
      staffCount: 12,
      efficiency: 87
    },
    features: ['Takeout', 'Delivery', 'Quick Service', 'Mobile Ordering'],
    lastUpdated: new Date(Date.now() - 600000),
    coordinates: { lat: 40.7549, lng: -73.9840 }
  },
  {
    id: 'loc-brooklyn',
    name: 'Brooklyn Heights',
    address: '789 Court Street',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11201',
    phone: '(555) 345-6789',
    email: 'brooklyn@blunari.com',
    manager: 'Emma Rodriguez',
    status: 'active',
    type: 'standard',
    openingHours: {
      monday: { open: '11:00', close: '21:00', isClosed: false },
      tuesday: { open: '11:00', close: '21:00', isClosed: false },
      wednesday: { open: '11:00', close: '21:00', isClosed: false },
      thursday: { open: '11:00', close: '22:00', isClosed: false },
      friday: { open: '11:00', close: '22:00', isClosed: false },
      saturday: { open: '10:00', close: '22:00', isClosed: false },
      sunday: { open: '10:00', close: '21:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 9876,
      ordersToday: 143,
      averageOrderValue: 69.13,
      customerSatisfaction: 4.6,
      staffCount: 18,
      efficiency: 91
    },
    features: ['Dine-in', 'Takeout', 'Delivery', 'Brunch', 'Outdoor Seating'],
    lastUpdated: new Date(Date.now() - 900000),
    coordinates: { lat: 40.6958, lng: -73.9925 }
  },
  {
    id: 'loc-queens',
    name: 'Queens Ghost Kitchen',
    address: '321 Industrial Blvd',
    city: 'Queens',
    state: 'NY',
    zipCode: '11378',
    phone: '(555) 456-7890',
    email: 'queens@blunari.com',
    manager: 'David Kim',
    status: 'active',
    type: 'ghost_kitchen',
    openingHours: {
      monday: { open: '10:00', close: '23:00', isClosed: false },
      tuesday: { open: '10:00', close: '23:00', isClosed: false },
      wednesday: { open: '10:00', close: '23:00', isClosed: false },
      thursday: { open: '10:00', close: '23:00', isClosed: false },
      friday: { open: '10:00', close: '24:00', isClosed: false },
      saturday: { open: '10:00', close: '24:00', isClosed: false },
      sunday: { open: '10:00', close: '23:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 6540,
      ordersToday: 89,
      averageOrderValue: 73.48,
      customerSatisfaction: 4.4,
      staffCount: 8,
      efficiency: 96
    },
    features: ['Delivery Only', 'Multiple Brands', 'Third-party Platforms'],
    lastUpdated: new Date(Date.now() - 1200000),
    coordinates: { lat: 40.7498, lng: -73.8785 }
  },
  {
    id: 'loc-mobile',
    name: 'Manhattan Food Truck',
    address: 'Various Locations',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    phone: '(555) 567-8901',
    email: 'mobile@blunari.com',
    manager: 'Alex Thompson',
    status: 'active',
    type: 'food_truck',
    openingHours: {
      monday: { open: '11:00', close: '15:00', isClosed: false },
      tuesday: { open: '11:00', close: '15:00', isClosed: false },
      wednesday: { open: '11:00', close: '15:00', isClosed: false },
      thursday: { open: '11:00', close: '15:00', isClosed: false },
      friday: { open: '11:00', close: '15:00', isClosed: false },
      saturday: { open: '10:00', close: '16:00', isClosed: false },
      sunday: { open: '10:00', close: '16:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 3420,
      ordersToday: 72,
      averageOrderValue: 47.50,
      customerSatisfaction: 4.8,
      staffCount: 3,
      efficiency: 89
    },
    features: ['Mobile Service', 'Cash Only', 'Event Catering', 'GPS Tracking'],
    lastUpdated: new Date(Date.now() - 1800000),
    coordinates: { lat: 40.7589, lng: -73.9851 }
  },
  {
    id: 'loc-coming-soon',
    name: 'SoHo Location',
    address: '654 Spring Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10012',
    phone: '(555) 678-9012',
    email: 'soho@blunari.com',
    manager: 'TBD',
    status: 'coming_soon',
    type: 'standard',
    openingHours: {
      monday: { open: '11:00', close: '22:00', isClosed: false },
      tuesday: { open: '11:00', close: '22:00', isClosed: false },
      wednesday: { open: '11:00', close: '22:00', isClosed: false },
      thursday: { open: '11:00', close: '22:00', isClosed: false },
      friday: { open: '11:00', close: '23:00', isClosed: false },
      saturday: { open: '10:00', close: '23:00', isClosed: false },
      sunday: { open: '10:00', close: '22:00', isClosed: false }
    },
    metrics: {
      dailyRevenue: 0,
      ordersToday: 0,
      averageOrderValue: 0,
      customerSatisfaction: 0,
      staffCount: 0,
      efficiency: 0
    },
    features: ['Dine-in', 'Takeout', 'Delivery', 'Wine Bar', 'Art Gallery'],
    lastUpdated: new Date(Date.now() - 86400000),
    coordinates: { lat: 40.7260, lng: -74.0034 }
  }
];

const locationGroups: LocationGroup[] = [
  {
    id: 'group-manhattan',
    name: 'Manhattan Locations',
    description: 'All Manhattan-based restaurants',
    locationIds: ['loc-downtown', 'loc-midtown', 'loc-mobile', 'loc-coming-soon'],
    color: '#3B82F6',
    manager: 'Sarah Johnson'
  },
  {
    id: 'group-outer-boroughs',
    name: 'Outer Boroughs',
    description: 'Brooklyn, Queens, and other borough locations',
    locationIds: ['loc-brooklyn', 'loc-queens'],
    color: '#10B981',
    manager: 'Emma Rodriguez'
  },
  {
    id: 'group-delivery-only',
    name: 'Delivery-Only Concepts',
    description: 'Ghost kitchens and delivery-focused locations',
    locationIds: ['loc-queens'],
    color: '#F59E0B',
    manager: 'David Kim'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'coming_soon': return 'bg-blue-100 text-blue-800';
    case 'maintenance': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'flagship': return 'bg-purple-100 text-purple-800';
    case 'standard': return 'bg-blue-100 text-blue-800';
    case 'express': return 'bg-green-100 text-green-800';
    case 'ghost_kitchen': return 'bg-orange-100 text-orange-800';
    case 'food_truck': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'flagship': return Building;
    case 'standard': return MapPin;
    case 'express': return Zap;
    case 'ghost_kitchen': return Shield;
    case 'food_truck': return Truck;
    default: return MapPin;
  }
};

export default function MultiLocationManagement() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || location.status === statusFilter;
    const matchesType = typeFilter === 'all' || location.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeLocations = locations.filter(loc => loc.status === 'active');
  const totalRevenue = activeLocations.reduce((sum, loc) => sum + loc.metrics.dailyRevenue, 0);
  const totalOrders = activeLocations.reduce((sum, loc) => sum + loc.metrics.ordersToday, 0);
  const avgSatisfaction = activeLocations.reduce((sum, loc) => sum + loc.metrics.customerSatisfaction, 0) / activeLocations.length;

  const bestPerforming = activeLocations.reduce((best, loc) => 
    loc.metrics.dailyRevenue > best.metrics.dailyRevenue ? loc : best
  );

  const worstPerforming = activeLocations.reduce((worst, loc) => 
    loc.metrics.dailyRevenue < worst.metrics.dailyRevenue ? loc : worst
  );

  const handleBulkAction = (action: string) => {
    console.log(`Performing bulk action: ${action}`);
  };

  const handleLocationSync = (locationId: string) => {
    console.log(`Syncing location: ${locationId}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Location Management</h1>
          <p className="text-muted-foreground">
            Centralized management and analytics for all your restaurant locations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{locations.length}</p>
                <p className="text-xs text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeLocations.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Daily Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Orders Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgSatisfaction.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Best Performing Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{bestPerforming.name}</h3>
                    <p className="text-sm text-muted-foreground">{bestPerforming.city}, {bestPerforming.state}</p>
                    <p className="text-sm text-muted-foreground">Manager: {bestPerforming.manager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${bestPerforming.metrics.dailyRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Daily Revenue</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-semibold">{bestPerforming.metrics.ordersToday}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <p className="font-semibold">${bestPerforming.metrics.averageOrderValue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">AOV</p>
                  </div>
                  <div>
                    <p className="font-semibold">{bestPerforming.metrics.customerSatisfaction}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{worstPerforming.name}</h3>
                    <p className="text-sm text-muted-foreground">{worstPerforming.city}, {worstPerforming.state}</p>
                    <p className="text-sm text-muted-foreground">Manager: {worstPerforming.manager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">${worstPerforming.metrics.dailyRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Daily Revenue</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-semibold">{worstPerforming.metrics.ordersToday}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <p className="font-semibold">${worstPerforming.metrics.averageOrderValue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">AOV</p>
                  </div>
                  <div>
                    <p className="font-semibold">{worstPerforming.metrics.customerSatisfaction}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => {
              const TypeIcon = getTypeIcon(location.type);
              return (
                <Card key={location.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedLocation(location)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={getTypeColor(location.type)}>
                              {location.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(location.status)}>
                              {location.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>{location.address}</p>
                      <p>{location.city}, {location.state} {location.zipCode}</p>
                      <p>Manager: {location.manager}</p>
                    </div>
                    
                    {location.status === 'active' && (
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold">${location.metrics.dailyRevenue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{location.metrics.ordersToday}</p>
                          <p className="text-xs text-muted-foreground">Orders</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{location.metrics.customerSatisfaction}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{location.metrics.efficiency}%</p>
                          <p className="text-xs text-muted-foreground">Efficiency</p>
                        </div>
                      </div>
                    )}

                    {location.status === 'coming_soon' && (
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Opening Soon</p>
                        <p className="text-xs text-blue-600">Expected Q2 2025</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search locations, cities, or managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="flagship">Flagship</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                <SelectItem value="food_truck">Food Truck</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleBulkAction('export')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Locations Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Location</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Manager</th>
                      <th className="text-left p-4 font-medium">Revenue</th>
                      <th className="text-left p-4 font-medium">Orders</th>
                      <th className="text-left p-4 font-medium">Rating</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((location) => (
                      <tr key={location.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-muted-foreground">{location.city}, {location.state}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getTypeColor(location.type)}>
                            {location.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(location.status)}>
                            {location.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4">{location.manager}</td>
                        <td className="p-4">
                          <span className="font-medium">
                            ${location.metrics.dailyRevenue.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">{location.metrics.ordersToday}</td>
                        <td className="p-4">
                          <span className="flex items-center">
                            {location.metrics.customerSatisfaction}
                            <Star className="h-3 w-3 ml-1 text-yellow-500" />
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleLocationSync(location.id)}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mr-2" />
                  Revenue analytics chart would go here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  Performance trends chart would go here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeLocations.map((location) => (
                    <div key={location.id} className="flex justify-between items-center">
                      <span>{location.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24">
                          <Progress value={(location.metrics.dailyRevenue / bestPerforming.metrics.dailyRevenue) * 100} />
                        </div>
                        <span className="text-sm font-medium">
                          ${location.metrics.dailyRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeLocations.map((location) => (
                    <div key={location.id} className="flex justify-between items-center">
                      <span>{location.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24">
                          <Progress value={(location.metrics.customerSatisfaction / 5) * 100} />
                        </div>
                        <span className="text-sm font-medium flex items-center">
                          {location.metrics.customerSatisfaction}
                          <Star className="h-3 w-3 ml-1 text-yellow-500" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Location Groups</h3>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locationGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{group.description}</CardDescription>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Locations:</span>
                        <span className="font-medium">{group.locationIds.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Manager:</span>
                        <span className="font-medium">{group.manager}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {group.locationIds.map((locationId) => {
                        const location = locations.find(loc => loc.id === locationId);
                        return location ? (
                          <div key={locationId} className="text-sm p-2 bg-muted rounded flex justify-between">
                            <span>{location.name}</span>
                            <Badge className={getStatusColor(location.status)} variant="outline">
                              {location.status}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
                <CardDescription>Perform actions across multiple locations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => handleBulkAction('sync_menus')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Menus
                  </Button>
                  <Button variant="outline" onClick={() => handleBulkAction('update_hours')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Update Hours
                  </Button>
                  <Button variant="outline" onClick={() => handleBulkAction('push_promotions')}>
                    <Target className="h-4 w-4 mr-2" />
                    Push Promotions
                  </Button>
                  <Button variant="outline" onClick={() => handleBulkAction('staff_notifications')}>
                    <Users className="h-4 w-4 mr-2" />
                    Staff Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Monitor system status across locations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Wifi className="h-4 w-4 mr-2" />
                      Network Status
                    </span>
                    <Badge className="bg-green-100 text-green-800">All Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Camera className="h-4 w-4 mr-2" />
                      POS Systems
                    </span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Processing
                    </span>
                    <Badge className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      Data Sync
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-800">1 Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Menu updated at Downtown Flagship</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New staff member added to Brooklyn Heights</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Inventory alert: Queens Ghost Kitchen</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Daily reports generated for all locations</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
