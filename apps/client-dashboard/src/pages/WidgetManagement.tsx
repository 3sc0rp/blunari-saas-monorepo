import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTenant } from '@/hooks/useTenant';
import { useWidgetManagement } from '@/hooks/useWidgetManagement';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings2 as Settings,
  Calendar,
  ChefHat,
  Eye,
  BarChart3,
  Code2 as Code,
  CheckCircle,
  AlertCircle,
  Copy,
  Info,
  Clock,
} from 'lucide-react';

// Import enhanced components
import WidgetConfigurationPanel from '@/components/widgets/WidgetConfigurationPanel';
import WidgetPreviewPanel from '@/components/widgets/WidgetPreviewPanel';
import WidgetAnalyticsDashboard from '@/components/widgets/WidgetAnalyticsDashboard';

const WidgetManagement: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  // Enhanced state management
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Enhanced widget configuration with more options
  const [bookingConfig, setBookingConfig] = useState({
    theme: 'light' as 'light' | 'dark' | 'auto',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Book your table with us!',
    buttonText: 'Reserve Now',
    showLogo: true,
    compactMode: false,
    customCss: '',
    animation: 'fade' as 'none' | 'fade' | 'slide' | 'bounce',
    shadowIntensity: 2,
    fontFamily: 'system',
    fontSize: 14,
    spacing: 1
  });

  const [cateringConfig, setCateringConfig] = useState({
    theme: 'light' as 'light' | 'dark' | 'auto',
    primaryColor: '#f97316',
    backgroundColor: '#ffffff', 
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Order catering for your event!',
    buttonText: 'Order Catering',
    showLogo: true,
    compactMode: false,
    customCss: '',
    animation: 'fade' as 'none' | 'fade' | 'slide' | 'bounce',
    shadowIntensity: 2,
    fontFamily: 'system',
    fontSize: 14,
    spacing: 1
  });

  // Mock analytics data
  const analyticsData = useMemo(() => ({
    totalViews: Math.floor(Math.random() * 10000) + 1000,
    totalInteractions: Math.floor(Math.random() * 5000) + 500,
    totalConversions: Math.floor(Math.random() * 500) + 50,
    conversionRate: Math.random() * 10 + 2,
    avgSessionDuration: Math.floor(Math.random() * 300) + 60,
    bounceRate: Math.random() * 40 + 20,
    topSources: [
      { source: 'Direct', views: 2840, conversions: 45 },
      { source: 'Google', views: 1920, conversions: 32 },
      { source: 'Social Media', views: 1240, conversions: 18 },
      { source: 'Email', views: 860, conversions: 15 }
    ],
    deviceBreakdown: [
      { device: 'Mobile', percentage: 65 },
      { device: 'Desktop', percentage: 28 },
      { device: 'Tablet', percentage: 7 }
    ],
    hourlyData: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      views: Math.floor(Math.random() * 100) + 10,
      conversions: Math.floor(Math.random() * 10) + 1
    })),
    weeklyData: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      views: Math.floor(Math.random() * 500) + 100,
      conversions: Math.floor(Math.random() * 50) + 10
    }))
  }), [analyticsTimeRange]);

  // Validation functions
  const validateConfig = useCallback((config: any) => {
    if (!config.welcomeMessage?.trim()) {
      return 'Welcome message is required';
    }
    if (!config.buttonText?.trim()) {
      return 'Button text is required';
    }
    if (!/^#[0-9A-F]{6}$/i.test(config.primaryColor)) {
      return 'Primary color must be a valid hex color';
    }
    if (!/^#[0-9A-F]{6}$/i.test(config.backgroundColor)) {
      return 'Background color must be a valid hex color';
    }
    return null;
  }, []);

  // Enhanced widget URL generation with more parameters
  const generateWidgetUrl = useCallback((type: 'booking' | 'catering') => {
    const config = type === 'booking' ? bookingConfig : cateringConfig;
    const base = `${window.location.origin}/widget/${type}/${tenant?.id}`;
    
    const params = new URLSearchParams({
      theme: config.theme,
      primaryColor: config.primaryColor.replace('#', ''),
      backgroundColor: config.backgroundColor.replace('#', ''),
      textColor: config.textColor.replace('#', ''),
      borderRadius: config.borderRadius.toString(),
      welcomeMessage: config.welcomeMessage,
      buttonText: config.buttonText,
      showLogo: config.showLogo.toString(),
      compactMode: config.compactMode.toString(),
      animation: config.animation,
      shadowIntensity: config.shadowIntensity.toString(),
      fontFamily: config.fontFamily,
      fontSize: config.fontSize.toString(),
      spacing: config.spacing.toString()
    });

    return `${base}?${params.toString()}`;
  }, [bookingConfig, cateringConfig, tenant?.id]);

  // Enhanced embed code generation
  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    const url = generateWidgetUrl(type);
    const config = type === 'booking' ? bookingConfig : cateringConfig;
    
    return `<!-- ${tenant?.name || 'Restaurant'} ${type === 'booking' ? 'Booking' : 'Catering'} Widget -->
<div id="${type}-widget-container" style="width: 100%; height: ${config.compactMode ? '400px' : '600px'}; border: none; border-radius: ${config.borderRadius}px; overflow: hidden; box-shadow: 0 ${config.shadowIntensity * 2}px ${config.shadowIntensity * 8}px rgba(0,0,0,0.1);"></div>
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${url}';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute('allow', 'payment; geolocation');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation');
  iframe.setAttribute('loading', 'lazy');
  
  var container = document.getElementById('${type}-widget-container');
  if (container) {
    container.appendChild(iframe);
    
    // Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'widget_loaded', {
        'widget_type': '${type}',
        'tenant_id': '${tenant?.id}'
      });
    }
  }
})();
</script>`;
  }, [generateWidgetUrl, bookingConfig, cateringConfig, tenant]);

  // Real widget management hook with error handling
  const hookOptions = useMemo(() => ({
    autoSave: false, // Disabled auto-save to prevent API spam
    enableAnalytics: true
  }), []);

  const {
    widgets,
    loading,
    error,
    connected,
    isOnline,
    hasUnsavedChanges,
    lastSaved,
    toggleWidgetActive,
    getWidgetByType,
    saveWidgetConfig,
    markConfigChanged,
  } = useWidgetManagement(hookOptions);

  // Copy embed code with better UX
  const copyEmbedCode = useCallback(async (type: 'booking' | 'catering') => {
    try {
      const code = generateEmbedCode(type);
      
      if (code.includes('Please select a tenant')) {
        toast({
          title: "Cannot Copy Embed Code",
          description: "Please select a tenant first.",
          variant: "destructive"
        });
        return;
      }

      await navigator.clipboard.writeText(code);
      toast({
        title: "Embed Code Copied",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} widget embed code copied to clipboard`,
        variant: "default"
      });
    } catch (err) {
      console.error('Failed to copy embed code:', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy embed code to clipboard",
        variant: "destructive"
      });
    }
  }, [generateEmbedCode, toast]);

  // Show loading state during initialization
  if (isInitializing || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Clock className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Loading Widget Management</p>
              <p className="text-sm text-muted-foreground">
                Connecting to widget services...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show initialization error
  if (initError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Initialization Failed</AlertTitle>
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Enhanced Header */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Widget Management
                </h1>
                <p className="text-muted-foreground">
                  Configure, preview, and deploy your booking and catering widgets
                </p>
              </div>
            </div>
          </div>
          
          {/* Widget Type Selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="widget-type">Active Widget:</Label>
            <Select
              value={activeWidgetType}
              onValueChange={(value: 'booking' | 'catering') => setActiveWidgetType(value)}
            >
              <SelectTrigger id="widget-type" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Booking
                  </div>
                </SelectItem>
                <SelectItem value="catering">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Catering
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Connection Status */}
        <Alert className={connected ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <div className="flex items-center gap-2">
            {connected ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            <AlertDescription className={connected ? "text-green-800" : "text-amber-800"}>
              Widget service is {connected ? 'connected and ready' : 'connecting...'}
            </AlertDescription>
          </div>
        </Alert>
      </motion.div>

      {/* Main Tabbed Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <WidgetConfigurationPanel
            widgetType={activeWidgetType}
            config={activeWidgetType === 'booking' ? bookingConfig : cateringConfig}
            onConfigChange={(config) => {
              if (activeWidgetType === 'booking') {
                setBookingConfig({
                  ...config,
                  customCss: config.customCss || '',
                  animation: config.animation || 'fade'
                });
              } else {
                setCateringConfig({
                  ...config,
                  customCss: config.customCss || '',
                  animation: config.animation || 'fade'
                });
              }
              markConfigChanged(activeWidgetType, config);
            }}
            onSave={() => {
              const config = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
              const validation = validateConfig(config);
              if (validation) {
                toast({
                  title: "Validation Error",
                  description: validation,
                  variant: "destructive"
                });
                return;
              }
              
              saveWidgetConfig(activeWidgetType, config);
              toast({
                title: "Configuration Saved",
                description: `${activeWidgetType} widget configuration has been saved successfully.`,
                variant: "default"
              });
            }}
            onReset={() => {
              if (activeWidgetType === 'booking') {
                setBookingConfig({
                  theme: 'light' as 'light' | 'dark' | 'auto',
                  primaryColor: '#3b82f6',
                  backgroundColor: '#ffffff',
                  textColor: '#1f2937',
                  borderRadius: 8,
                  welcomeMessage: 'Book your table with us!',
                  buttonText: 'Reserve Now',
                  showLogo: true,
                  compactMode: false,
                  customCss: '',
                  animation: 'fade' as 'none' | 'fade' | 'slide' | 'bounce',
                  shadowIntensity: 2,
                  fontFamily: 'system',
                  fontSize: 14,
                  spacing: 1
                });
              } else {
                setCateringConfig({
                  theme: 'light' as 'light' | 'dark' | 'auto',
                  primaryColor: '#f97316',
                  backgroundColor: '#ffffff', 
                  textColor: '#1f2937',
                  borderRadius: 8,
                  welcomeMessage: 'Order catering for your event!',
                  buttonText: 'Order Catering',
                  showLogo: true,
                  compactMode: false,
                  customCss: '',
                  animation: 'fade' as 'none' | 'fade' | 'slide' | 'bounce',
                  shadowIntensity: 2,
                  fontFamily: 'system',
                  fontSize: 14,
                  spacing: 1
                });
              }
            }}
            isSaving={loading}
            isActive={getWidgetByType(activeWidgetType)?.is_active ?? false}
            onToggleActive={() => toggleWidgetActive(activeWidgetType)}
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <WidgetPreviewPanel
            widgetType={activeWidgetType}
            config={activeWidgetType === 'booking' ? bookingConfig : cateringConfig}
            tenantId={tenant?.id}
            isActive={getWidgetByType(activeWidgetType)?.is_active ?? false}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <WidgetAnalyticsDashboard
            widgetType={activeWidgetType}
            analyticsData={analyticsData}
            timeRange={analyticsTimeRange}
            onTimeRangeChange={setAnalyticsTimeRange}
          />
        </TabsContent>

        {/* Embed Tab */}
        <TabsContent value="embed" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Embed Code Generator
                </CardTitle>
                <CardDescription>
                  Copy and paste these embed codes into your website to display the widgets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Widget URL Display */}
                <div className="space-y-2">
                  <Label>Widget URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generateWidgetUrl(activeWidgetType)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generateWidgetUrl(activeWidgetType));
                        toast({
                          title: "URL Copied",
                          description: "Widget URL copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Enhanced Embed Code */}
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="relative">
                    <Textarea
                      value={generateEmbedCode(activeWidgetType)}
                      readOnly
                      rows={15}
                      className="font-mono text-xs resize-none"
                    />
                    <Button
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyEmbedCode(activeWidgetType)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Implementation Instructions */}
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle>Implementation Instructions</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>1. Copy the embed code above</p>
                    <p>2. Paste it into your website's HTML where you want the widget to appear</p>
                    <p>3. The widget will automatically load with your current configuration</p>
                    <p>4. For WordPress, use a Custom HTML block or add to your theme files</p>
                  </AlertDescription>
                </Alert>

                {/* Advanced Options */}
                <details className="space-y-2">
                  <summary className="cursor-pointer font-medium">Advanced Integration Options</summary>
                  <div className="pl-4 space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>React Component</Label>
                      <Textarea
                        value={`import React from 'react';

const ${activeWidgetType.charAt(0).toUpperCase() + activeWidgetType.slice(1)}Widget = () => {
  return (
    <iframe
      src="${generateWidgetUrl(activeWidgetType)}"
      style={{
        width: '100%',
        height: '${activeWidgetType === 'booking' ? '600px' : '500px'}',
        border: 'none',
        borderRadius: '8px'
      }}
      title="${activeWidgetType.charAt(0).toUpperCase() + activeWidgetType.slice(1)} Widget"
    />
  );
};

export default ${activeWidgetType.charAt(0).toUpperCase() + activeWidgetType.slice(1)}Widget;`}
                        readOnly
                        rows={16}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default WidgetManagement;
