import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTenantAPI, type TenantData } from '@/hooks/useTenantAPI';
import { useToast } from '@/hooks/use-toast';
import { Building, Settings, BarChart3, RefreshCw, Download, Plus } from 'lucide-react';

interface TenantActionsProps {
  tenant?: TenantData;
  onTenantUpdate?: (tenant: TenantData) => void;
  showBulkActions?: boolean;
}

export const TenantActions: React.FC<TenantActionsProps> = ({
  tenant,
  onTenantUpdate,
  showBulkActions = false,
}) => {
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [features, setFeatures] = useState<any>({});
  
  const { 
    loading, 
    getTenantAnalytics,
    updateTenantFeatures,
    updateTenant,
  } = useTenantAPI();
  
  const { toast } = useToast();

  const handleGetAnalytics = async () => {
    if (!tenant) return;
    
    try {
      const data = await getTenantAnalytics(tenant.id, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      });
      setAnalyticsData(data);
      setShowAnalyticsDialog(true);
    } catch (error) {
      console.error('Failed to get analytics:', error);
    }
  };

  const handleUpdateFeatures = async () => {
    if (!tenant) return;
    
    try {
      await updateTenantFeatures(tenant.id, features);
      toast({
        title: "Features Updated",
        description: `Features for ${tenant.name} have been updated successfully.`,
      });
      setShowFeaturesDialog(false);
    } catch (error) {
      console.error('Failed to update features:', error);
    }
  };

  const handleToggleTenantStatus = async () => {
    if (!tenant) return;
    
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    
    try {
      const updatedTenant = await updateTenant(tenant.id, { status: newStatus });
      toast({
        title: "Status Updated",
        description: `${tenant.name} is now ${newStatus}.`,
      });
      onTenantUpdate?.(updatedTenant);
    } catch (error) {
      console.error('Failed to update tenant status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspended': return 'destructive';
      case 'inactive': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Individual Tenant Actions */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Tenant Management
            </CardTitle>
            <CardDescription>
              Manage {tenant.name} ({tenant.slug})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={getStatusColor(tenant.status)}>
                {tenant.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {tenant.timezone}
              </span>
              <span className="text-sm text-muted-foreground">
                {tenant.currency}
              </span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleGetAnalytics}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'View Analytics'}
              </Button>
              
              <Button 
                onClick={() => setShowFeaturesDialog(true)}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Features
              </Button>
              
              <Button 
                onClick={handleToggleTenantStatus}
                disabled={loading}
                size="sm"
                variant={tenant.status === 'active' ? 'destructive' : 'default'}
              >
                {tenant.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Manage multiple tenants at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Tenant Data
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync All Analytics
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
            >
              <Plus className="mr-2 h-4 w-4" />
              Bulk Provision
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tenant Analytics</DialogTitle>
            <DialogDescription>
              Performance metrics for {tenant?.name}
            </DialogDescription>
          </DialogHeader>
          
          {analyticsData && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Total Bookings</h4>
                <p className="text-2xl font-bold">{analyticsData.total_bookings || 0}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Revenue</h4>
                <p className="text-2xl font-bold">${analyticsData.revenue || 0}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Active Tables</h4>
                <p className="text-2xl font-bold">{analyticsData.active_tables || 0}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Occupancy Rate</h4>
                <p className="text-2xl font-bold">{analyticsData.occupancy_rate || 0}%</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Features Dialog */}
      <Dialog open={showFeaturesDialog} onOpenChange={setShowFeaturesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Features</DialogTitle>
            <DialogDescription>
              Configure feature flags for {tenant?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {[
              { key: 'advanced_analytics', label: 'Advanced Analytics' },
              { key: 'api_access', label: 'API Access' },
              { key: 'custom_branding', label: 'Custom Branding' },
              { key: 'priority_support', label: 'Priority Support' },
              { key: 'white_label', label: 'White Label' },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <Label htmlFor={feature.key}>{feature.label}</Label>
                <Switch
                  id={feature.key}
                  checked={features[feature.key] || false}
                  onCheckedChange={(checked) =>
                    setFeatures(prev => ({ ...prev, [feature.key]: checked }))
                  }
                />
              </div>
            ))}
            
            <Button onClick={handleUpdateFeatures} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Features
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};