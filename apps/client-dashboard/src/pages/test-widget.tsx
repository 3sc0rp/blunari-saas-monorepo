import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink } from 'lucide-react';

const TestWidget: React.FC = () => {
  const [slug, setSlug] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const generateWidgetUrl = async () => {
    setLoading(true);
    setError(null);
    setWidgetUrl(null);
    setTokenInfo(null);

    try {      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase configuration');
      }

      // Step 1: Create widget token
      const response = await fetch(`${supabaseUrl}/functions/v1/create-widget-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          slug: slug,
          widget_type: 'booking',
          config_version: '2.0',
          ttl_seconds: 3600
        })
      });      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestWidget] Token creation failed:', errorText);
        throw new Error(`Token creation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();      setTokenInfo(data);

      // Step 2: Generate widget URL
      const baseUrl = window.location.origin;
      const widgetPath = `/public-widget/book/${slug}`;
      const fullUrl = `${baseUrl}${widgetPath}?token=${encodeURIComponent(data.token)}`;
      
      setWidgetUrl(fullUrl);    } catch (err) {
      console.error('[TestWidget] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openWidget = () => {
    if (widgetUrl) {
      window.open(widgetUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Widget URL Generator & Tester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <Label htmlFor="slug">Tenant Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="demo"
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateWidgetUrl} 
              disabled={loading || !slug}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Widget URL'}
            </Button>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Token Info Display */}
            {tokenInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Token Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Expires:</strong> {new Date(tokenInfo.expires_at * 1000).toLocaleString()}
                  </div>
                  <div>
                    <strong>Token Preview:</strong> {tokenInfo.token.substring(0, 50)}...
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Widget URL Display */}
            {widgetUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Generated Widget URL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-gray-100 rounded text-sm font-mono break-all">
                    {widgetUrl}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(widgetUrl)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </Button>
                    
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={openWidget}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Test Widget
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debug Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Debug Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Generate a widget URL above</li>
                  <li>Click "Test Widget" to open in new tab</li>
                  <li>Open browser DevTools (F12)</li>
                  <li>Go to Console tab</li>
                  <li>Try to make a booking and watch the logs</li>
                  <li>Check Network tab for failed requests</li>
                  <li>Look for [BookingWidget], [ConfirmationStep], and [booking-proxy] log messages</li>
                </ol>
                
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <strong>What to look for:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>Token presence and validity</li>
                    <li>API call parameters</li>
                    <li>Response status and errors</li>
                    <li>Missing required data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestWidget;
