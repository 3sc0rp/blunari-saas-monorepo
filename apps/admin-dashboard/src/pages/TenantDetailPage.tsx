import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Settings, 
  Globe, 
  BarChart3, 
  Users, 
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Building2,
  Utensils,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "@/components/dashboard/KPICard";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface TenantMetrics {
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  conversionRate: number;
  avgBookingValue: number;
  tablesCount: number;
  domainsCount: number;
  featuresEnabled: number;
}

const TenantDetailPage = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails();
    }
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      // Fetch tenant basic info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Fetch tenant metrics
      const [
        { count: bookingsCount },
        { count: tablesCount },
        { count: domainsCount },
        { count: featuresCount }
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('restaurant_tables').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('domains').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tenant_features').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('enabled', true)
      ]);

      // Fetch recent bookings for revenue calculation
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select('deposit_amount, party_size')
        .eq('tenant_id', tenantId)
        .eq('status', 'confirmed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalRevenue = recentBookings?.reduce((sum, booking) => 
        sum + (booking.deposit_amount || 0), 0) || 0;
      
      const avgBookingValue = recentBookings?.length 
        ? totalRevenue / recentBookings.length 
        : 0;

      setMetrics({
        totalBookings: bookingsCount || 0,
        totalRevenue: totalRevenue / 100, // Convert from cents
        activeBookings: Math.floor((bookingsCount || 0) * 0.3), // Estimate
        conversionRate: 65.5, // Mock data
        avgBookingValue: avgBookingValue / 100, // Convert from cents
        tablesCount: tablesCount || 0,
        domainsCount: domainsCount || 0,
        featuresEnabled: featuresCount || 0
      });

    } catch (error) {
      console.error('Error fetching tenant details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenant details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/tenants')}
          className="mt-4"
        >
          Back to Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/admin/tenants')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {tenant.name}
            </h1>
            {getStatusBadge(tenant.status)}
          </div>
          <p className="text-muted-foreground">
            Tenant ID: {tenant.id} • Created {new Date(tenant.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/admin/tenants/${tenant.id}/settings`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`/admin/tenants/${tenant.id}/domains`)}
          >
            <Globe className="h-4 w-4 mr-2" />
            Domains
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Bookings"
            value={metrics.totalBookings.toString()}
            trend={{
              value: 12,
              label: "this month",
              direction: "up"
            }}
            icon={Calendar}
          />
          <KPICard
            title="Revenue (30d)"
            value={`$${metrics.totalRevenue.toFixed(2)}`}
            trend={{
              value: 18,
              label: "this month", 
              direction: "up"
            }}
            icon={DollarSign}
          />
          <KPICard
            title="Active Bookings"
            value={metrics.activeBookings.toString()}
            trend={{
              value: 5,
              label: "vs last week",
              direction: "up"
            }}
            icon={Users}
          />
          <KPICard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            trend={{
              value: 2.1,
              label: "this month",
              direction: "up"
            }}
            icon={BarChart3}
          />
        </div>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tenant Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Restaurant Name</label>
                    <p className="text-foreground">{tenant.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Slug</label>
                    <p className="text-foreground">/{tenant.slug}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(tenant.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Currency</label>
                    <p className="text-foreground">{tenant.currency}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{tenant.timezone}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-foreground">{new Date(tenant.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Resource Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{metrics.tablesCount}</div>
                      <div className="text-sm text-muted-foreground">Tables</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{metrics.domainsCount}</div>
                      <div className="text-sm text-muted-foreground">Domains</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{metrics.featuresEnabled}</div>
                      <div className="text-sm text-muted-foreground">Features</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">${metrics.avgBookingValue.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Avg Booking</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Configuration</CardTitle>
              <CardDescription>
                Manage tenant settings, features, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Configuration panel coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Domain Management</CardTitle>
              <CardDescription>
                Manage custom domains and SSL certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Domain management panel coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantDetailPage;