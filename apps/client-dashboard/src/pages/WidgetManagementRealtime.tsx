/**
 * WidgetManagement Page - Refactored with Real-time WebSocket Hooks
 * Solves connection issues and provides better real-time experience
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWidgetManagement } from '@/hooks/useWidgetManagement';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from "@/hooks/use-toast";
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
  Sliders,
  Calendar,
  ChefHat,
  Cog,
  BarChart3,
  History,
  Save,
  Undo,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Wifi,
  WifiOff,
  Activity
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Default configurations
const DEFAULT_BOOKING_CONFIG = {
  theme: {
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    fontFamily: "Inter",
    borderRadius: 6,
    spacing: "comfortable"
  },
  features: {
    enableRealTimeAvailability: true,
    showPricing: true,
    requireDeposit: false,
    allowCancellation: true,
    sendConfirmationEmail: true,
    enableWaitlist: false
  },
  display: {
    showHeader: true,
    showDescription: true,
    compactMode: false,
    mobileOptimized: true
  },
  integration: {
    prefetchData: true,
    enableAnalytics: true,
    customCss: "",
    customJs: ""
  }
};

const DEFAULT_CATERING_CONFIG = {
  theme: {
    primaryColor: "#dc2626",
    secondaryColor: "#64748b",
    fontFamily: "Inter",
    borderRadius: 6,
    spacing: "comfortable"
  },
  features: {
    enableEventPlanning: true,
    showMenuPreviews: true,
    requireEventDetails: true,
    allowCustomization: true,
    sendQuoteEmail: true,
    enableBulkOrders: false
  },
  display: {
    showHeader: true,
    showDescription: true,
    compactMode: false,
    mobileOptimized: true
  },
  integration: {
    prefetchData: true,
    enableAnalytics: true,
    customCss: "",
    customJs: ""
  }
};

const WidgetManagementRealtimeComponent: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  // Use the new real-time widget management hook
  const {
    widgets,
    loading,
    error,
    connected,
    analyticsConnected,
    analytics,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    getWidgetByType,
    saveWidgetConfig,
    markConfigChanged,
    toggleWidgetActive,
    getAnalyticsSummary,
    isOnline
  } = useWidgetManagement({
    autoSave: true,
    autoSaveInterval: 30000,
    enableAnalytics: true
  });

  // Local state for UI
  const [activeTab, setActiveTab] = useState("booking");
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Get current widget configurations
  const bookingWidget = useMemo(() => getWidgetByType('booking'), [getWidgetByType]);
  const cateringWidget = useMemo(() => getWidgetByType('catering'), [getWidgetByType]);

  // Widget configurations with defaults
  const [bookingConfig, setBookingConfig] = useState(() => 
    bookingWidget?.config || DEFAULT_BOOKING_CONFIG
  );
  const [cateringConfig, setCateringConfig] = useState(() => 
    cateringWidget?.config || DEFAULT_CATERING_CONFIG
  );

  // Update local state when widgets change
  useEffect(() => {
    if (bookingWidget?.config) {
      setBookingConfig(bookingWidget.config);
    }
  }, [bookingWidget]);

  useEffect(() => {
    if (cateringWidget?.config) {
      setCateringConfig(cateringWidget.config);
    }
  }, [cateringWidget]);

  // Generate widget URLs
  const widgetUrls = useMemo(() => {
    if (!tenant?.id) return {};

    // Determine base URL with proper fallbacks
    let baseUrl: string;
    
    if (tenant.custom_domain) {
      // Use custom domain if available
      baseUrl = `https://${tenant.custom_domain}`;
    } else if (tenant.subdomain) {
      // Use subdomain if available
      baseUrl = `https://${tenant.subdomain}.blunari.com`;
    } else {
      // Fallback to tenant ID if neither custom domain nor subdomain is set
      baseUrl = `https://${tenant.id}.blunari.com`;
    }

    return {
      booking: `${baseUrl}/booking?tenantId=${tenant.id}`,
      catering: `${baseUrl}/catering?tenantId=${tenant.id}`
    };
  }, [tenant?.id, tenant?.custom_domain, tenant?.subdomain]);

  // Handle configuration changes
  const handleBookingConfigChange = useCallback((newConfig: any) => {
    setBookingConfig(newConfig);
    markConfigChanged('booking', newConfig);
  }, [markConfigChanged]);

  const handleCateringConfigChange = useCallback((newConfig: any) => {
    setCateringConfig(newConfig);
    markConfigChanged('catering', newConfig);
  }, [markConfigChanged]);

  // Manual save
  const handleSave = useCallback(async (type: 'booking' | 'catering') => {
    const config = type === 'booking' ? bookingConfig : cateringConfig;
    const result = await saveWidgetConfig(type, config);
    
    if (result.success) {
      toast({
        title: "Configuration Saved",
        description: `${type === 'booking' ? 'Booking' : 'Catering'} widget configuration updated successfully.`,
      });
    } else {
      toast({
        title: "Save Failed",
        description: result.error || "Failed to save configuration",
        variant: "destructive"
      });
    }
  }, [bookingConfig, cateringConfig, saveWidgetConfig, toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }));
      }, 2000);

      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Generate embed code
  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    const url = widgetUrls[type];
    if (!url) {
      return `<!-- Widget URL not available. Please ensure tenant configuration is complete. -->`;
    }

    return `<iframe 
  src="${url}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  title="${type === 'booking' ? 'Booking' : 'Catering'} Widget">
</iframe>`;
  }, [widgetUrls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading widget management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Management</h1>
          <p className="text-muted-foreground">
            Configure and manage your booking and catering widgets with real-time updates
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              Widgets: {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          
          {connected && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Analytics: {analyticsConnected ? "Live" : "Offline"}
              </span>
            </div>
          )}

          {/* Save Status */}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600">
              <Save className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          {isSaving && (
            <Badge variant="outline" className="text-blue-600">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Saving...
            </Badge>
          )}
          
          {lastSaved && !hasUnsavedChanges && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved {lastSaved.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Issues Alert */}
      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Connection issues detected. Some features may be limited. 
            Changes will be synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Tenant Configuration Warning */}
      {!tenant?.custom_domain && !tenant?.subdomain && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Widget URLs are using fallback configuration. 
            Configure a custom domain or subdomain in tenant settings for branded URLs.
          </AlertDescription>
        </Alert>
      )}

      {/* Widget Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booking Widget
            {bookingWidget?.is_active && (
              <Badge variant="secondary" className="ml-1 text-xs">Live</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="catering" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Catering Widget
            {cateringWidget?.is_active && (
              <Badge variant="secondary" className="ml-1 text-xs">Live</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Booking Widget Tab */}
        <TabsContent value="booking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Booking Widget Configuration
                  </CardTitle>
                  <CardDescription>
                    Customize your booking widget appearance and functionality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Widget Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Widget Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {bookingWidget?.is_active ? 'Widget is live and accepting bookings' : 'Widget is currently disabled'}
                      </p>
                    </div>
                    <Switch
                      checked={bookingWidget?.is_active || false}
                      onCheckedChange={() => toggleWidgetActive('booking')}
                    />
                  </div>

                  {/* Analytics Summary */}
                  {bookingWidget && analyticsConnected && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        const summary = getAnalyticsSummary(bookingWidget.id!);
                        if (!summary) return null;
                        
                        return (
                          <>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">{summary.totalViews}</p>
                              <p className="text-xs text-muted-foreground">Views</p>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-2xl font-bold text-green-600">{summary.totalInteractions}</p>
                              <p className="text-xs text-muted-foreground">Interactions</p>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-2xl font-bold text-purple-600">{summary.totalConversions}</p>
                              <p className="text-xs text-muted-foreground">Conversions</p>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-2xl font-bold text-orange-600">{summary.conversionRate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Conv. Rate</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Theme Configuration */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Theme Settings
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="booking-primary-color">Primary Color</Label>
                        <Input
                          id="booking-primary-color"
                          type="color"
                          value={bookingConfig.theme.primaryColor}
                          onChange={(e) => handleBookingConfigChange({
                            ...bookingConfig,
                            theme: { ...bookingConfig.theme, primaryColor: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="booking-secondary-color">Secondary Color</Label>
                        <Input
                          id="booking-secondary-color"
                          type="color"
                          value={bookingConfig.theme.secondaryColor}
                          onChange={(e) => handleBookingConfigChange({
                            ...bookingConfig,
                            theme: { ...bookingConfig.theme, secondaryColor: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Sliders className="h-4 w-4" />
                      Features
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(bookingConfig.features).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={`booking-${key}`} className="text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Label>
                          <Switch
                            id={`booking-${key}`}
                            checked={value as boolean}
                            onCheckedChange={(checked) => handleBookingConfigChange({
                              ...bookingConfig,
                              features: { ...bookingConfig.features, [key]: checked }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleSave('booking')}
                      disabled={isSaving || !connected}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Configuration
                    </Button>
                    
                    {hasUnsavedChanges && (
                      <Button variant="outline" size="sm">
                        <Undo className="h-4 w-4 mr-2" />
                        Revert Changes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Embed Code Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Embed Code
                  </CardTitle>
                  <CardDescription>
                    Copy this code to embed the booking widget on your website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Widget URL */}
                  <div>
                    <Label className="text-sm font-medium">Widget URL</Label>
                    <div className="flex mt-1">
                      <Input
                        value={widgetUrls.booking || 'URL will be generated when tenant is configured'}
                        readOnly
                        className="rounded-r-none"
                        placeholder="Widget URL will appear here"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-l-none"
                        disabled={!widgetUrls.booking}
                        onClick={() => copyToClipboard(widgetUrls.booking || '', 'booking-url')}
                      >
                        {copiedStates['booking-url'] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {!widgetUrls.booking && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Complete tenant setup to generate widget URL
                      </p>
                    )}
                  </div>

                  {/* Embed Code */}
                  <div>
                    <Label className="text-sm font-medium">HTML Embed Code</Label>
                    <div className="relative mt-1">
                      <Textarea
                        value={generateEmbedCode('booking')}
                        readOnly
                        className="font-mono text-sm resize-none"
                        rows={6}
                        placeholder="Embed code will be generated when widget URL is available"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        disabled={!widgetUrls.booking}
                        onClick={() => copyToClipboard(generateEmbedCode('booking'), 'booking-embed')}
                      >
                        {copiedStates['booking-embed'] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {!widgetUrls.booking && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Embed code will be available once widget URL is configured
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      disabled={!widgetUrls.booking}
                      onClick={() => widgetUrls.booking && window.open(widgetUrls.booking, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Widget
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      disabled={!widgetUrls.booking}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      disabled={!widgetUrls.booking}
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share Widget
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Catering Widget Tab */}
        <TabsContent value="catering" className="space-y-6">
          {/* Similar structure for catering widget */}
          <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Catering Widget Configuration</h3>
            <p className="text-muted-foreground">
              Catering widget configuration panel will be implemented here with similar real-time functionality
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetManagementRealtimeComponent;
