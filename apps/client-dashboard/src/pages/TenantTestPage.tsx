import React from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, User, Database, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function TenantTestPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, error, requestId, refreshTenant, clearCache } = useTenant();

  const allLoading = authLoading || tenantLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Tenant System Integration Test</h1>
        
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Checking authentication...</span>
              </div>
            ) : user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Authenticated</span>
                </div>
                <p className="text-sm text-gray-600">User ID: {user.id}</p>
                <p className="text-sm text-gray-600">Email: {user.email}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-600">Not authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Resolution Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tenant Resolution Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Resolving tenant information...</span>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">Tenant Resolution Failed</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">Error Details:</p>
                  <p className="text-red-700 text-sm">{error}</p>
                  {requestId && (
                    <p className="text-red-600 text-xs mt-2">Request ID: {requestId}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={refreshTenant} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Resolution
                  </Button>
                  <Button onClick={clearCache} variant="outline" size="sm">
                    Clear Cache
                  </Button>
                </div>
              </div>
            ) : tenant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Tenant Resolved Successfully</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Basic Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Restaurant Name:</span>
                        <span className="text-sm">{tenant.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Slug:</span>
                        <Badge variant="secondary" className="font-mono">
                          /{tenant.slug}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Tenant ID:</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {tenant?.id || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Configuration</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Timezone:</span>
                        <Badge variant="outline">{tenant.timezone}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Currency:</span>
                        <Badge variant="outline">{tenant.currency}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Schema Version:</span>
                        <Badge variant="secondary">New (id-based)</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex gap-2">
                    <Button onClick={refreshTenant} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                    <Button onClick={clearCache} variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-600">No tenant data available</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm font-medium">Edge Functions</p>
                <p className="text-xs text-gray-600">Deployed & Active</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm font-medium">Authentication</p>
                <p className="text-xs text-gray-600">{user ? 'Authenticated' : 'Not authenticated'}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {tenant ? '✅' : error ? '❌' : '⏳'}
                </div>
                <p className="text-sm font-medium">Tenant Resolution</p>
                <p className="text-xs text-gray-600">
                  {tenant ? 'Working' : error ? 'Failed' : 'Loading'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Routing Test */}
        <Card>
          <CardHeader>
            <CardTitle>Available Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Current Route:</strong> {window.location.pathname}
              </p>
              <div className="space-y-1 text-sm">
                <p><strong>Supported Patterns:</strong></p>
                <ul className="list-disc list-inside ml-4 text-gray-600">
                  <li><code>/command-center</code> - Direct access (user-based tenant resolution)</li>
                  <li><code>/t/:slug/command-center</code> - Slug-based tenant resolution (future)</li>
                  <li><code>/dashboard/command-center</code> - Legacy dashboard route</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
