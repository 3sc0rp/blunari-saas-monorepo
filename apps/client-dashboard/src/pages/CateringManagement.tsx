import React, { useState, useMemo } from 'react';
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

// Import sub-components
import { CateringPackagesManager } from '@/components/catering/management/CateringPackagesManager';
import { MenuBuilder } from '@/components/catering/MenuBuilder';
import { CateringOrdersManager } from '@/components/catering/management/CateringOrdersManager';
import { CateringAnalyticsDashboard } from '@/components/catering/management/CateringAnalyticsDashboard';
import { CateringWidgetConfig } from '@/components/catering/management/CateringWidgetConfig';

// Import new components
import { ActivityFeed } from '@/components/catering/ActivityFeed';
import { TrendIndicator } from '@/components/analytics/TrendIndicator';
import { MetricCardSkeletonWithChart } from '@/components/ui/enhanced-skeletons';
import { AnimatedCounter } from '@/components/analytics/AnimatedCounter';
import { Sparkline, generateTrendData } from '@/components/analytics/Sparkline';
import { KanbanOrderBoard } from '@/components/catering/KanbanOrderBoard';

// Import data hooks
import { useCateringPackages } from '@/hooks/useCateringPackages';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { useCateringAnalytics } from '@/hooks/useCateringAnalytics';

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
  const [ordersView, setOrdersView] = useState<'kanban' | 'table'>('kanban');
  
  // Fetch real data for metrics
  const { packages, isLoading: packagesLoading } = useCateringPackages(tenant?.id || '');
  const { orders, isLoading: ordersLoading } = useCateringOrders(tenant?.id || '');
  const { analytics, isLoading: analyticsLoading } = useCateringAnalytics(tenant?.id || '');
  
  // Calculate real-time metrics
  const metrics = useMemo(() => {
    const activePackages = packages?.filter(p => p.active).length || 0;
    const pendingOrders = orders?.filter(o => 
      ['inquiry', 'quoted'].includes(o.status)
    ).length || 0;
    
    // Calculate this month's revenue (current month only)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = orders
      ?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear &&
               ['confirmed', 'completed'].includes(o.status);
      })
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    
    // Calculate last month's revenue for trend
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthRevenue = orders
      ?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === lastMonth && 
               orderDate.getFullYear() === lastMonthYear &&
               ['confirmed', 'completed'].includes(o.status);
      })
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    
    const revenueTrend = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    return {
      activePackages,
      pendingOrders,
      monthlyRevenue: monthlyRevenue / 100, // Convert cents to dollars
      revenueTrend: Math.round(revenueTrend),
      totalOrders: orders?.length || 0,
      menuItemsCount: 0, // TODO: Add when menu items hook is available
    };
  }, [packages, orders]);

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
          {/* Metrics Cards with Real Data */}
          {packagesLoading || ordersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCardSkeletonWithChart />
              <MetricCardSkeletonWithChart />
              <MetricCardSkeletonWithChart />
              <MetricCardSkeletonWithChart />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={metrics.activePackages} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Available to customers
                  </p>
                  <Sparkline 
                    data={generateTrendData(30, metrics.activePackages, 0.1)}
                    color="primary"
                    height={40}
                    showTooltip={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={metrics.pendingOrders} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      Awaiting confirmation
                    </p>
                    {metrics.pendingOrders > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Action needed
                      </Badge>
                    )}
                  </div>
                  <Sparkline 
                    data={generateTrendData(30, metrics.pendingOrders + 2, 0.3)}
                    color="warning"
                    height={40}
                    showTooltip={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $<AnimatedCounter 
                      value={metrics.monthlyRevenue} 
                      decimals={2}
                      separator={true}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-muted-foreground">
                      From catering orders
                    </p>
                    {metrics.revenueTrend !== 0 && (
                      <TrendIndicator value={metrics.revenueTrend} variant="auto" />
                    )}
                  </div>
                  <Sparkline 
                    data={generateTrendData(30, metrics.monthlyRevenue, 0.15)}
                    color={metrics.revenueTrend >= 0 ? 'success' : 'destructive'}
                    height={40}
                    showTooltip={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={metrics.totalOrders} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    All time
                  </p>
                  <Sparkline 
                    data={generateTrendData(30, metrics.totalOrders, 0.05)}
                    color="muted"
                    height={40}
                    showTooltip={false}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity Feed and Quick Actions Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest orders and package updates</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed tenantId={tenant.id} limit={5} compact={false} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common catering management tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button 
                  onClick={() => setActiveTab('packages')} 
                  variant="outline" 
                  className="flex items-center gap-2 justify-start h-auto py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">New Package</div>
                    <div className="text-xs text-muted-foreground">Create catering package</div>
                  </div>
                </Button>
                <Button 
                  onClick={() => setActiveTab('menu')} 
                  variant="outline"
                  className="flex items-center gap-2 justify-start h-auto py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Add Menu Item</div>
                    <div className="text-xs text-muted-foreground">Build your catering menu</div>
                  </div>
                </Button>
                <Button 
                  onClick={() => setActiveTab('orders')} 
                  variant="outline"
                  className="flex items-center gap-2 justify-start h-auto py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">View Orders</div>
                    <div className="text-xs text-muted-foreground">Manage catering requests</div>
                  </div>
                </Button>
                <Button 
                  onClick={() => setActiveTab('widget')} 
                  variant="outline"
                  className="flex items-center gap-2 justify-start h-auto py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Configure Widget</div>
                    <div className="text-xs text-muted-foreground">Customize embed code</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

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
          <MenuBuilder tenantId={tenant.id} />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Catering Orders</h3>
              <p className="text-sm text-muted-foreground">
                Manage and track all catering orders
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={ordersView === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrdersView('kanban')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={ordersView === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrdersView('table')}
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {/* Render appropriate view */}
          {ordersView === 'kanban' ? (
            <KanbanOrderBoard tenantId={tenant.id} />
          ) : (
            <CateringOrdersManager tenantId={tenant.id} />
          )}
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

