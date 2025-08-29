import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IntegrationCode } from '@/types/agency';
import { Copy, Code, Settings, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demoUrl?: string;
  restaurantName?: string;
}

export function IntegrationCodeDialog({ open, onOpenChange, demoUrl, restaurantName }: IntegrationCodeDialogProps) {
  const [selectedTenantId, setSelectedTenantId] = useState('demo-12345');
  const [widgetColor, setWidgetColor] = useState('#3B82F6');
  const [widgetSize, setWidgetSize] = useState('medium');
  const { toast } = useToast();

  const generateIntegrationCodes = (): IntegrationCode[] => {
    const baseUrl = 'https://widget.blunari.com';
    const tenantId = selectedTenantId;
    
    return [
      {
        type: 'WordPress Shortcode',
        code: `[blunari_booking tenant_id="${tenantId}" color="${widgetColor}" size="${widgetSize}"]`,
        description: 'Simple WordPress shortcode for easy integration',
        parameters: {
          tenant_id: 'Your unique tenant identifier',
          color: 'Primary color for the widget (hex code)',
          size: 'Widget size: small, medium, large'
        }
      },
      {
        type: 'HTML Embed',
        code: `<div id="blunari-widget-${tenantId}"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.onload = function() {
      BlunariWidget.init({
        containerId: 'blunari-widget-${tenantId}',
        tenantId: '${tenantId}',
        color: '${widgetColor}',
        size: '${widgetSize}',
        responsive: true
      });
    };
    document.head.appendChild(script);
  })();
</script>`,
        description: 'Standard HTML embed code for any website',
        parameters: {
          containerId: 'Unique container ID for the widget',
          tenantId: 'Your tenant identifier',
          responsive: 'Auto-adjust to container width'
        }
      },
      {
        type: 'Widget URL',
        code: `${baseUrl}/embed/${tenantId}?color=${encodeURIComponent(widgetColor)}&size=${widgetSize}`,
        description: 'Direct iframe URL for quick integration',
        parameters: {
          color: 'Widget color theme',
          size: 'Display size preference',
          lang: 'Language code (optional)'
        }
      },
      {
        type: 'API Integration',
        code: `// Initialize Blunari API Client
const blunari = new BlunariAPI({
  tenantId: '${tenantId}',
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create a booking
const booking = await blunari.bookings.create({
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  partySize: 4,
  bookingTime: '2024-02-01T19:00:00Z',
  tableId: 'table-123'
});

console.log('Booking created:', booking.id);`,
        description: 'Full API integration for custom implementations',
        parameters: {
          apiKey: 'Your API authentication key',
          environment: 'production or sandbox',
          webhookUrl: 'Callback URL for booking events'
        }
      }
    ];
  };

  const integrationCodes = generateIntegrationCodes();

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: `${type} code copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: IntegrationCode['type']) => {
    switch (type) {
      case 'WordPress Shortcode':
        return '🔌';
      case 'HTML Embed':
        return '📄';
      case 'Widget URL':
        return '🔗';
      case 'API Integration':
        return '⚡';
      default:
        return '📋';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Integration Code Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Configuration Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  placeholder="demo-12345"
                />
              </div>
              <div>
                <Label htmlFor="widgetColor">Widget Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="widgetColor"
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-16 p-1 h-10"
                  />
                  <Input
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="widgetSize">Widget Size</Label>
                <select 
                  id="widgetSize"
                  value={widgetSize}
                  onChange={(e) => setWidgetSize(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>

          <Tabs defaultValue="WordPress Shortcode" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {integrationCodes.map((integration) => (
                <TabsTrigger key={integration.type} value={integration.type} className="text-xs">
                  {getTypeIcon(integration.type)} {integration.type.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {integrationCodes.map((integration) => (
              <TabsContent key={integration.type} value={integration.type}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {getTypeIcon(integration.type)} {integration.type}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(integration.code, integration.type)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap break-words">
                        <code>{integration.code}</code>
                      </pre>
                    </div>

                    {integration.parameters && (
                      <div>
                        <h4 className="font-medium mb-2">Parameters:</h4>
                        <div className="space-y-2">
                          {Object.entries(integration.parameters).map(([key, description]) => (
                            <div key={key} className="flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0">
                                {key}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {integration.type === 'Widget URL' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(integration.code, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Test Widget
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Implementation Tips</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-200 mt-1 space-y-1">
                  <li>• Test all integrations in a staging environment first</li>
                  <li>• Configure webhook URLs for real-time booking notifications</li>
                  <li>• Use responsive widgets for better mobile experience</li>
                  <li>• Contact support for custom styling and advanced features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}