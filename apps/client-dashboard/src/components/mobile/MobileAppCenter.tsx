import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Download, 
  Users, 
  Star, 
  MessageSquare, 
  ShoppingCart,
  Bell,
  CreditCard,
  MapPin,
  Calendar,
  QrCode,
  Wifi,
  Battery,
  Share2,
  TrendingUp,
  BarChart3,
  Settings,
  Globe,
  Apple,
  PlayCircle,
  Tablet,
  Monitor
} from 'lucide-react';

interface MobileApp {
  id: string;
  name: string;
  type: 'customer' | 'staff' | 'manager' | 'delivery';
  description: string;
  platform: 'ios' | 'android' | 'pwa' | 'hybrid';
  status: 'published' | 'development' | 'review' | 'beta';
  version: string;
  downloads: number;
  rating: number;
  reviews: number;
  lastUpdate: Date;
  features: string[];
  screenshots: string[];
  buildProgress?: number;
}

interface MobileMetrics {
  totalDownloads: number;
  activeUsers: number;
  averageRating: number;
  totalReviews: number;
  crashRate: number;
  retentionRate: number;
}

const mobileApps: MobileApp[] = [
  {
    id: 'customer-ios',
    name: 'Blunari Customer',
    type: 'customer',
    description: 'Complete customer experience app for ordering, reservations, and loyalty',
    platform: 'ios',
    status: 'published',
    version: '2.1.4',
    downloads: 15420,
    rating: 4.7,
    reviews: 1230,
    lastUpdate: new Date(Date.now() - 86400000 * 3),
    features: [
      'Online Ordering',
      'Table Reservations', 
      'Loyalty Program',
      'Push Notifications',
      'Mobile Payments',
      'Order Tracking',
      'Reviews & Ratings',
      'Menu Browse'
    ],
    screenshots: []
  },
  {
    id: 'customer-android',
    name: 'Blunari Customer',
    type: 'customer',
    description: 'Complete customer experience app for ordering, reservations, and loyalty',
    platform: 'android',
    status: 'published',
    version: '2.1.2',
    downloads: 23850,
    rating: 4.6,
    reviews: 1845,
    lastUpdate: new Date(Date.now() - 86400000 * 5),
    features: [
      'Online Ordering',
      'Table Reservations',
      'Loyalty Program', 
      'Push Notifications',
      'Mobile Payments',
      'Order Tracking',
      'Reviews & Ratings',
      'Menu Browse'
    ],
    screenshots: []
  },
  {
    id: 'staff-app',
    name: 'Blunari Staff',
    type: 'staff',
    description: 'Staff management app for order processing and table management',
    platform: 'hybrid',
    status: 'published',
    version: '1.8.1',
    downloads: 2450,
    rating: 4.8,
    reviews: 156,
    lastUpdate: new Date(Date.now() - 86400000 * 7),
    features: [
      'Order Management',
      'Table Status',
      'Kitchen Communication',
      'Shift Management',
      'Customer Profiles',
      'Payment Processing',
      'Inventory Alerts',
      'Performance Metrics'
    ],
    screenshots: []
  },
  {
    id: 'manager-tablet',
    name: 'Blunari Manager',
    type: 'manager',
    description: 'Comprehensive management dashboard for tablets and mobile devices',
    platform: 'hybrid',
    status: 'beta',
    version: '1.5.0-beta',
    downloads: 890,
    rating: 4.5,
    reviews: 67,
    lastUpdate: new Date(Date.now() - 86400000 * 2),
    features: [
      'Real-time Analytics',
      'Staff Scheduling',
      'Inventory Management',
      'Financial Reports',
      'Customer Insights',
      'Marketing Tools',
      'Multi-location Support',
      'Advanced Settings'
    ],
    screenshots: []
  },
  {
    id: 'delivery-driver',
    name: 'Blunari Delivery',
    type: 'delivery',
    description: 'Delivery driver app for order fulfillment and route optimization',
    platform: 'hybrid',
    status: 'development',
    version: '1.0.0-alpha',
    downloads: 0,
    rating: 0,
    reviews: 0,
    lastUpdate: new Date(),
    buildProgress: 65,
    features: [
      'Route Optimization',
      'Real-time GPS',
      'Order Updates',
      'Customer Communication',
      'Delivery Proof',
      'Earnings Tracking',
      'Performance Metrics',
      'Offline Mode'
    ],
    screenshots: []
  },
  {
    id: 'customer-pwa',
    name: 'Blunari Web App',
    type: 'customer',
    description: 'Progressive Web App for cross-platform customer experience',
    platform: 'pwa',
    status: 'published',
    version: '3.2.1',
    downloads: 45230,
    rating: 4.4,
    reviews: 2340,
    lastUpdate: new Date(Date.now() - 86400000 * 1),
    features: [
      'Cross-platform',
      'Offline Support',
      'Push Notifications',
      'App-like Experience',
      'Quick Installation',
      'Auto Updates',
      'Responsive Design',
      'Native Features'
    ],
    screenshots: []
  }
];

const mockMetrics: MobileMetrics = {
  totalDownloads: 87840,
  activeUsers: 34920,
  averageRating: 4.6,
  totalReviews: 5638,
  crashRate: 0.2,
  retentionRate: 78
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'ios': return Apple;
    case 'android': return PlayCircle;
    case 'pwa': return Globe;
    case 'hybrid': return Tablet;
    default: return Smartphone;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'development': return 'bg-blue-100 text-blue-800';
    case 'review': return 'bg-yellow-100 text-yellow-800';
    case 'beta': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'customer': return 'bg-blue-100 text-blue-800';
    case 'staff': return 'bg-green-100 text-green-800';
    case 'manager': return 'bg-purple-100 text-purple-800';
    case 'delivery': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function MobileAppCenter() {
  const [selectedApp, setSelectedApp] = useState<MobileApp | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBuilding, setIsBuilding] = useState(false);

  const publishedApps = mobileApps.filter(app => app.status === 'published');
  const developmentApps = mobileApps.filter(app => app.status === 'development' || app.status === 'beta');

  const handleBuildApp = (app: MobileApp) => {
    setIsBuilding(true);
    // Simulate build process
    setTimeout(() => {
      setIsBuilding(false);
    }, 5000);
  };

  const handlePublishApp = (app: MobileApp) => {
    // Update app status to published
    console.log(`Publishing ${app.name}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mobile App Center</h1>
          <p className="text-muted-foreground">
            Manage your restaurant's mobile applications and PWAs across all platforms
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Generate QR Code
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Build Apps
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.totalDownloads.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.averageRating}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.totalReviews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.retentionRate}%</p>
                <p className="text-xs text-muted-foreground">Retention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Battery className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{mockMetrics.crashRate}%</p>
                <p className="text-xs text-muted-foreground">Crash Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="published">Published Apps</TabsTrigger>
          <TabsTrigger value="development">In Development</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mobileApps.map((app) => {
              const PlatformIcon = getPlatformIcon(app.platform);
              return (
                <Card key={app.id} className="cursor-pointer hover:shadow-lg transition-shadow" 
                      onClick={() => setSelectedApp(app)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <PlatformIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={getTypeColor(app.type)}>
                              {app.type.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(app.status)}>
                              {app.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{app.description}</CardDescription>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Version {app.version}</span>
                      <span>{app.platform.toUpperCase()}</span>
                    </div>

                    {app.status === 'published' && (
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold">{app.downloads.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Downloads</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold flex items-center justify-center">
                            {app.rating} <Star className="h-3 w-3 ml-1 text-yellow-500" />
                          </p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{app.reviews}</p>
                          <p className="text-xs text-muted-foreground">Reviews</p>
                        </div>
                      </div>
                    )}

                    {app.buildProgress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Build Progress</span>
                          <span>{app.buildProgress}%</span>
                        </div>
                        <Progress value={app.buildProgress} className="w-full" />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {app.status === 'published' ? (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleBuildApp(app)} className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Build
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Published Applications</h3>
            <div className="grid grid-cols-1 gap-4">
              {publishedApps.map((app) => {
                const PlatformIcon = getPlatformIcon(app.platform);
                return (
                  <Card key={app.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <PlatformIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{app.name}</h4>
                            <p className="text-sm text-muted-foreground">{app.platform.toUpperCase()} • v{app.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-lg font-bold">{app.downloads.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Downloads</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold flex items-center">
                              {app.rating} <Star className="h-3 w-3 ml-1 text-yellow-500" />
                            </p>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                          <Button>
                            View Store
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="development" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Apps in Development</h3>
              <Button onClick={() => setIsBuilding(true)} disabled={isBuilding}>
                {isBuilding ? (
                  <>
                    <Wifi className="h-4 w-4 mr-2 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Build All
                  </>
                )}
              </Button>
            </div>
            
            {isBuilding && (
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  Building applications... This may take several minutes.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4">
              {developmentApps.map((app) => {
                const PlatformIcon = getPlatformIcon(app.platform);
                return (
                  <Card key={app.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <PlatformIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{app.name}</h4>
                            <p className="text-sm text-muted-foreground">{app.platform.toUpperCase()} • v{app.version}</p>
                            {app.buildProgress !== undefined && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Build Progress</span>
                                  <span>{app.buildProgress}%</span>
                                </div>
                                <Progress value={app.buildProgress} className="w-full" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline">
                            Test
                          </Button>
                          <Button onClick={() => handlePublishApp(app)}>
                            Publish
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Download Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mr-2" />
                  Download analytics chart would go here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  Engagement metrics chart would go here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Android
                    </span>
                    <span className="font-semibold">45%</span>
                  </div>
                  <Progress value={45} />
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Apple className="h-4 w-4 mr-2" />
                      iOS
                    </span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <Progress value={35} />
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      PWA
                    </span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <Progress value={20} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>App Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Crash Rate</span>
                    <span className="text-green-600 font-semibold">{mockMetrics.crashRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retention Rate</span>
                    <span className="text-green-600 font-semibold">{mockMetrics.retentionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Time</span>
                    <span className="text-green-600 font-semibold">1.2s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Satisfaction</span>
                    <span className="text-green-600 font-semibold">4.6/5</span>
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
