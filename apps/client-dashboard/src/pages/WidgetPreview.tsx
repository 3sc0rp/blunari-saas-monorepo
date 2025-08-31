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
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
            <h1 className="text-3xl font-bold tracking-tight">Booking Widget Preview</h1>
            <p className="text-lg text-muted-foreground">
              Preview and customize your restaurant's booking experience
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
      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Embed
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Settings
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
            {/* Restaurant Info */}
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Information</CardTitle>
                <CardDescription>
                  Current settings for {tenant?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Name</span>
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
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">Widget URL</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{bookingUrl}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle>Branding & Appearance</CardTitle>
                <CardDescription>
                  Visual customization settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant?.primary_color && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Primary Color</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded border shadow-sm"
                          style={{ backgroundColor: tenant.primary_color }}
                        />
                        <code className="text-xs">{tenant.primary_color}</code>
                      </div>
                    </div>
                    
                    {tenant.secondary_color && (
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm font-medium">Secondary Color</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded border shadow-sm"
                            style={{ backgroundColor: tenant.secondary_color }}
                          />
                          <code className="text-xs">{tenant.secondary_color}</code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <Separator />
                
                <div className="text-sm text-muted-foreground">
                  <p>To modify branding settings, visit the <strong>Settings</strong> page in your dashboard.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and useful links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Test Booking
                  </a>
                </Button>
                
                <Button variant="outline" onClick={() => copyToClipboard(fullBookingUrl, "Widget URL")}>
                  <Share className="w-4 h-4 mr-2" />
                  Share URL
                </Button>
                
                <Button variant="outline" onClick={() => copyToClipboard(embedCode, "Embed code")}>
                  <Download className="w-4 h-4 mr-2" />
                  Get Embed Code
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