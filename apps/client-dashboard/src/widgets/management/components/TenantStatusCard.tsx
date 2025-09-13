/**
 * TenantStatusCard Component
 * Displays tenant information and configuration status
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Download } from 'lucide-react';

interface TenantStatusCardProps {
  tenant?: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
    timezone?: string;
    currency?: string;
  } | null;
  tenantSlug: string;
  tenantIdentifier: string;
  activeWidgetType: 'booking' | 'catering';
  hasUnsavedChanges: boolean;
  onExportConfig: () => void;
  tenantLoading: boolean;
  tenantError: string | null;
}

export const TenantStatusCard: React.FC<TenantStatusCardProps> = ({
  tenant,
  tenantSlug,
  tenantIdentifier,
  activeWidgetType,
  hasUnsavedChanges,
  onExportConfig,
  tenantLoading,
  tenantError,
}) => {
  if (tenantLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading tenant information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tenantError) {
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
              <span className="text-destructive-foreground text-xs">!</span>
            </div>
            <div>
              <p className="font-medium text-destructive">Tenant Loading Error</p>
              <p className="text-sm text-muted-foreground">
                Unable to load tenant information. Using demo configuration for widget preview.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current tenant slug: {tenantSlug}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">
                  {tenant?.name || 'Demo Restaurant'} 
                  <Badge variant="outline" className="ml-2 text-xs">
                    {tenantSlug}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  Configuration ID: <code className="text-xs bg-background px-1 rounded">{tenantIdentifier}</code>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">Widget Namespace</p>
              <code className="text-xs bg-background px-2 py-1 rounded">
                /{activeWidgetType === 'booking' ? 'book' : 'catering'}/{tenantSlug}
              </code>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportConfig}
                className="text-xs"
              >
                <Download className="w-4 h-4 mr-1" />
                Export Config
              </Button>
              
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {tenant?.id && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Tenant ID:</span>
                <p className="font-mono">{tenant.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="capitalize">{tenant.status || 'active'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timezone:</span>
                <p>{tenant.timezone || 'UTC'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Currency:</span>
                <p>{tenant.currency || 'USD'}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};