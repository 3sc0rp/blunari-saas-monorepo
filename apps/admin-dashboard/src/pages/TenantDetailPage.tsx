import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useAdminAPI } from '@/hooks/useAdminAPI';
import { TenantFeaturesTab } from '@/components/admin/TenantFeaturesTab';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/hooks/use-toast';
import type { TenantData } from '@/types/admin';

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getTenant, resendWelcomeEmail } = useAdminAPI();
  
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoadingPage(true);
      setError(null);
      const tenantData = await getTenant(tenantId);
      setTenant(tenantData);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tenant');
    } finally {
      setLoadingPage(false);
    }
  }, [tenantId, getTenant]);

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId, fetchTenant]);

  const handleResendWelcomeEmail = async () => {
    if (!tenant) return;
    
    try {
      setResending(true);
      const { jobId, message, email } = await resendWelcomeEmail({ id: tenant.id, slug: tenant.slug });
      const sent = email?.success === true;
      const title = sent ? 'Sent' : 'Queued';
      const desc = sent
        ? (email?.message || 'Welcome email sent')
        : (message || email?.warning || email?.error || (jobId ? `Job ${jobId}` : 'Welcome email has been queued for delivery.'));
      toast({ title, description: desc });
    } catch (error) {
      console.error('Error resending welcome email:', error);
      toast({ title: 'Failed to Send Email', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  if (loadingPage) {
    return <LoadingState title="Loading Tenant" description="Fetching tenant details and configuration" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <ErrorState 
          title="Failed to Load Tenant"
          description={error}
        />
        <Button onClick={fetchTenant} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <ErrorState 
          title="Tenant Not Found"
          description="The requested tenant could not be found"
        />
        <Button onClick={() => navigate('/admin/tenants')} variant="outline">
          Back to Tenants
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/admin/tenants')}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
            </div>
            {getStatusBadge(tenant.status)}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendWelcomeEmail}
            disabled={resending}
          >
            {resending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Resend Welcome Email
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Domains</p>
                <p className="text-2xl font-bold">{tenant.domainsCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{tenant.analytics?.total_bookings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold">{tenant.analytics?.active_tables || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Details */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>
            Basic tenant configuration and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Restaurant Name</label>
              <p className="text-foreground">{tenant.name}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <p className="font-mono text-sm">/{tenant.slug}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Timezone</label>
              <p className="text-foreground">{tenant.timezone}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <p className="text-foreground">{tenant.currency}</p>
            </div>

            {tenant.email && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{tenant.email}</p>
                </div>
              </div>
            )}

            {tenant.phone && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{tenant.phone}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-foreground">{tenant.created_at ? new Date(tenant.created_at).toLocaleString() : '-'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-foreground">{tenant.updated_at ? new Date(tenant.updated_at).toLocaleString() : '-'}</p>
            </div>
          </div>

          {tenant.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-foreground">{tenant.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <TenantFeaturesTab tenantSlug={tenant.slug} />
        </TabsContent>

        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Domain Management</CardTitle>
              <CardDescription>
                Manage custom domains and DNS configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Domain management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                Performance metrics and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}