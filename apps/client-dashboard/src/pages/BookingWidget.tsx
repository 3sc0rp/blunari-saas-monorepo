import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/hooks/useTenant';
import BookingWidget from '@/components/booking/BookingWidget';
import PageHeader from '@/components/ui/page-header';
import { 
  Code, 
  Eye, 
  Settings, 
  Copy, 
  ExternalLink, 
  Palette,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Download
} from 'lucide-react';

const BookingWidgetPage: React.FC = () => {
  const { tenant } = useTenant();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [widgetSettings, setWidgetSettings] = useState({
    theme: 'light',
    primaryColor: '#3b82f6',
    borderRadius: 'rounded',
    showAvailability: true,
    showPricing: false,
    requirePhone: true,
    allowCancellation: true,
    maxAdvanceBooking: 30
  });

  const embedCode = `<script src="${window.location.origin}/widget/booking.js"></script>
<div id="booking-widget" data-restaurant="${tenant?.slug || 'demo'}"></div>`;

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return 'w-80';
      case 'tablet': return 'w-96';
      default: return 'w-full max-w-2xl';
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    console.log('Embed code copied!');
  };

  const handleOpenPreview = () => {
    window.open(`/booking/${tenant?.slug}`, '_blank');
  };

  const handleDownloadGuide = () => {
    console.log('Downloading integration guide...');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Booking Widget"
        description="Embed a booking widget on your website to accept reservations directly from your customers."
        primaryAction={{
          label: 'Copy Embed Code',
          onClick: handleCopyCode,
          icon: Copy
        }}
        secondaryActions={[
          {
            label: 'Open Preview',
            onClick: handleOpenPreview,
            icon: ExternalLink,
            variant: 'outline'
          },
          {
            label: 'Download Guide',
            onClick: handleDownloadGuide,
            icon: Download,
            variant: 'ghost'
          }
        ]}
        tabs={[
          { value: 'widget', label: 'Widget Setup' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'integrations', label: 'Integrations' }
        ]}
        activeTab="widget"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Widget Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Widget Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Theme</label>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant={widgetSettings.theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWidgetSettings(prev => ({ ...prev, theme: 'light' }))}
                  >
                    Light
                  </Button>
                  <Button 
                    variant={widgetSettings.theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWidgetSettings(prev => ({ ...prev, theme: 'dark' }))}
                  >
                    Dark
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Primary Color</label>
                <Input
                  type="color"
                  value={widgetSettings.primaryColor}
                  onChange={(e) => setWidgetSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="mt-2 h-10"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Availability</label>
                  <Switch
                    checked={widgetSettings.showAvailability}
                    onCheckedChange={(checked) => setWidgetSettings(prev => ({ ...prev, showAvailability: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Pricing</label>
                  <Switch
                    checked={widgetSettings.showPricing}
                    onCheckedChange={(checked) => setWidgetSettings(prev => ({ ...prev, showPricing: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Require Phone</label>
                  <Switch
                    checked={widgetSettings.requirePhone}
                    onCheckedChange={(checked) => setWidgetSettings(prev => ({ ...prev, requirePhone: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Allow Cancellation</label>
                  <Switch
                    checked={widgetSettings.allowCancellation}
                    onCheckedChange={(checked) => setWidgetSettings(prev => ({ ...prev, allowCancellation: checked }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Advance Booking (days)</label>
                <Input
                  type="number"
                  value={widgetSettings.maxAdvanceBooking}
                  onChange={(e) => setWidgetSettings(prev => ({ ...prev, maxAdvanceBooking: Number(e.target.value) }))}
                  className="mt-2"
                  min="1"
                  max="365"
                />
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">HTML Snippet</label>
                  <Textarea
                    value={embedCode}
                    readOnly
                    className="mt-2 font-mono text-xs"
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Docs
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Add this code to your website where you want the booking widget to appear.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Views</span>
                  <span className="font-medium">2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conversions</span>
                  <span className="font-medium">142</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <span className="font-medium">4.99%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className={`transition-all duration-300 ${getPreviewWidth()}`}>
                  <div className="border rounded-lg p-4 bg-background">
                    <div className="p-4 border rounded bg-muted/20">
                      <p className="text-center text-muted-foreground">
                        Booking Widget Preview - {tenant?.name || 'Demo Restaurant'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="website" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="website">Website</TabsTrigger>
                  <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                  <TabsTrigger value="shopify">Shopify</TabsTrigger>
                </TabsList>
                
                <TabsContent value="website" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Copy the embed code</h4>
                    <p className="text-sm text-muted-foreground">
                      Use the HTML snippet from the left panel.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">2. Paste into your HTML</h4>
                    <p className="text-sm text-muted-foreground">
                      Add the code where you want the booking widget to appear on your page.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">3. Customize appearance</h4>
                    <p className="text-sm text-muted-foreground">
                      Use the configuration panel to match your brand colors and preferences.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="wordpress" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">WordPress Integration</h4>
                    <p className="text-sm text-muted-foreground">
                      Add the embed code to any page or post using the HTML block or custom HTML widget.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="shopify" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Shopify Integration</h4>
                    <p className="text-sm text-muted-foreground">
                      Add the embed code to your theme's template files or use a custom HTML section.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BookingWidgetPage;