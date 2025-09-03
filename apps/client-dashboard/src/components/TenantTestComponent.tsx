import React from 'react';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export function TenantTestComponent() {
  const { tenant, tenantId, loading, error, requestId, refreshTenant, clearCache } = useTenant();

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Tenant...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Resolving restaurant information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Tenant Resolution Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600">{error}</p>
          {requestId && (
            <p className="text-xs text-muted-foreground">Request ID: {requestId}</p>
          )}
          <Button onClick={refreshTenant} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!tenant) {
    return (
      <Card className="w-full max-w-md border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            No Tenant Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshTenant} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Tenant Resolved Successfully
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-semibold">{tenant.name}</p>
          <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Tenant ID:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {tenantId}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium">Timezone:</span>
            <Badge variant="outline" className="text-xs">
              {tenant.timezone}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium">Currency:</span>
            <Badge variant="outline" className="text-xs">
              {tenant.currency}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={refreshTenant} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearCache} variant="outline" size="sm">
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
