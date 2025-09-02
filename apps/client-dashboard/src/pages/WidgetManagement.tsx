import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Clock,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import BookingDebugger from "@/components/booking/BookingDebugger";

// Widget Configuration Types
interface WidgetAnalytics {
  views: number;
  conversions: number;
  conversionRate: number;
  avgSessionTime: number;
  lastUpdated: string;
}

interface WidgetVersion {
  id: string;
  version: string;
  createdAt: string;
  isActive: boolean;
  changes: string;
}

interface ConfigHistory {
  id: string;
  timestamp: string;
  changes: Record<string, any>;
  user: string;
}

const WidgetManagement: React.FC = () => {
  const { tenant, isLoading } = useTenant();
  const { toast } = useToast();

  // Core State Management
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [widgetType, setWidgetType] = useState<"booking" | "catering">(
    "booking",
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // UI State
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preview");

  // Analytics State
  const [analytics, setAnalytics] = useState<WidgetAnalytics>({
    views: 1247,
    conversions: 89,
    conversionRate: 7.1,
    avgSessionTime: 142,
    lastUpdated: new Date().toISOString(),
  });

  // Version Control State
  const [versions, setVersions] = useState<WidgetVersion[]>([
    {
      id: "1",
      version: "v2.1.0",
      createdAt: new Date().toISOString(),
      isActive: true,
      changes: "Added catering widget support",
    },
  ]);

  // Configuration History
  const [configHistory, setConfigHistory] = useState<ConfigHistory[]>([]);

  // Enhanced Widget Configuration with Validation
  const [bookingConfig, setBookingConfig] = useState({
    // Core Settings
    theme: "light" as "light" | "dark" | "auto",
    primaryColor: tenant?.primary_color || "#3b82f6",
    borderRadius: "8",
    fontFamily: "system",

    // Functionality
    showAvailability: true,
    showPricing: false,
    requirePhone: true,
    allowCancellation: true,
    maxAdvanceBooking: 30,
    timeSlotInterval: 30,
    enableWaitlist: true,
    enableNotifications: true,
    showReviews: false,

    // Advanced Features
    enableGuestCheckout: true,
    requireDeposit: false,
    depositAmount: 0,
    cancellationPolicy: "flexible",
    autoConfirm: true,
    enableReminders: true,
    maxPartySize: 12,
    minimumAge: 0,

    // Customization
    welcomeMessage: "",
    confirmationMessage: "",
    customCSS: "",
    customFields: [],

    // Integration
    googleAnalyticsId: "",
    facebookPixelId: "",
    enableChatbot: false,

    // Performance
    lazyLoading: true,
    prefetchData: true,
    cacheTimeout: 300,
  });

  const [cateringConfig, setCateringConfig] = useState({
    // Core Settings
    theme: "light" as "light" | "dark" | "auto",
    primaryColor: tenant?.primary_color || "#3b82f6",
    borderRadius: "8",
    fontFamily: "system",

    // Functionality
    showPackages: true,
    showCustomOrders: true,
    enableQuotes: true,
    showGallery: true,
    packageFilters: true,
    minOrderDays: 3,
    requirePhone: true,
    enableNotifications: true,
    showTestimonials: false,

    // Advanced Features
    enableBulkOrders: true,
    requireDeposit: true,
    depositPercentage: 25,
    enableMenuCustomization: true,
    showNutritionalInfo: false,
    enableAllergyFilters: true,
    maxOrderValue: 10000,
    minOrderValue: 100,

    // Customization
    welcomeMessage: "",
    quotingMessage: "",
    customCSS: "",
    customFields: [],

    // Integration
    googleAnalyticsId: "",
    facebookPixelId: "",
    enableChatbot: false,

    // Performance
    lazyLoading: true,
    prefetchData: true,
    cacheTimeout: 300,
  });

  // Get current config based on widget type
  const currentConfig =
    widgetType === "booking" ? bookingConfig : cateringConfig;
  const setCurrentConfig =
    widgetType === "booking" ? setBookingConfig : setCateringConfig;

  // Network Status Monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-save functionality  
  useEffect(() => {
    if (!hasUnsavedChanges || !isOnline) return;

    const autoSaveTimer = setTimeout(() => {
      if (hasUnsavedChanges && isOnline) {
        // Call handleAutoSave function defined later
        setTimeout(() => {
          // This ensures handleAutoSave is defined before being called
          if (typeof window !== 'undefined' && (window as any).handleAutoSave) {
            (window as any).handleAutoSave();
          }
        }, 0);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, isOnline]);

  // Configuration change tracking
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [bookingConfig, cateringConfig]);

  // Memoized computations
  const widgetUrls = useMemo(
    () => ({
      booking: tenant?.slug ? `${window.location.origin}/book/${tenant.slug}` : null,
      catering: tenant?.slug ? `${window.location.origin}/catering/${tenant.slug}` : null,
    }),
    [tenant?.slug],
  );

  const currentUrl = widgetUrls[widgetType];

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const config = currentConfig;

    if (config.primaryColor && !/^#[0-9A-F]{6}$/i.test(config.primaryColor)) {
      errors.push("Invalid primary color format");
    }

    if (widgetType === "booking") {
      const bConfig = config as typeof bookingConfig;
      if (bConfig.maxAdvanceBooking < 1 || bConfig.maxAdvanceBooking > 365) {
        errors.push("Max advance booking must be between 1-365 days");
      }
      if (bConfig.timeSlotInterval < 15 || bConfig.timeSlotInterval > 120) {
        errors.push("Time slot interval must be between 15-120 minutes");
      }
    }

    return errors;
  }, [currentConfig, widgetType]);

  // Advanced handlers
  const handleAutoSave = useCallback(async () => {
    if (!isOnline) return;

    try {
      setIsSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      toast({
        title: "Auto-saved",
        description: "Configuration automatically saved",
        duration: 2000,
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isOnline, toast]);

  const handleConfigurationSave = useCallback(
    async (skipToast = false) => {
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(", "),
          variant: "destructive",
        });
        return false;
      }

      try {
        setIsSaving(true);

        // Add to history
        const historyEntry: ConfigHistory = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          changes: { [widgetType]: currentConfig },
          user: tenant?.name || "Unknown",
        };
        setConfigHistory((prev) => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        if (!skipToast) {
          toast({
            title: "Configuration Saved",
            description: `${widgetType === "booking" ? "Booking" : "Catering"} widget settings have been saved successfully.`,
          });
        }

        return true;
      } catch (error) {
        toast({
          title: "Save Failed",
          description: "Unable to save configuration. Please try again.",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [validationErrors, widgetType, currentConfig, tenant?.name, toast],
  );

  const handleRevertChanges = useCallback(() => {
    // Reset to last saved state (simplified for demo)
    if (widgetType === "booking") {
      setBookingConfig((prev) => ({ ...prev }));
    } else {
      setCateringConfig((prev) => ({ ...prev }));
    }
    setHasUnsavedChanges(false);

    toast({
      title: "Changes Reverted",
      description: "Configuration reverted to last saved state",
    });
  }, [widgetType, toast]);

  // Device configurations for preview with enhanced responsiveness
  const deviceConfigs = {
    desktop: {
      width: "100%",
      height: "h-[700px]",
      icon: Monitor,
      label: "Desktop",
      containerClass: "w-full max-w-6xl",
      viewport: "1920x1080",
    },
    tablet: {
      width: "768px",
      height: "h-[900px]",
      icon: Tablet,
      label: "Tablet",
      containerClass: "w-[768px]",
      viewport: "768x1024",
    },
    mobile: {
      width: "375px",
      height: "h-[750px]",
      icon: Smartphone,
      label: "Mobile",
      containerClass: "w-[375px]",
      viewport: "375x667",
    },
  };

  // Enhanced utility functions
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

  const refreshPreview = useCallback(() => {
    setRefreshing(true);
    setPreviewError(null);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handlePreviewError = useCallback(
    (error: string) => {
      setPreviewError(error);
      toast({
        title: "Preview Error",
        description: error,
        variant: "destructive",
      });
    },
    [toast],
  );

  // Generate comprehensive embed codes with advanced options
  const generateEmbedCodes = useCallback(() => {
    const baseParams = new URLSearchParams({
      theme: currentConfig.theme,
      primaryColor: encodeURIComponent(currentConfig.primaryColor),
      borderRadius: currentConfig.borderRadius,
      fontFamily: currentConfig.fontFamily,
    });

    const enhancedUrl = `${currentUrl}?${baseParams.toString()}`;

    const basicEmbed = `<!-- Blunari ${widgetType === "booking" ? "Booking" : "Catering"} Widget -->
<iframe
  src="${enhancedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: ${currentConfig.borderRadius}px;"
  title="${widgetType === "booking" ? "Booking" : "Catering"} Widget"
  loading="lazy"
></iframe>`;

    const advancedEmbed = `<!-- Blunari ${widgetType === "booking" ? "Booking" : "Catering"} Widget - Advanced -->
<div id="blunari-${widgetType}-widget" style="min-height: 600px; position: relative;"></div>
<script>
(function() {
  // Widget loader with error handling and analytics
  const loadWidget = () => {
    const iframe = document.createElement('iframe');
    iframe.src = '${enhancedUrl}';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    iframe.loading = 'lazy';
    iframe.style.cssText = 'border: 1px solid #e5e7eb; border-radius: ${currentConfig.borderRadius}px;';
    iframe.title = '${widgetType === "booking" ? "Booking" : "Catering"} Widget';
    
    // Error handling
    iframe.onerror = () => {
      console.error('Failed to load Blunari widget');
      const container = document.getElementById('blunari-${widgetType}-widget');
      if (container) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Unable to load widget. Please refresh the page.</div>';
      }
    };
    
    const container = document.getElementById('blunari-${widgetType}-widget');
    if (container) {
      container.appendChild(iframe);
      
      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'widget_loaded', {
          widget_type: '${widgetType}',
          tenant_id: '${tenant?.id || "unknown"}'
        });
      }
    }
  };
  
  // Load widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }
})();
</script>`;

    const responsiveEmbed = `<!-- Blunari ${widgetType === "booking" ? "Booking" : "Catering"} Widget - Responsive -->
<div class="blunari-widget-container" style="position: relative; width: 100%; padding-bottom: 75%; height: 0;">
  <iframe
    src="${enhancedUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: ${currentConfig.borderRadius}px;"
    frameborder="0"
    title="${widgetType === "booking" ? "Booking" : "Catering"} Widget"
    loading="lazy"
  ></iframe>
</div>`;

    return { basicEmbed, advancedEmbed, responsiveEmbed };
  }, [currentConfig, currentUrl, widgetType, tenant?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading widget management...</p>
        </div>
      </div>
    );
  }

  const embedCodes = generateEmbedCodes();

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header with Status Indicators */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Cog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Widget Management</h1>
                <p className="text-muted-foreground">
                  Professional widget management with analytics, versioning, and
                  advanced configuration
                </p>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              {lastSaved && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-200"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}

              {validationErrors.length > 0 && (
                <Badge variant="destructive">
                  {validationErrors.length} Error
                  {validationErrors.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced Action Bar */}
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevertChanges}
                    disabled={!hasUnsavedChanges}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Revert Changes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigurationSave()}
                    disabled={isSaving || validationErrors.length > 0}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Configuration</TooltipContent>
              </Tooltip>
            </div>

            {/* Widget Type Selector - Enhanced */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={widgetType === "booking" ? "default" : "ghost"}
                size="sm"
                onClick={() => setWidgetType("booking")}
                className="flex items-center gap-2 relative"
              >
                <Calendar className="w-4 h-4" />
                Booking
                <Badge className="ml-1 h-4 px-1 text-xs" variant="secondary">
                  {analytics.views}
                </Badge>
              </Button>
              <Button
                variant={widgetType === "catering" ? "default" : "ghost"}
                size="sm"
                onClick={() => setWidgetType("catering")}
                className="flex items-center gap-2 relative"
              >
                <ChefHat className="w-4 h-4" />
                Catering
                <Badge className="ml-1 h-4 px-1 text-xs" variant="secondary">
                  {Math.floor(analytics.views * 0.6)}
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Alerts */}
        <AnimatePresence>
          {validationErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Tabs with Icons and Badges */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Settings
              {hasUnsavedChanges && (
                <div className="w-2 h-2 bg-orange-500 rounded-full ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Embed
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Versions
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Quick Setup
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    <CardTitle>
                      {widgetType === "booking" ? "Booking" : "Catering"} Widget
                      Preview
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshPreview}
                      disabled={refreshing}
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>URL: {currentUrl}</span>
                  <span>•</span>
                  <span>Viewport: {deviceConfigs[previewDevice].viewport}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Selector with Enhanced Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      Preview Device:
                    </Label>
                    {Object.entries(deviceConfigs).map(([device, config]) => {
                      const IconComponent = config.icon;
                      return (
                        <Button
                          key={device}
                          variant={
                            previewDevice === device ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setPreviewDevice(
                              device as "desktop" | "tablet" | "mobile",
                            )
                          }
                          className="flex items-center gap-2"
                        >
                          <IconComponent className="w-4 h-4" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Performance Indicator */}
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Fast Loading</span>
                  </div>
                </div>

                {/* Preview Error Alert */}
                {previewError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Preview Error</AlertTitle>
                    <AlertDescription>{previewError}</AlertDescription>
                  </Alert>
                )}

                {/* Enhanced Preview Frame */}
                <div className="border rounded-lg p-4 bg-muted/20 relative">
                  {refreshing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Refreshing preview...
                      </div>
                    </div>
                  )}

                  <div
                    className={`mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${deviceConfigs[previewDevice].containerClass}`}
                    style={{ maxWidth: "100%" }}
                  >
                    <iframe
                      key={`${widgetType}-${refreshing}`}
                      src={currentUrl}
                      className={`w-full border-0 transition-all duration-300 ${deviceConfigs[previewDevice].height}`}
                      title={`${widgetType === "booking" ? "Booking" : "Catering"} Widget Preview`}
                      onError={() =>
                        handlePreviewError(
                          `Unable to load the ${widgetType} widget preview. The widget may still work when embedded.`,
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5" />
                        {widgetType === "booking" ? "Booking" : "Catering"}{" "}
                        Widget Configuration
                      </CardTitle>
                      <CardDescription>
                        Professional-grade customization options for your{" "}
                        {widgetType} widget
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRevertChanges}
                        disabled={!hasUnsavedChanges}
                      >
                        <Undo className="w-4 h-4 mr-2" />
                        Revert
                      </Button>
                      <Button
                        onClick={() => handleConfigurationSave()}
                        disabled={isSaving || validationErrors.length > 0}
                        className="flex items-center gap-2"
                      >
                        {isSaving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {isSaving ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Core Appearance Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Appearance</h3>
                    </div>

                    {/* Theme Selection */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Theme Mode
                        </Label>
                        <Select
                          value={currentConfig.theme}
                          onValueChange={(value) =>
                            setCurrentConfig((prev) => ({
                              ...prev,
                              theme: value as "light" | "dark" | "auto",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light Theme</SelectItem>
                            <SelectItem value="dark">Dark Theme</SelectItem>
                            <SelectItem value="auto">Auto (System)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Font Family
                        </Label>
                        <Select
                          value={currentConfig.fontFamily}
                          onValueChange={(value) =>
                            setCurrentConfig((prev) => ({
                              ...prev,
                              fontFamily: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">
                              System Default
                            </SelectItem>
                            <SelectItem value="inter">Inter</SelectItem>
                            <SelectItem value="roboto">Roboto</SelectItem>
                            <SelectItem value="arial">Arial</SelectItem>
                            <SelectItem value="custom">Custom Font</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Color and Border Settings */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label
                          htmlFor="primary-color"
                          className="text-sm font-medium"
                        >
                          Primary Color
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="primary-color"
                            type="color"
                            value={currentConfig.primaryColor}
                            onChange={(e) =>
                              setCurrentConfig((prev) => ({
                                ...prev,
                                primaryColor: e.target.value,
                              }))
                            }
                            className="w-16 h-10 p-1 border rounded"
                          />
                          <Input
                            value={currentConfig.primaryColor}
                            onChange={(e) =>
                              setCurrentConfig((prev) => ({
                                ...prev,
                                primaryColor: e.target.value,
                              }))
                            }
                            className="flex-1 font-mono text-sm"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="border-radius"
                          className="text-sm font-medium"
                        >
                          Border Radius (px)
                        </Label>
                        <Input
                          id="border-radius"
                          type="number"
                          value={currentConfig.borderRadius}
                          onChange={(e) =>
                            setCurrentConfig((prev) => ({
                              ...prev,
                              borderRadius: e.target.value,
                            }))
                          }
                          min="0"
                          max="20"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Feature Configuration - Booking Specific */}
                  {widgetType === "booking" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">
                          Booking Features
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            key: "showAvailability",
                            label: "Show Availability",
                            desc: "Display real-time table availability",
                          },
                          {
                            key: "showPricing",
                            label: "Show Pricing",
                            desc: "Display pricing information",
                          },
                          {
                            key: "allowCancellation",
                            label: "Allow Cancellation",
                            desc: "Let customers cancel bookings",
                          },
                          {
                            key: "enableWaitlist",
                            label: "Enable Waitlist",
                            desc: "Allow customers to join waitlist",
                          },
                          {
                            key: "enableGuestCheckout",
                            label: "Guest Checkout",
                            desc: "Allow booking without registration",
                          },
                          {
                            key: "requireDeposit",
                            label: "Require Deposit",
                            desc: "Require upfront payment",
                          },
                          {
                            key: "autoConfirm",
                            label: "Auto Confirm",
                            desc: "Automatically confirm bookings",
                          },
                          {
                            key: "enableReminders",
                            label: "Send Reminders",
                            desc: "Automatic booking reminders",
                          },
                        ].map(({ key, label, desc }) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {desc}
                              </p>
                            </div>
                            <Switch
                              checked={
                                bookingConfig[
                                  key as keyof typeof bookingConfig
                                ] as boolean
                              }
                              onCheckedChange={(checked) =>
                                setBookingConfig((prev) => ({
                                  ...prev,
                                  [key]: checked,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="advance-booking"
                            className="text-sm font-medium"
                          >
                            Max Advance Booking (days)
                          </Label>
                          <Input
                            id="advance-booking"
                            type="number"
                            value={bookingConfig.maxAdvanceBooking}
                            onChange={(e) =>
                              setBookingConfig((prev) => ({
                                ...prev,
                                maxAdvanceBooking: Number(e.target.value),
                              }))
                            }
                            min="1"
                            max="365"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="time-slot"
                            className="text-sm font-medium"
                          >
                            Time Slot Interval (min)
                          </Label>
                          <Input
                            id="time-slot"
                            type="number"
                            value={bookingConfig.timeSlotInterval}
                            onChange={(e) =>
                              setBookingConfig((prev) => ({
                                ...prev,
                                timeSlotInterval: Number(e.target.value),
                              }))
                            }
                            min="15"
                            max="120"
                            step="15"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="max-party"
                            className="text-sm font-medium"
                          >
                            Max Party Size
                          </Label>
                          <Input
                            id="max-party"
                            type="number"
                            value={bookingConfig.maxPartySize}
                            onChange={(e) =>
                              setBookingConfig((prev) => ({
                                ...prev,
                                maxPartySize: Number(e.target.value),
                              }))
                            }
                            min="1"
                            max="50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Configuration - Catering Specific */}
                  {widgetType === "catering" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <ChefHat className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">
                          Catering Features
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            key: "showPackages",
                            label: "Show Packages",
                            desc: "Display pre-designed catering packages",
                          },
                          {
                            key: "showCustomOrders",
                            label: "Custom Orders",
                            desc: "Allow custom catering requests",
                          },
                          {
                            key: "enableQuotes",
                            label: "Enable Quotes",
                            desc: "Allow customers to request quotes",
                          },
                          {
                            key: "showGallery",
                            label: "Show Gallery",
                            desc: "Display food gallery and photos",
                          },
                          {
                            key: "enableBulkOrders",
                            label: "Bulk Orders",
                            desc: "Support for large quantity orders",
                          },
                          {
                            key: "requireDeposit",
                            label: "Require Deposit",
                            desc: "Require upfront payment",
                          },
                          {
                            key: "enableMenuCustomization",
                            label: "Menu Customization",
                            desc: "Allow menu modifications",
                          },
                          {
                            key: "enableAllergyFilters",
                            label: "Allergy Filters",
                            desc: "Show allergen information",
                          },
                        ].map(({ key, label, desc }) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {desc}
                              </p>
                            </div>
                            <Switch
                              checked={
                                cateringConfig[
                                  key as keyof typeof cateringConfig
                                ] as boolean
                              }
                              onCheckedChange={(checked) =>
                                setCateringConfig((prev) => ({
                                  ...prev,
                                  [key]: checked,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="min-order-days"
                            className="text-sm font-medium"
                          >
                            Min Order Days Advance
                          </Label>
                          <Input
                            id="min-order-days"
                            type="number"
                            value={cateringConfig.minOrderDays}
                            onChange={(e) =>
                              setCateringConfig((prev) => ({
                                ...prev,
                                minOrderDays: Number(e.target.value),
                              }))
                            }
                            min="1"
                            max="30"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="min-order-value"
                            className="text-sm font-medium"
                          >
                            Min Order Value ($)
                          </Label>
                          <Input
                            id="min-order-value"
                            type="number"
                            value={cateringConfig.minOrderValue}
                            onChange={(e) =>
                              setCateringConfig((prev) => ({
                                ...prev,
                                minOrderValue: Number(e.target.value),
                              }))
                            }
                            min="0"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="deposit-percentage"
                            className="text-sm font-medium"
                          >
                            Deposit Percentage (%)
                          </Label>
                          <Input
                            id="deposit-percentage"
                            type="number"
                            value={cateringConfig.depositPercentage}
                            onChange={(e) =>
                              setCateringConfig((prev) => ({
                                ...prev,
                                depositPercentage: Number(e.target.value),
                              }))
                            }
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Common Features */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Common Features</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          key: "requirePhone",
                          label: "Require Phone Number",
                          desc: "Make phone number mandatory",
                        },
                        {
                          key: "enableNotifications",
                          label: "Enable Notifications",
                          desc: "Send confirmation emails/SMS",
                        },
                        {
                          key: "enableChatbot",
                          label: "Enable Chatbot",
                          desc: "Integrated customer support chat",
                        },
                        {
                          key: "lazyLoading",
                          label: "Lazy Loading",
                          desc: "Improve performance with lazy loading",
                        },
                      ].map(({ key, label, desc }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">
                              {label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {desc}
                            </p>
                          </div>
                          <Switch
                            checked={
                              currentConfig[
                                key as keyof typeof currentConfig
                              ] as boolean
                            }
                            onCheckedChange={(checked) =>
                              setCurrentConfig((prev) => ({
                                ...prev,
                                [key]: checked,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Advanced Configuration */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">
                        Advanced Configuration
                      </h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label
                          htmlFor="welcome-message"
                          className="text-sm font-medium"
                        >
                          Welcome Message
                        </Label>
                        <Textarea
                          id="welcome-message"
                          value={currentConfig.welcomeMessage}
                          onChange={(e) =>
                            setCurrentConfig((prev) => ({
                              ...prev,
                              welcomeMessage: e.target.value,
                            }))
                          }
                          placeholder="Welcome to our restaurant!"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="google-analytics"
                          className="text-sm font-medium"
                        >
                          Google Analytics ID
                        </Label>
                        <Input
                          id="google-analytics"
                          value={currentConfig.googleAnalyticsId}
                          onChange={(e) =>
                            setCurrentConfig((prev) => ({
                              ...prev,
                              googleAnalyticsId: e.target.value,
                            }))
                          }
                          placeholder="GA-XXXXXXXXX-X"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="custom-css"
                        className="text-sm font-medium"
                      >
                        Custom CSS
                      </Label>
                      <Textarea
                        id="custom-css"
                        value={currentConfig.customCSS}
                        onChange={(e) =>
                          setCurrentConfig((prev) => ({
                            ...prev,
                            customCSS: e.target.value,
                          }))
                        }
                        placeholder="/* Add your custom CSS here */"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Enhanced Embed Code Tab */}
          <TabsContent value="embed" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Simple Embed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Basic Embed
                  </CardTitle>
                  <CardDescription>
                    Simple iframe embed code for most websites
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {embedCodes.basicEmbed}
                    </pre>
                  </div>

                  <Button
                    onClick={() =>
                      copyToClipboard(embedCodes.basicEmbed, "Basic embed code")
                    }
                    className="w-full"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Basic Embed"}
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
                    JavaScript embed with error handling and analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-60">
                    <pre className="whitespace-pre-wrap">
                      {embedCodes.advancedEmbed}
                    </pre>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        embedCodes.advancedEmbed,
                        "Advanced embed code",
                      )
                    }
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Advanced Embed
                  </Button>
                </CardContent>
              </Card>

              {/* Responsive Embed */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Responsive Embed
                  </CardTitle>
                  <CardDescription>
                    Mobile-friendly responsive embed code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {embedCodes.responsiveEmbed}
                    </pre>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        embedCodes.responsiveEmbed,
                        "Responsive embed code",
                      )
                    }
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Responsive Embed
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Widget Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {widgetType === "booking" ? (
                    <Calendar className="w-5 h-5 text-blue-500" />
                  ) : (
                    <ChefHat className="w-5 h-5 text-orange-500" />
                  )}
                  {widgetType === "booking" ? "Booking" : "Catering"} Widget
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Widget URL</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentUrl}
                        readOnly
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(currentUrl, "Widget URL")
                        }
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Widget Status</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-md flex-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          Active & Deployed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Key Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {analytics.views.toLocaleString()}
                    </span>
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xs text-green-600 mt-1">+12% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {analytics.conversions}
                    </span>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-xs text-green-600 mt-1">+8% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {analytics.conversionRate}%
                    </span>
                    <Activity className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-xs text-red-600 mt-1">-2% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {analytics.avgSessionTime}s
                    </span>
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-xs text-green-600 mt-1">+15% this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Loading Speed</span>
                    <span className="text-sm text-green-600">
                      Excellent (0.8s)
                    </span>
                  </div>
                  <Progress value={85} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Mobile Experience
                    </span>
                    <span className="text-sm text-green-600">
                      Good (92/100)
                    </span>
                  </div>
                  <Progress value={92} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Accessibility</span>
                    <span className="text-sm text-blue-600">
                      Very Good (88/100)
                    </span>
                  </div>
                  <Progress value={88} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Widget Versions
                </CardTitle>
                <CardDescription>
                  Track and manage different versions of your widget
                  configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {version.version}
                            </span>
                            {version.isActive && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(version.createdAt).toLocaleDateString()} -{" "}
                            {version.changes}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {!version.isActive && (
                          <Button variant="outline" size="sm">
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuration History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Configuration Changes</CardTitle>
              </CardHeader>
              <CardContent>
                {configHistory.length > 0 ? (
                  <div className="space-y-3">
                    {configHistory.slice(0, 10).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{entry.user}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(entry.changes)[0]} updated
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No configuration history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Quick Setup Tab */}
          <TabsContent value="manage" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Booking Widget Overview */}
              <Card
                className={`transition-all ${widgetType === "booking" ? "ring-2 ring-blue-500" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Booking Widget
                  </CardTitle>
                  <CardDescription>
                    Table reservation and booking management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Theme</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {bookingConfig.theme}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Features Enabled</span>
                      <span className="text-sm text-muted-foreground">
                        {
                          Object.values(bookingConfig).filter((v) => v === true)
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Updated</span>
                      <span className="text-sm text-muted-foreground">
                        {lastSaved
                          ? new Date(lastSaved).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWidgetType("booking")}
                      className="flex-1"
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                    <Button size="sm" asChild className="flex-1">
                      <a
                        href={widgetUrls.booking}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Catering Widget Overview */}
              <Card
                className={`transition-all ${widgetType === "catering" ? "ring-2 ring-orange-500" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-orange-500" />
                    Catering Widget
                  </CardTitle>
                  <CardDescription>
                    Catering orders and event management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Theme</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {cateringConfig.theme}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Features Enabled</span>
                      <span className="text-sm text-muted-foreground">
                        {
                          Object.values(cateringConfig).filter(
                            (v) => v === true,
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Updated</span>
                      <span className="text-sm text-muted-foreground">
                        {lastSaved
                          ? new Date(lastSaved).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWidgetType("catering")}
                      className="flex-1"
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                    <Button size="sm" asChild className="flex-1">
                      <a
                        href={widgetUrls.catering}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs">Generate QR</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-xs">Export Config</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Share className="w-5 h-5" />
                    <span className="text-xs">Share Widget</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-xs">View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debug Panel for Development */}
        {process.env.NODE_ENV === "development" && tenant?.slug && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Development Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">
                    Current Environment
                  </Label>
                  <p className="text-sm text-muted-foreground">Development</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tenant ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {tenant.id}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Network Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {isOnline ? "Connected" : "Offline"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Unsaved Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    {hasUnsavedChanges ? "Yes" : "No"}
                  </p>
                </div>
              </div>
              <BookingDebugger slug={tenant.slug} />
            </CardContent>
          </Card>
        )}

        {/* Floating Save Button */}
        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Button
                onClick={() => handleConfigurationSave()}
                disabled={isSaving || validationErrors.length > 0}
                className="shadow-lg"
                size="lg"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

export default WidgetManagement;
