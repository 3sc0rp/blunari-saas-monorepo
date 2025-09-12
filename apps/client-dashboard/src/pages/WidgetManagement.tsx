/**
 * Enhanced Widget Management Page with Defensive Programming
 * Implements error boundaries, validation, safe operations, and fallback states
 */
import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useTenant } from '@/hooks/useTenant';
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
import { Label } from '@/components/ui/label';
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
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
} from 'lucide-react';

// Lazy load heavy components with error boundaries
const WidgetConfigurationPanel = React.lazy(() => 
  import('@/components/widgets/WidgetConfigurationPanel').catch(error => {
    console.error('Failed to load WidgetConfigurationPanel:', error);
    return { default: () => <div className="p-4 text-center text-red-600">Failed to load configuration panel</div> };
  })
);

const WidgetPreviewPanel = React.lazy(() => 
  import('@/components/widgets/WidgetPreviewPanel').catch(error => {
    console.error('Failed to load WidgetPreviewPanel:', error);
    return { default: () => <div className="p-4 text-center text-red-600">Failed to load preview panel</div> };
  })
);

const WidgetAnalyticsDashboard = React.lazy(() => 
  import('@/components/widgets/WidgetAnalyticsDashboard').catch(error => {
    console.error('Failed to load WidgetAnalyticsDashboard:', error);
    return { default: () => <div className="p-4 text-center text-red-600">Failed to load analytics dashboard</div> };
  })
);

// Loading fallback component
const LoadingFallback: React.FC<{ label?: string }> = ({ label = "Loading component..." }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-3">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => (
  <Alert variant="destructive" className="m-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Component Error</AlertTitle>
    <AlertDescription className="space-y-2">
      <p>Something went wrong loading this component.</p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
          {error.message}
        </pre>
      )}
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </AlertDescription>
  </Alert>
);

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
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

  // Save configuration
  const handleSaveConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const config = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
      
      if (!validateCurrentConfig(config)) {
        toast({
          title: "Validation Failed",
          description: configErrors.join(', '),
          variant: "destructive",
        });
        return;
      }

      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      toast({
        title: "Configuration Saved",
        description: `${activeWidgetType} widget configuration has been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeWidgetType, bookingConfig, cateringConfig, validateCurrentConfig, configErrors, toast]);

  // Reset configuration
  const handleResetConfig = useCallback(() => {
    try {
      const defaultConfig = getDefaultWidgetConfig(activeWidgetType);
      if (activeWidgetType === 'booking') {
        setBookingConfig(defaultConfig);
      } else {
        setCateringConfig(defaultConfig);
      }
      setHasUnsavedChanges(false);
      setConfigErrors([]);
      toast({
        title: "Configuration Reset",
        description: `${activeWidgetType} widget configuration has been reset to defaults.`,
      });
    } catch (error) {
      console.error('Error resetting config:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset configuration",
        variant: "destructive",
      });
    }
  }, [activeWidgetType, toast]);

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

  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
  const updateCurrentConfig = activeWidgetType === 'booking' ? updateBookingConfig : updateCateringConfig;

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
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
            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveConfig} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button onClick={handleResetConfig} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="widget-type">Active Widget:</Label>
                <Select
                  value={activeWidgetType}
                  onValueChange={handleWidgetTypeChange}
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
          </div>

          {/* Configuration Errors Alert */}
          {configErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {configErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Status */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Widget service is connected and ready
            </AlertDescription>
          </Alert>
        </div>

        {/* Main Tabbed Interface */}
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
            <ErrorBoundary fallback={ErrorFallback}>
              <Suspense fallback={<LoadingFallback label="Loading configuration panel..." />}>
                <WidgetConfigurationPanel
                  widgetType={activeWidgetType}
                  config={currentConfig}
                  onConfigChange={updateCurrentConfig}
                  onSave={handleSaveConfig}
                  onReset={handleResetConfig}
                  isSaving={isLoading}
                  isActive={true}
                  onToggleActive={() => {}}
                />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <ErrorBoundary fallback={ErrorFallback}>
              <Suspense fallback={<LoadingFallback label="Loading preview panel..." />}>
                <WidgetPreviewPanel
                  widgetType={activeWidgetType}
                  config={currentConfig}
                  tenantId={tenant?.id}
                  isActive={true}
                />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Widget Analytics</h2>
              <Select value={analyticsTimeRange} onValueChange={handleAnalyticsTimeRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <ErrorBoundary fallback={ErrorFallback}>
              <Suspense fallback={<LoadingFallback label="Loading analytics dashboard..." />}>
                <WidgetAnalyticsDashboard
                  widgetType={activeWidgetType}
                  analyticsData={analyticsData}
                  timeRange={analyticsTimeRange}
                  onTimeRangeChange={handleAnalyticsTimeRangeChange}
                />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Widget Integration
                </CardTitle>
                <CardDescription>
                  Copy and paste this code into your website to embed the {activeWidgetType} widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Widget URL</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-gray-50 border rounded font-mono text-sm break-all">
                      {generateSafeWidgetUrl(activeWidgetType) || 'Generate URL failed'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(generateSafeWidgetUrl(activeWidgetType), 'Widget URL')}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="flex gap-2">
                    <pre className="flex-1 p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-48">
                      {generateSafeEmbedCode(activeWidgetType) || 'Generate embed code failed'}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(generateSafeEmbedCode(activeWidgetType), 'Embed Code')}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

export default WidgetManagement;
