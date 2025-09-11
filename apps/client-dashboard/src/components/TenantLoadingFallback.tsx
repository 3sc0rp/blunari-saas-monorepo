import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, Info } from 'lucide-react';

/**
 * Tenant Loading Fallback Component
 * Provides better UX when tenant lookup fails or takes too long
 */
const TenantLoadingFallback = ({ 
  tenantSlug, 
  error, 
  onRetry, 
  isLoading = false 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown > 0 && !isLoading) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onRetry();
      setCountdown(10);
    }
  }, [countdown, isLoading, onRetry]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0B0B45' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Loading Restaurant...' : 'Restaurant Not Found'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isLoading 
              ? `Loading "${tenantSlug}" restaurant data...`
              : `Could not find restaurant "${tenantSlug}"`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'Failed to load restaurant data'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={onRetry}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>

            {!isLoading && (
              <p className="text-sm text-gray-500 text-center">
                Auto-retry in {countdown} seconds
              </p>
            )}
          </div>

          {/* Debug Information Toggle */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-xs text-gray-500"
            >
              <Info className="mr-1 h-3 w-3" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>

            {showDetails && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs space-y-2">
                <div>
                  <strong>Tenant Slug:</strong> {tenantSlug || 'None'}
                </div>
                <div>
                  <strong>Current URL:</strong> {window.location.href}
                </div>
                <div>
                  <strong>Error:</strong> {error?.message || 'Unknown error'}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <strong>Suggestions:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-1 text-gray-600">
                    <li>Check if the restaurant slug is correct</li>
                    <li>Try refreshing the page</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantLoadingFallback;
