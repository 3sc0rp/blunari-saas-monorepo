import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTenant } from '@/hooks/useTenant';
import { useWidgetManagement } from '@/hooks/useWidgetManagement';
import { useToast } from '@/hooks/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { 
  validateWidgetConfig,
  getDefaultWidgetConfig,
  generateWidgetUrl,
  generateEmbedCode,
  generateSafeAnalyticsData,
  safeCopyToClipboard,
  type WidgetConfig,
  type AnalyticsData
} from '@/utils/widgetUtils';
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
  
  // Enhanced state management with error handling
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  // Safe widget configuration with defaults and validation
  const [bookingConfig, setBookingConfig] = useState<WidgetConfig>(() => {
    try {
      return getDefaultWidgetConfig('booking');
    } catch (error) {
      console.error('Error initializing booking config:', error);
      return {
        theme: 'light' as const,
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderRadius: 8,
        welcomeMessage: 'Book your table with us!',
        buttonText: 'Reserve Now',
        showLogo: true,
        compactMode: false,
        customCss: '',
        animation: 'fade' as const,
        shadowIntensity: 2,
        fontFamily: 'system',
        fontSize: 14,
        spacing: 1
      };
    }
  });

  const [cateringConfig, setCateringConfig] = useState<WidgetConfig>(() => {
    try {
      return getDefaultWidgetConfig('catering');
    } catch (error) {
      console.error('Error initializing catering config:', error);
      return {
        theme: 'light' as const,
        primaryColor: '#f97316',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderRadius: 8,
        welcomeMessage: 'Order catering for your event!',
        buttonText: 'Order Catering',
        showLogo: true,
        compactMode: false,
        customCss: '',
        animation: 'fade' as const,
        shadowIntensity: 2,
        fontFamily: 'system',
        fontSize: 14,
        spacing: 1
      };
    }
  });

  // Initialize component with error handling
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);
        
        // Simulate initialization process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Validate tenant data
        if (!tenant?.id) {
          throw new Error('Tenant information is required to manage widgets');
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Widget Management initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize widget management');
        setIsInitializing(false);
      }
    };

    initializeComponent();
  }, [tenant]);

  // Safe analytics data generation with error handling
  const analyticsData = useMemo((): AnalyticsData => {
    try {
      return generateSafeAnalyticsData(analyticsTimeRange);
    } catch (error) {
      console.error('Error generating analytics data:', error);
      // Return minimal safe fallback
      return {
        totalViews: 0,
        totalInteractions: 0,
        totalConversions: 0,
        conversionRate: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        topSources: [],
        deviceBreakdown: [],
        hourlyData: [],
        weeklyData: []
      };
    }
  }, [analyticsTimeRange]);

  // Enhanced validation with error tracking
  const validateCurrentConfig = useCallback((config: WidgetConfig) => {
    try {
      const validation = validateWidgetConfig(config);
      setConfigErrors(validation.errors);
      return validation.isValid;
    } catch (error) {
      console.error('Validation error:', error);
      setConfigErrors(['Configuration validation failed']);
      return false;
    }
  }, []);

  // Safe widget URL generation
  const generateSafeWidgetUrl = useCallback((type: 'booking' | 'catering') => {
    try {
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      const result = generateWidgetUrl(type, config, tenant?.id);
      
      if (!result.isValid) {
        toast({
          title: "URL Generation Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return '';
      }
      
      return result.url;
    } catch (error) {
      console.error('Error generating widget URL:', error);
      toast({
        title: "Error",
        description: "Failed to generate widget URL",
        variant: "destructive",
      });
      return '';
    }
  }, [bookingConfig, cateringConfig, tenant?.id, toast]);

  // Safe embed code generation
  const generateSafeEmbedCode = useCallback((type: 'booking' | 'catering') => {
    try {
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      const result = generateEmbedCode(type, config, tenant?.id, tenant?.name);
      
      if (!result.isValid) {
        toast({
          title: "Embed Code Generation Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return '';
      }
      
      return result.embedCode;
    } catch (error) {
      console.error('Error generating embed code:', error);
      toast({
        title: "Error",
        description: "Failed to generate embed code",
        variant: "destructive",
      });
      return '';
    }
  }, [bookingConfig, cateringConfig, tenant?.id, tenant?.name, toast]);

  // Safe copy to clipboard function
  const handleCopyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      setIsLoading(true);
      const result = await safeCopyToClipboard(text);
      
      if (result.success) {
        toast({
          title: "Copied!",
          description: `${label} copied to clipboard`,
        });
      } else {
        toast({
          title: "Copy Failed",
          description: result.error || "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Safe configuration update functions
  const updateBookingConfig = useCallback((updates: Partial<WidgetConfig>) => {
    try {
      setBookingConfig(prev => {
        const newConfig = { ...prev, ...updates };
        validateCurrentConfig(newConfig);
        return newConfig;
      });
    } catch (error) {
      console.error('Error updating booking config:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to update booking configuration",
        variant: "destructive",
      });
    }
  }, [validateCurrentConfig, toast]);

  const updateCateringConfig = useCallback((updates: Partial<WidgetConfig>) => {
    try {
      setCateringConfig(prev => {
        const newConfig = { ...prev, ...updates };
        validateCurrentConfig(newConfig);
        return newConfig;
      });
    } catch (error) {
      console.error('Error updating catering config:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to update catering configuration",
        variant: "destructive",
      });
    }
  }, [validateCurrentConfig, toast]);

  // Safe tab and type switching
  const handleTabChange = useCallback((tab: string) => {
    try {
      setSelectedTab(tab);
    } catch (error) {
      console.error('Error changing tab:', error);
    }
  }, []);

  const handleWidgetTypeChange = useCallback((type: 'booking' | 'catering') => {
    try {
      setActiveWidgetType(type);
    } catch (error) {
      console.error('Error changing widget type:', error);
    }
  }, []);

  const handleAnalyticsTimeRangeChange = useCallback((range: '24h' | '7d' | '30d' | '90d') => {
    try {
      setAnalyticsTimeRange(range);
    } catch (error) {
      console.error('Error changing analytics time range:', error);
    }
  }, []);

  // Early return patterns for error states
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing widget management...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Initialization Error</AlertTitle>
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Tenant Information</AlertTitle>
          <AlertDescription>Unable to load tenant data. Please refresh the page or contact support.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
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
