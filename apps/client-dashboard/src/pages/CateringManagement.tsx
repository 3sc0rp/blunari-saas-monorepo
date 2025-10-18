import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import {
  ChefHat,
  Package,
  ListOrdered,
  Settings,
  BarChart3,
  Menu,
  Plus,
  Calendar,
} from 'lucide-react';

// Import sub-components (to be created)
import { CateringPackagesManager } from '@/components/catering/management/CateringPackagesManager';
import { CateringMenuBuilder } from '@/components/catering/management/CateringMenuBuilder';
import { CateringOrdersManager } from '@/components/catering/management/CateringOrdersManager';
import { CateringAnalyticsDashboard } from '@/components/catering/management/CateringAnalyticsDashboard';
import { CateringWidgetConfig } from '@/components/catering/management/CateringWidgetConfig';

/**
 * Comprehensive Catering Management Page
 * 
 * Provides complete catering system management:
 * - Packages: Create/edit catering packages
 * - Menu: Build menu with categories and items
 * - Orders: Process and track catering orders
 * - Analytics: Revenue and performance metrics
 * - Widget: Configure embeddable catering widget
 */
export default function CateringManagement() {
  const { tenant, isLoading } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading catering management...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No tenant found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-600" />
            Catering Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage catering packages, menus, orders, and your embeddable widget
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {tenant.name}
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Packages</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Widget</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Available to customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$--</div>
                <p className="text-xs text-muted-foreground">From catering orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">In your menu</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common catering management tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button 
                onClick={() => setActiveTab('packages')} 
                variant="outline" 
                className="flex items-center gap-2 justify-start"
              >
                <Plus className="w-4 h-4" />
                New Package
              </Button>
              <Button 
                onClick={() => setActiveTab('menu')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <Plus className="w-4 h-4" />
                Add Menu Item
              </Button>
              <Button 
                onClick={() => setActiveTab('orders')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <Calendar className="w-4 h-4" />
                View Orders
              </Button>
              <Button 
                onClick={() => setActiveTab('widget')} 
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <Settings className="w-4 h-4" />
                Configure Widget
              </Button>
            </CardContent>
          </Card>

          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started with Catering</CardTitle>
              <CardDescription>Set up your catering system in 4 easy steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Build Your Menu</h3>
                  <p className="text-sm text-muted-foreground">
                    Add menu categories and items with pricing, dietary info, and photos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Create Packages</h3>
                  <p className="text-sm text-muted-foreground">
                    Bundle menu items into attractive packages for different event types
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Configure Your Widget</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize colors, branding, and settings for your embeddable catering widget
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Embed on Your Website</h3>
                  <p className="text-sm text-muted-foreground">
                    Copy the embed code and add it to your website to start accepting orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <CateringPackagesManager tenantId={tenant.id} />
        </TabsContent>

        {/* Menu Tab */}
        <TabsContent value="menu">
          <CateringMenuBuilder tenantId={tenant.id} />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <CateringOrdersManager tenantId={tenant.id} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <CateringAnalyticsDashboard tenantId={tenant.id} />
        </TabsContent>

        {/* Widget Configuration Tab */}
        <TabsContent value="widget">
          <CateringWidgetConfig tenantId={tenant.id} tenantSlug={tenant.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

