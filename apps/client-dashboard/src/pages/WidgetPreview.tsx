import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Copy, 
  Check, 
  Code2, 
  Palette, 
  Globe,
  Eye,
  Settings2,
  RefreshCw,
  Share,
  Download,
  QrCode,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import BookingDebugger from '@/components/booking/BookingDebugger';

const WidgetPreview: React.FC = () => {
  const { tenant, isLoading } = useTenant();
  const { toast } = useToast();
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Widget configuration state
  const [widgetConfig, setWidgetConfig] = useState({
    theme: 'light',
    primaryColor: tenant?.primary_color || '#3b82f6',
    showAvailability: true,
    showPricing: false,
    requirePhone: true,
    allowCancellation: true,
    maxAdvanceBooking: 30,
    enableNotifications: true,
    showReviews: true,
    customCss: ''
  });

  // Use the current tenant's slug for the booking URL
  const bookingUrl = `/book/${tenant?.slug || 'demo'}`;
  const fullBookingUrl = `${window.location.origin}${bookingUrl}`;

  const deviceConfigs = {
    desktop: { 
      width: 'w-full max-w-5xl', 
      height: 'h-[700px]',
      label: 'Desktop',
      icon: Monitor 
    },
    tablet: { 
      width: 'w-full max-w-3xl', 
      height: 'h-[600px]',
      label: 'Tablet',
      icon: Tablet 
    },
    mobile: { 
      width: 'w-full max-w-sm', 
      height: 'h-[650px]',
      label: 'Mobile',
      icon: Smartphone 
    },
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const refreshPreview = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const embedCode = `<iframe 
  src="${fullBookingUrl}"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  title="Restaurant Booking Widget">
</iframe>`;

  const jsEmbedCode = `<!-- Advanced Booking Widget -->
<div id="booking-widget-container"></div>
<script>
  (function() {
    const container = document.getElementById('booking-widget-container');
    if (container) {
      const iframe = document.createElement('iframe');
      iframe.src = '${fullBookingUrl}';
      iframe.width = '100%';
      iframe.height = '600';
      iframe.frameBorder = '0';
      iframe.style.borderRadius = '8px';
      iframe.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
      iframe.title = 'Restaurant Booking Widget';
      container.appendChild(iframe);
    }
  })();
</script>`;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Widget Settings & Management</h1>
            <p className="text-lg text-muted-foreground">
              Configure, preview, and manage your restaurant's booking widget
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={refreshPreview} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button asChild>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Widget
              </a>
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Live & Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Widget URL</p>
                  <p className="text-sm text-muted-foreground truncate">{bookingUrl}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <div className="flex items-center gap-2">
                    {tenant?.primary_color && (
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: tenant.primary_color }}
                      />
                    )}
                    <span className="text-sm text-muted-foreground">Custom Branding</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Embed
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-6">
          {/* Device Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Device Preview</CardTitle>
              <CardDescription>
                Test your booking widget across different screen sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {Object.entries(deviceConfigs).map(([key, config]) => {
                  const IconComponent = config.icon;
                  const isActive = previewDevice === key;
                  return (
                    <motion.div key={key} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewDevice(key as any)}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="hidden sm:inline">{config.label}</span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Preview Frame */}
          <motion.div
            key={previewDevice}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            <div className={`${deviceConfigs[previewDevice].width} transition-all duration-300`}>
              <Card className="overflow-hidden shadow-2xl">
                <CardContent className="p-0">
                  <iframe
                    key={refreshing.toString()}
                    src={bookingUrl}
                    className={`w-full border-0 ${deviceConfigs[previewDevice].height}`}
                    title="Booking Widget Preview"
                    onError={(e) => {
                      console.error('Iframe loading error:', e);
                      toast({
                        title: "Preview Error",
                        description: "Unable to load the booking widget preview. The widget may still work when embedded.",
                        variant: "destructive",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Simple Embed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Simple Embed
                </CardTitle>
                <CardDescription>
                  Basic iframe embed code for most websites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{embedCode}</pre>
                </div>
                
                <Button
                  onClick={() => copyToClipboard(embedCode, "Embed code")}
                  className="w-full"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Embed Code"}
                </Button>
              </CardContent>
            </Card>

            {/* Advanced Embed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Advanced Embed
                </CardTitle>
                <CardDescription>
                  JavaScript embed with dynamic loading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{jsEmbedCode}</pre>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(jsEmbedCode, "Advanced embed code")}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Advanced Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Mobile Optimized</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Real-time Updates</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium">Custom Branding</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Globe className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium">Universal Compatibility</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Widget Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Widget Configuration
                </CardTitle>
                <CardDescription>
                  Customize your widget's appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Theme</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={widgetConfig.theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWidgetConfig(prev => ({ ...prev, theme: 'light' }))}
                    >
                      Light
                    </Button>
                    <Button 
                      variant={widgetConfig.theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWidgetConfig(prev => ({ ...prev, theme: 'dark' }))}
                    >
                      Dark
                    </Button>
                    <Button 
                      variant={widgetConfig.theme === 'auto' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWidgetConfig(prev => ({ ...prev, theme: 'auto' }))}
                    >
                      Auto
                    </Button>
                  </div>
                </div>

                {/* Primary Color */}
                <div className="space-y-3">
                  <Label htmlFor="primary-color" className="text-sm font-medium">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary-color"
                      type="color"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Features</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Show Availability</Label>
                        <p className="text-xs text-muted-foreground">Display real-time table availability</p>
                      </div>
                      <Switch
                        checked={widgetConfig.showAvailability}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, showAvailability: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Show Pricing</Label>
                        <p className="text-xs text-muted-foreground">Display pricing information</p>
                      </div>
                      <Switch
                        checked={widgetConfig.showPricing}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, showPricing: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Require Phone Number</Label>
                        <p className="text-xs text-muted-foreground">Make phone number mandatory</p>
                      </div>
                      <Switch
                        checked={widgetConfig.requirePhone}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, requirePhone: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Allow Cancellation</Label>
                        <p className="text-xs text-muted-foreground">Let customers cancel bookings</p>
                      </div>
                      <Switch
                        checked={widgetConfig.allowCancellation}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, allowCancellation: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">Send booking confirmations</p>
                      </div>
                      <Switch
                        checked={widgetConfig.enableNotifications}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, enableNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Show Reviews</Label>
                        <p className="text-xs text-muted-foreground">Display customer reviews</p>
                      </div>
                      <Switch
                        checked={widgetConfig.showReviews}
                        onCheckedChange={(checked) => setWidgetConfig(prev => ({ ...prev, showReviews: checked }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-3">
                  <Label htmlFor="advance-booking" className="text-sm font-medium">
                    Maximum Advance Booking (days)
                  </Label>
                  <Input
                    id="advance-booking"
                    type="number"
                    value={widgetConfig.maxAdvanceBooking}
                    onChange={(e) => setWidgetConfig(prev => ({ ...prev, maxAdvanceBooking: Number(e.target.value) }))}
                    min="1"
                    max="365"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Restaurant Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Branding & Information
                </CardTitle>
                <CardDescription>
                  Current restaurant settings from your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Restaurant Name</span>
                    <span className="text-sm text-muted-foreground">{tenant?.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Timezone</span>
                    <Badge variant="outline">{tenant?.timezone}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Currency</span>
                    <Badge variant="outline">{tenant?.currency || 'USD'}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Widget Slug</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{tenant?.slug}</code>
                  </div>

                  {tenant?.primary_color && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Brand Color</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded border shadow-sm"
                          style={{ backgroundColor: tenant.primary_color }}
                        />
                        <code className="text-xs">{tenant.primary_color}</code>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Edit Restaurant Settings
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Update branding and restaurant information in the main Settings page
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Widget Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Actions</CardTitle>
              <CardDescription>
                Apply changes and manage your widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button className="flex-1 sm:flex-none">
                  <Download className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
                
                <Button variant="outline" onClick={() => copyToClipboard(fullBookingUrl, "Widget URL")}>
                  <Share className="w-4 h-4 mr-2" />
                  Share Widget URL
                </Button>
                
                <Button variant="outline" asChild>
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Test Live Widget
                  </a>
                </Button>

                <Button variant="ghost" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <BookingDebugger slug={tenant?.slug || 'demo'} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetPreview;