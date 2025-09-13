import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '@/hooks/useTenant';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Settings2 as Settings,
  Calendar,
  ChefHat,
  Eye,
  BarChart3,
  Code2 as Code,
  Copy,
  Loader2,
  Save,
  RotateCcw,
  Download,
  Upload,
  Palette,
  Type,
  Layout,
  Zap,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Check,
  ExternalLink,
  Mail,
  Camera,
} from 'lucide-react';
import { useWidgetConfig } from '@/widgets/management/useWidgetConfig';
import { 
  WidgetConfig, 
  WidgetAnalytics, 
  WidgetFontFamily, 
  BookingSource 
} from '@/widgets/management/types';
import { getDefaultConfig } from '@/widgets/management/defaults';
import { validateConfig } from '@/widgets/management/validation';
import { createWidgetToken } from '@/widgets/management/tokenUtils';
import { useWidgetAnalytics, formatAnalyticsValue, analyticsFormatters } from '@/widgets/management/useWidgetAnalytics';
import { TenantStatusCard } from '@/widgets/management/components/TenantStatusCard';
import { WidgetHeader } from '@/widgets/management/components/WidgetHeader';
import { ValidationErrorAlert } from '@/widgets/management/components/ValidationErrorAlert';
import { 
  ALIGNMENT_MAP, 
  FONT_WEIGHT_MAP, 
  TEXT_ALIGNMENT_MAP,
  ANIMATION_MAP,
  DEVICE_STYLES,
  DEVICE_FRAME_STYLES,
  DEVICE_SCREEN_STYLES,
  WIDGET_SCALE_MAP,
  createWidgetContainerStyle,
  createCustomProperties,
  getSpacingStyle 
} from '@/widgets/management/styleUtils';
import { copyText } from '@/utils/clipboard';

// Types now imported from widgets/management/types

const WidgetManagement: React.FC = () => {
  const { tenant, tenantSlug, loading: tenantLoading, error: tenantError } = useTenant();
  const { toast } = useToast();
  
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);

  // Tenant slug resolution - no demo fallbacks
  const resolvedTenantSlug = useMemo(() => {
    // Priority order for slug resolution:
    // 1. URL slug parameter (from useTenant)
    // 2. Tenant object slug
    // No fallbacks - require real tenant data
    return tenantSlug || tenant?.slug;
  }, [tenantSlug, tenant?.slug]);

  // Use centralized widget config hook for robustness
  const {
    bookingConfig,
    cateringConfig,
    currentConfig,
    setCurrentConfig,
    hasUnsavedChanges,
    validationErrors,
    lastSavedTimestamp,
    updateConfig,
    saveConfiguration,
    resetToDefaults: resetDefaultsFromHook,
    safeParseInt,
    setActiveWidgetType: setTypeFromHook,
    tenantIdentifier,
    getTenantConfigurations,
    exportTenantConfiguration,
  } = useWidgetConfig('booking', tenant?.id ?? null, resolvedTenantSlug ?? null);

  // Keep local activeWidgetType in sync with hook state
  useEffect(() => {
    setTypeFromHook(activeWidgetType);
  }, [activeWidgetType, setTypeFromHook]);

  // Local saving spinner state wrapping hook save
  const [isSaving, setIsSaving] = useState(false);
  const resetToDefaults = useCallback(() => {
    resetDefaultsFromHook();
  }, [resetDefaultsFromHook]);
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveConfiguration();
    } finally {
      setIsSaving(false);
    }
  }, [saveConfiguration]);

  // Defaults now centralized in widgets/management/defaults

  // Additional component state
  const realWidgetId = `${resolvedTenantSlug || 'tenant'}_${activeWidgetType}_${tenantIdentifier?.slice(-8) || 'widget'}`;

  // Configuration management now handled by useWidgetConfig

  // Generate embed code based on current config and real tenant data
  const embedCode = `<iframe src="https://yourdomain.com/widget/${realWidgetId}" width="${currentConfig.width}" height="${currentConfig.height}" frameborder="0"></iframe>`;

  // Validation now centralized in widgets/management/validation

  // Update configuration with validation
  // updateConfig provided by hook

  // Enhanced save configuration with better error handling
  // saveConfiguration provided by hook

  // Enhanced configuration loading with better error handling
  // loading/saving now handled by hook on mount and when identifiers change

  // Widget URL and embed code generation with enhanced error handling
  const generateWidgetUrl = useCallback((type: 'booking' | 'catering') => {
    try {
      // Real tenant slug required - no fallbacks
      const effectiveSlug = resolvedTenantSlug;
      
      if (!effectiveSlug) {
        console.error('No tenant slug available for URL generation - real tenant required');
        throw new Error('Tenant slug required for widget URL generation');
      }
      
      const baseUrl = window.location.origin;
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      
      if (!config) {
        console.error('No configuration available for URL generation');
        throw new Error('Widget configuration required for URL generation');
      }
      
      // Use the actual booking system routes
      const widgetPath = type === 'booking' ? '/book' : '/catering';
      
      // Create signed token instead of exposing tenant_id/config_id
      const widgetToken = createWidgetToken(effectiveSlug, '2.0', type);
      
      // Build configuration parameters - let URLSearchParams handle encoding
      const configParams = new URLSearchParams();
      
      // Only include slug and signed token
      configParams.set('slug', effectiveSlug);
      configParams.set('token', widgetToken);
      configParams.set('widget_version', '2.0');
      
      // Tenant context parameters (safe to expose)
      if (tenant?.timezone) {
        configParams.set('timezone', tenant.timezone);
      }
      if (tenant?.currency) {
        configParams.set('currency', tenant.currency);
      }
      
      // Appearance parameters - URLSearchParams handles encoding automatically
      configParams.set('theme', config.theme || 'light');
      configParams.set('primaryColor', config.primaryColor || '#3b82f6');
      configParams.set('secondaryColor', config.secondaryColor || '#1e40af');
      configParams.set('backgroundColor', config.backgroundColor || '#ffffff');
      configParams.set('textColor', config.textColor || '#1f2937');
      
      // Layout parameters with safe defaults
      configParams.set('borderRadius', (config.borderRadius || 8).toString());
      configParams.set('width', (config.width || 400).toString());
      configParams.set('height', (config.height || 600).toString());
      
      // Content parameters - URLSearchParams handles encoding
      if (config.welcomeMessage) {
        configParams.set('welcomeMessage', config.welcomeMessage);
      }
      if (config.buttonText) {
        configParams.set('buttonText', config.buttonText);
      }
      
      // Feature flags with proper boolean handling
      configParams.set('showLogo', (config.showLogo ?? true).toString());
      configParams.set('showDescription', (config.showDescription ?? true).toString());
      configParams.set('showFooter', (config.showFooter ?? true).toString());
      configParams.set('enableAnimations', (config.enableAnimations ?? true).toString());
      configParams.set('animationType', config.animationType || 'fade');
      
      // Booking-specific parameters
      if (type === 'booking') {
        if (config.enableTableOptimization !== undefined) {
          configParams.set('enableTableOptimization', config.enableTableOptimization.toString());
        }
        if (config.maxPartySize) {
          configParams.set('maxPartySize', config.maxPartySize.toString());
        }
        if (config.requireDeposit !== undefined) {
          configParams.set('requireDeposit', config.requireDeposit.toString());
        }
        if (config.enableSpecialRequests !== undefined) {
          configParams.set('enableSpecialRequests', config.enableSpecialRequests.toString());
        }
      }
      
      return `${baseUrl}${widgetPath}/${effectiveSlug}?${configParams.toString()}`;
    } catch (error) {
      console.error('Error generating widget URL:', error);
      // Require real tenant data - no fallbacks
      console.error('Error generating widget URL - real tenant data required');
      throw new Error('Failed to generate widget URL - tenant information required');
    }
  }, [bookingConfig, cateringConfig, resolvedTenantSlug, tenant?.timezone, tenant?.currency]);

  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    try {
      const url = generateWidgetUrl(type);
      
      if (!url) {
        return '<!-- Error: Unable to generate widget URL. Please check your configuration. -->';
      }
      
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      
      if (!config) {
        return '<!-- Error: Widget configuration not found -->';
      }
      
      const widgetId = `blunari-${type}-widget-${Date.now()}`;
      
      return `<!-- Blunari ${type.charAt(0).toUpperCase() + type.slice(1)} Widget with PostMessage Communication -->
<script>
(function() {
  try {
    var widget = document.createElement('div');
    widget.id = '${widgetId}';
    widget.style.cssText = 'width: ${config.width || 400}px; height: ${config.height || 600}px; max-width: 100%; margin: 0 auto; border-radius: ${config.borderRadius || 8}px; overflow: hidden; box-shadow: 0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,0.1);';
    
    var iframe = document.createElement('iframe');
    iframe.src = '${url}';
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
    iframe.frameBorder = '0';
    iframe.allowTransparency = 'true';
    iframe.scrolling = 'auto';
    iframe.title = '${(config.welcomeMessage || '').replace(/'/g, "\\'")} - ${type} widget';
    iframe.setAttribute('data-widget-type', '${type}');
    iframe.setAttribute('data-widget-id', '${widgetId}');
    
    // PostMessage event listener for iframe communication
    function handleWidgetMessage(event) {
      // Verify origin for security (replace with your actual domain)
      if (event.origin !== window.location.origin) {
        return;
      }
      
      var data = event.data;
      if (!data || !data.type || data.widgetId !== '${widgetId}') {
        return;
      }
      
      switch (data.type) {
        case 'widget_loaded':
          console.log('Widget loaded successfully:', data);
          iframe.style.opacity = '1';
          iframe.style.transition = 'opacity 0.3s ease-in-out';
          break;
          
        case 'widget_resize':
          if (data.height && data.height > 0) {
            iframe.style.height = data.height + 'px';
            widget.style.height = data.height + 'px';
            console.log('Widget resized to height:', data.height);
          }
          break;
          
        case 'widget_conversion':
          console.log('Widget conversion event:', data);
          // Trigger custom analytics or tracking
          if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
              event_category: 'widget',
              event_label: '${type}_conversion',
              value: data.value || 1
            });
          }
          break;
          
        case 'widget_error':
          console.error('Widget error:', data.error);
          widget.innerHTML = '<div style="padding: 20px; text-align: center; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;"><strong>Widget Error</strong><br/>Unable to load ${type} widget. Please refresh the page or contact support.</div>';
          break;
          
        case 'widget_close':
          widget.style.display = 'none';
          console.log('Widget closed by user');
          break;
      }
    }
    
    // Add global message listener
    if (window.addEventListener) {
      window.addEventListener('message', handleWidgetMessage, false);
    } else if (window.attachEvent) {
      window.attachEvent('onmessage', handleWidgetMessage);
    }
    
    // Iframe load handlers
    iframe.onerror = function() {
      console.error('Failed to load Blunari ${type} widget');
      widget.innerHTML = '<div style="padding: 20px; text-align: center; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">Unable to load widget. Please try again later.</div>';
    };
    
    iframe.onload = function() {
      console.log('Blunari ${type} widget iframe loaded');
      // Send initialization message to widget
      iframe.contentWindow.postMessage({
        type: 'parent_ready',
        widgetId: '${widgetId}',
        config: {
          theme: '${config.theme}',
          primaryColor: '${config.primaryColor}',
          secondaryColor: '${config.secondaryColor}'
        }
      }, '*');
    };
    
    // Set initial opacity for smooth loading
    iframe.style.opacity = '0.3';
    iframe.style.transition = 'opacity 0.3s ease-in-out';
    
    widget.appendChild(iframe);
    
    // Insert widget
    var targetElement = document.currentScript ? document.currentScript.parentNode : document.body;
    var nextSibling = document.currentScript ? document.currentScript.nextSibling : null;
    targetElement.insertBefore(widget, nextSibling);
  } catch (error) {
    console.error('Error initializing Blunari widget:', error);
  }
})();
</script>

<!-- Alternative: Simple iframe embed with basic postMessage support -->
<iframe 
  src="${url}"
  width="${config.width || 400}" 
  height="${config.height || 600}" 
  frameborder="0"
  style="border-radius: ${config.borderRadius || 8}px; box-shadow: 0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,0.1); max-width: 100%;"
  title="${(config.welcomeMessage || '').replace(/"/g, '&quot;')} - ${type} widget"
  data-widget-type="${type}"
  onload="console.log('Blunari ${type} widget loaded');"
  onerror="this.style.display='none'; console.error('Failed to load Blunari widget');">
</iframe>

<!-- Recommended CSP headers for embedding:
Content-Security-Policy: 
  frame-src 'self' ${window.location.origin}; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https:;
-->`;
    } catch (error) {
      console.error('Error generating embed code:', error);
      return '<!-- Error: Unable to generate embed code. Please check your configuration and try again. -->';
    }
  }, [generateWidgetUrl, bookingConfig, cateringConfig]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      setIsLoading(true);
      await copyText(text);
      toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    } catch (error) {
      toast({ title: 'Copy Failed', description: 'Failed to copy to clipboard', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Use real analytics hook instead of mock data
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics,
    isAvailable: analyticsAvailable 
  } = useWidgetAnalytics({
    tenantId: tenant?.id || null,
    tenantSlug: resolvedTenantSlug || null,
    widgetType: activeWidgetType,
  });

  // Reset to defaults handled by hook via resetToDefaults

  // Keyboard shortcuts and focus management
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            if (!isSaving && validationErrors.length === 0) {
              handleSave();
            }
            break;
          case 'r':
            event.preventDefault();
            resetToDefaults();
            break;
          case '1':
            event.preventDefault();
            setSelectedTab('configure');
            // Focus on first heading when switching tabs
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3, [role="tabpanel"][data-state="active"] h4');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '2':
            event.preventDefault();
            setSelectedTab('preview');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '3':
            event.preventDefault();
            setSelectedTab('analytics');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '4':
            event.preventDefault();
            setSelectedTab('embed');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [isSaving, validationErrors.length, saveConfiguration, resetToDefaults, setSelectedTab]);

  // Warn about unsaved changes before page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="container mx-auto p-6 space-y-6" role="main" aria-label="Widget Management Dashboard">
      {/* Tenant Status */}
      <TenantStatusCard
        tenant={tenant}
        tenantSlug={resolvedTenantSlug}
        tenantIdentifier={tenantIdentifier}
        activeWidgetType={activeWidgetType}
        hasUnsavedChanges={hasUnsavedChanges}
        onExportConfig={exportTenantConfiguration}
        tenantLoading={tenantLoading}
        tenantError={tenantError}
      />

      {/* Header */}
      <WidgetHeader
        activeWidgetType={activeWidgetType}
        onWidgetTypeChange={setActiveWidgetType}
        hasUnsavedChanges={hasUnsavedChanges}
        validationErrors={validationErrors}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={resetToDefaults}
      />

      {/* Validation errors */}
      <ValidationErrorAlert errors={validationErrors} />

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
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
            Deploy
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          {/* Tenant-Specific Configuration Info */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Settings className="w-5 h-5" />
                Tenant-Specific Widget Configuration
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Each restaurant has its own customized widget settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Current Tenant</p>
                    <p className="font-semibold">{tenant?.name || 'Loading...'}</p>
                    <p className="text-xs text-muted-foreground">Slug: {resolvedTenantSlug}</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Configuration ID</p>
                    <p className="font-mono text-sm">{tenantIdentifier}</p>
                    <p className="text-xs text-muted-foreground">Unique identifier</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Storage Namespace</p>
                    <p className="font-mono text-sm">blunari-widget-{activeWidgetType}</p>
                    <p className="text-xs text-muted-foreground">Local storage key</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">How Tenant-Specific Customization Works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Each tenant has completely isolated widget configurations</li>
                    <li>Changes you make here only affect <strong>{tenant?.name || 'this tenant'}</strong>'s widgets</li>
                    <li>Colors, text, layout, and features are tenant-specific</li>
                    <li>Widget URLs automatically include the tenant identifier: <code>/{activeWidgetType === 'booking' ? 'book' : 'catering'}/{resolvedTenantSlug}</code></li>
                    <li>Configurations are saved locally and can be exported/imported</li>
                  </ul>
                </div>
                
                {getTenantConfigurations().length > 0 && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {getTenantConfigurations().length} saved configuration(s)
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Last saved: {lastSavedTimestamp ? new Date(lastSavedTimestamp).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportTenantConfiguration}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Content & Text
                </CardTitle>
                <CardDescription>
                  Configure the text content and messaging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Input
                    id="welcome-message"
                    value={currentConfig.welcomeMessage}
                    onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                    placeholder="Enter welcome message"
                    aria-invalid={validationErrors.find(e => e.field === 'welcomeMessage') ? 'true' : 'false'}
                    aria-describedby={validationErrors.find(e => e.field === 'welcomeMessage') ? 'welcome-message-error' : undefined}
                    className={validationErrors.find(e => e.field === 'welcomeMessage') ? 'border-red-500' : ''}
                  />
                  {validationErrors.find(e => e.field === 'welcomeMessage') && (
                    <p id="welcome-message-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.find(e => e.field === 'welcomeMessage')?.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={currentConfig.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    placeholder="Enter widget description"
                    rows={2}
                    aria-describedby="description-help"
                  />
                  <p id="description-help" className="text-sm text-muted-foreground">
                    Brief description of your widget for accessibility
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="button-text">Button Text</Label>
                  <Input
                    id="button-text"
                    value={currentConfig.buttonText}
                    onChange={(e) => updateConfig({ buttonText: e.target.value })}
                    placeholder="Enter button text"
                    aria-invalid={validationErrors.find(e => e.field === 'buttonText') ? 'true' : 'false'}
                    aria-describedby={validationErrors.find(e => e.field === 'buttonText') ? 'button-text-error' : undefined}
                    className={validationErrors.find(e => e.field === 'buttonText') ? 'border-red-500' : ''}
                  />
                  {validationErrors.find(e => e.field === 'buttonText') && (
                    <p id="button-text-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.find(e => e.field === 'buttonText')?.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={currentConfig.footerText}
                    onChange={(e) => updateConfig({ footerText: e.target.value })}
                    placeholder="Enter footer text"
                    aria-describedby="footer-text-help"
                  />
                  <p id="footer-text-help" className="text-sm text-muted-foreground">
                    Optional footer text (e.g., "Powered by YourBrand")
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Appearance & Colors
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={currentConfig.theme} onValueChange={(value: 'light' | 'dark' | 'auto') => updateConfig({ theme: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.secondaryColor}
                        onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.secondaryColor}
                        onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        placeholder="#1f2937"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Layout & Dimensions
                </CardTitle>
                <CardDescription>
                  Configure size and spacing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={currentConfig.width}
                      onChange={(e) => updateConfig({ width: safeParseInt(e.target.value, 400, 300, 800) })}
                      min="300"
                      max="800"
                      className={validationErrors.find(e => e.field === 'width') ? 'border-red-500' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={currentConfig.height}
                      onChange={(e) => updateConfig({ height: safeParseInt(e.target.value, 600, 400, 1000) })}
                      min="400"
                      max="1000"
                      className={validationErrors.find(e => e.field === 'height') ? 'border-red-500' : ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Border Radius: {currentConfig.borderRadius}px</Label>
                  <Slider
                    value={[currentConfig.borderRadius]}
                    onValueChange={([value]) => updateConfig({ borderRadius: value })}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Shadow Intensity: {currentConfig.shadowIntensity}</Label>
                  <Slider
                    value={[currentConfig.shadowIntensity]}
                    onValueChange={([value]) => updateConfig({ shadowIntensity: value })}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Content Alignment</Label>
                  <Select value={currentConfig.alignment} onValueChange={(value: 'left' | 'center' | 'right') => updateConfig({ alignment: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Typography & Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Typography & Features
                </CardTitle>
                <CardDescription>
                  Font settings and widget features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select value={currentConfig.fontFamily} onValueChange={(value: WidgetFontFamily) => updateConfig({ fontFamily: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Default</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="open-sans">Open Sans</SelectItem>
                      <SelectItem value="lato">Lato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Font Size: {currentConfig.fontSize}px</Label>
                  <Slider
                    value={[currentConfig.fontSize]}
                    onValueChange={([value]) => updateConfig({ fontSize: value })}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Show Logo</Label>
                    <Switch
                      id="show-logo"
                      checked={currentConfig.showLogo}
                      onCheckedChange={(checked) => updateConfig({ showLogo: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-description">Show Description</Label>
                    <Switch
                      id="show-description"
                      checked={currentConfig.showDescription}
                      onCheckedChange={(checked) => updateConfig({ showDescription: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-animations">Enable Animations</Label>
                    <Switch
                      id="enable-animations"
                      checked={currentConfig.enableAnimations}
                      onCheckedChange={(checked) => updateConfig({ enableAnimations: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <Switch
                      id="compact-mode"
                      checked={currentConfig.compactMode}
                      onCheckedChange={(checked) => updateConfig({ compactMode: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking-Specific Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {activeWidgetType === 'booking' ? 'Booking' : 'Catering'} Features
                </CardTitle>
                <CardDescription>
                  Advanced features specific to your {activeWidgetType} widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeWidgetType === 'booking' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="table-optimization">Smart Table Optimization</Label>
                      <Switch
                        id="table-optimization"
                        checked={currentConfig.enableTableOptimization}
                        onCheckedChange={(checked) => updateConfig({ enableTableOptimization: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="duration-selector">Show Duration Selector</Label>
                      <Switch
                        id="duration-selector"
                        checked={currentConfig.showDurationSelector}
                        onCheckedChange={(checked) => updateConfig({ showDurationSelector: checked })}
                      />
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="availability-indicator">Show Availability Indicator</Label>
                  <Switch
                    id="availability-indicator"
                    checked={currentConfig.showAvailabilityIndicator}
                    onCheckedChange={(checked) => updateConfig({ showAvailabilityIndicator: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="special-requests">Enable Special Requests</Label>
                  <Switch
                    id="special-requests"
                    checked={currentConfig.enableSpecialRequests}
                    onCheckedChange={(checked) => updateConfig({ enableSpecialRequests: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone-booking">Enable Phone Booking</Label>
                  <Switch
                    id="phone-booking"
                    checked={currentConfig.enablePhoneBooking}
                    onCheckedChange={(checked) => updateConfig({ enablePhoneBooking: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-deposit">Require Deposit</Label>
                  <Switch
                    id="require-deposit"
                    checked={currentConfig.requireDeposit}
                    onCheckedChange={(checked) => updateConfig({ requireDeposit: checked })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Party Size</Label>
                    <Input
                      type="number"
                      value={currentConfig.maxPartySize}
                      onChange={(e) => updateConfig({ maxPartySize: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="100"
                      className={validationErrors.find(e => e.field === 'maxPartySize') ? 'border-red-500' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Min Advance (hours)</Label>
                    <Input
                      type="number"
                      value={currentConfig.minAdvanceBooking}
                      onChange={(e) => updateConfig({ minAdvanceBooking: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="48"
                      className={validationErrors.find(e => e.field === 'minAdvanceBooking') ? 'border-red-500' : ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Advance Booking (days)</Label>
                  <Input
                    type="number"
                    value={currentConfig.maxAdvanceBooking}
                    onChange={(e) => updateConfig({ maxAdvanceBooking: parseInt(e.target.value) || 30 })}
                    min="1"
                    max="365"
                    className={validationErrors.find(e => e.field === 'maxAdvanceBooking') ? 'border-red-500' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Booking Source</Label>
                  <Select value={currentConfig.bookingSource} onValueChange={(value: BookingSource) => updateConfig({ bookingSource: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="widget">Widget</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="partner">Partner Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Widget Preview</h3>
              <p className="text-sm text-muted-foreground">
                Preview your {activeWidgetType} widget across different devices
              </p>
            </div>
            
            {/* Device selector */}
            <div className="flex items-center gap-2">
              <Label>Device:</Label>
              <Select value={previewDevice} onValueChange={(value: 'desktop' | 'tablet' | 'mobile') => setPreviewDevice(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </div>
                  </SelectItem>
                  <SelectItem value="tablet">
                    <div className="flex items-center gap-2">
                      <Tablet className="w-4 h-4" />
                      Tablet
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              {/* Device Frame Background */}
              <div className="min-h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
                {/* Device Frame */}
                <div 
                  className={DEVICE_STYLES[previewDevice]}
                >
                  {/* Device chrome/frame */}
                  <div 
                    className={DEVICE_FRAME_STYLES[previewDevice]}
                  >
                    {/* Screen/viewport */}
                    <div 
                      className={DEVICE_SCREEN_STYLES[previewDevice]}
                    >
                      {/* Widget container with proper centering */}
                      <div className="h-full flex items-center justify-center p-4 bg-gray-50">
                        {/* Actual Widget Preview */}
                        <div 
                          className={`rounded-lg shadow-lg transition-all duration-300 overflow-hidden relative ${WIDGET_SCALE_MAP[previewDevice]}`}
                          style={createWidgetContainerStyle(currentConfig, previewDevice)}
                          data-widget-preview="true"
                        >
                          {/* Widget Content */}
                          <div 
                            className="h-full flex flex-col" 
                            style={{
                              padding: currentConfig.padding,
                              ...createCustomProperties(currentConfig),
                              ...getSpacingStyle(currentConfig.spacing)
                            }}
                          >
                            {/* Header Section */}
                            <div className="space-y-1 mb-1">
                              {currentConfig.showLogo && (
                                <div className={`flex ${ALIGNMENT_MAP[currentConfig.alignment]}`}>
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                                    style={{ 
                                      width: currentConfig.fontSize * 2.5, 
                                      height: currentConfig.fontSize * 2.5 
                                    }}
                                  >
                                    <span 
                                      className="text-white font-bold"
                                      style={{ fontSize: currentConfig.fontSize * 0.8 }}
                                    >
                                      B
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              <div style={{ textAlign: currentConfig.alignment }}>
                                <h3 
                                  className={`${FONT_WEIGHT_MAP[currentConfig.fontWeight]} mb-2`}
                                  style={{ 
                                    fontSize: currentConfig.fontSize * 1.3,
                                    lineHeight: currentConfig.lineHeight,
                                  }}
                                >
                                  {currentConfig.welcomeMessage}
                                </h3>
                                {currentConfig.showDescription && currentConfig.description && (
                                  <p 
                                    className="opacity-80 mb-4"
                                    style={{ 
                                      fontSize: currentConfig.fontSize * 0.85,
                                      lineHeight: currentConfig.lineHeight,
                                    }}
                                  >
                                    {currentConfig.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Main Content Area */}
                            <div className="flex-1 flex items-center justify-center py-4">
                              <div className="text-center space-y-4 w-full max-w-sm">
                                {/* Interactive content placeholder showing real booking flow */}
                                <div className="space-y-3">
                                  {/* Step indicator */}
                                  <div className="flex items-center justify-center gap-2 mb-4">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">1</div>
                                    <div className="w-8 h-0.5 bg-gray-200"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">2</div>
                                    <div className="w-8 h-0.5 bg-gray-200"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">3</div>
                                    <div className="w-8 h-0.5 bg-gray-200"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">4</div>
                                  </div>
                                  
                                  {/* Current step content */}
                                  {activeWidgetType === 'booking' ? (
                                    <div className="space-y-3">
                                      <div className="text-sm font-medium text-left">Customer Details</div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 bg-gray-100 rounded border text-left">Guest Name</div>
                                        <div className="p-2 bg-gray-100 rounded border text-left">Party Size</div>
                                      </div>
                                      <div className="p-2 bg-gray-100 rounded border text-left text-xs">Email Address</div>
                                      {currentConfig.enableSpecialRequests && (
                                        <div className="p-2 bg-gray-100 rounded border text-left text-xs">Special Requests</div>
                                      )}
                                      {currentConfig.showAvailabilityIndicator && (
                                        <div className="flex items-center gap-2 text-xs text-green-600">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span>Available slots found</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="text-sm font-medium text-left">Catering Details</div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 bg-gray-100 rounded border text-left">Event Date</div>
                                        <div className="p-2 bg-gray-100 rounded border text-left">Guest Count</div>
                                      </div>
                                      <div className="p-2 bg-gray-100 rounded border text-left text-xs">Menu Preferences</div>
                                      <div className="p-2 bg-gray-100 rounded border text-left text-xs">Delivery Address</div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* CTA Button with booking-specific styling */}
                                <button
                                  className="w-full font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                                  style={{
                                    backgroundColor: currentConfig.primaryColor,
                                    color: 'white',
                                    borderRadius: currentConfig.borderRadius / 2,
                                    padding: `${currentConfig.fontSize * 0.6}px ${currentConfig.fontSize * 1.2}px`,
                                    fontSize: currentConfig.fontSize,
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = currentConfig.secondaryColor;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = currentConfig.primaryColor;
                                  }}
                                >
                                  {currentConfig.buttonText}
                                </button>
                                
                                {/* Additional booking features */}
                                {currentConfig.enableTableOptimization && activeWidgetType === 'booking' && (
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <span>⚡</span>
                                    <span>Smart table optimization enabled</span>
                                  </div>
                                )}
                                
                                {currentConfig.requireDeposit && (
                                  <div className="text-xs text-orange-600 flex items-center gap-1">
                                    <span>💳</span>
                                    <span>Deposit required for booking</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Footer Section */}
                            {currentConfig.showFooter && currentConfig.footerText && (
                              <div className="text-center mt-auto">
                                <p 
                                  className="opacity-60"
                                  style={{ 
                                    fontSize: currentConfig.fontSize * 0.7,
                                    textAlign: currentConfig.alignment 
                                  }}
                                >
                                  {currentConfig.footerText}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Loading overlay for animations */}
                          {currentConfig.enableAnimations && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className={`w-full h-full ${ANIMATION_MAP[currentConfig.animationType]}`} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Device status bar for mobile */}
                      {previewDevice === 'mobile' && (
                        <div className="absolute top-0 left-0 right-0 h-6 bg-black rounded-t-2xl flex items-center justify-center">
                          <div className="w-12 h-1 bg-white rounded-full opacity-30"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Device home indicator for mobile */}
                    {previewDevice === 'mobile' && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-white rounded-full opacity-40"></div>
                    )}
                  </div>
                  
                  {/* Device labels */}
                  <div className="mt-4 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {previewDevice === 'desktop' && '🖥️ Desktop View (1200px+)'}
                      {previewDevice === 'tablet' && '📱 Tablet View (768px - 1024px)'}
                      {previewDevice === 'mobile' && '📱 Mobile View (320px - 767px)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Preview Controls */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-muted-foreground">Live Preview</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updates automatically as you configure
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Trigger a re-render animation on the widget preview
                      const widget = document.querySelector('[data-widget-preview]');
                      if (widget && widget instanceof HTMLElement) {
                        widget.style.transform = 'scale(0.98)';
                        widget.style.opacity = '0.8';
                        setTimeout(() => {
                          widget.style.transform = '';
                          widget.style.opacity = '';
                        }, 150);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Screenshot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Widget Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Performance metrics for your {activeWidgetType} widget
                {!analyticsAvailable && " (Real analytics data unavailable - connect tenant for live metrics)"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {analyticsError && (
                <Badge variant="destructive" className="text-xs">
                  Error loading data
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAnalytics}
                disabled={analyticsLoading}
              >
                {analyticsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Refresh
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalViews, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeWidgetType === 'booking' ? 'Total Bookings' : 'Total Orders'}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalBookings, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeWidgetType === 'booking' ? 'Avg Party Size' : 'Avg Order Value'}
                    </p>
                    <p className="text-2xl font-bold">
                      {activeWidgetType === 'booking' 
                        ? formatAnalyticsValue(analyticsData?.avgPartySize, analyticsFormatters.decimal)
                        : formatAnalyticsValue(analyticsData?.avgOrderValue, analyticsFormatters.currency)
                      }
                    </p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top sources */}
            <Card>
              <CardHeader>
                <CardTitle>Top Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topSources?.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{source.source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ 
                              width: analyticsData?.topSources?.[0] 
                                ? `${(source.count / analyticsData.topSources[0].count) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {formatAnalyticsValue(source.count, analyticsFormatters.count)}
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      {analyticsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading analytics...
                        </div>
                      ) : (
                        "No traffic source data available"
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance metrics */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeWidgetType === 'booking' ? 'Booking Performance' : 'Order Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeWidgetType === 'booking' && analyticsData?.peakHours && (
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Booking Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {analyticsData.peakHours.map((hour, index) => (
                          <Badge key={index} variant="secondary">{hour}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium text-green-600">
                        {formatAnalyticsValue(analyticsData?.conversionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Avg Session Duration</span>
                      <span className="font-medium">
                        {formatAnalyticsValue(analyticsData?.avgSessionDuration, analyticsFormatters.duration)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium text-blue-600">
                        {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Daily performance chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.dailyStats?.map((day, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-medium text-blue-600">
                        {formatAnalyticsValue(day.views, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {activeWidgetType === 'booking' ? 'Bookings' : 'Orders'}
                      </p>
                      <p className="font-medium text-green-600">
                        {formatAnalyticsValue(day.bookings, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium text-purple-600">
                        {formatAnalyticsValue(day.revenue, analyticsFormatters.currency)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Loading daily analytics...
                      </div>
                    ) : (
                      "No daily performance data available"
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="embed" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Deploy Your Widget</h3>
            <p className="text-sm text-muted-foreground">
              Copy and paste the embed code to integrate your {activeWidgetType} widget into your website
            </p>
          </div>

          {/* Generated embed code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Add this code to your website where you want the widget to appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border">
                    <code>{generateEmbedCode(activeWidgetType)}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generateEmbedCode(activeWidgetType), 'Embed code')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Enhanced Tenant-Specific Testing */}
                <div className="space-y-4">
                  {/* Primary Testing URL */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900">Tenant-Specific Testing URL</h4>
                      <Badge variant="outline" className="text-blue-700">
                        Tenant: {resolvedTenantSlug}
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Test your {activeWidgetType} widget with your specific tenant configuration:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white p-2 rounded border text-sm">
                          {generateWidgetUrl(activeWidgetType)}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateWidgetUrl(activeWidgetType), 'Widget URL')}
                          disabled={isLoading}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Test Now
                        </Button>
                      </div>
                      
                      {/* Testing Instructions */}
                      <div className="bg-blue-25 p-3 rounded border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">Testing Checklist:</p>
                        <ul className="text-xs text-blue-600 space-y-1">
                          <li>✓ Verify {activeWidgetType} flow works end-to-end</li>
                          <li>✓ Check responsive design on mobile/tablet</li>
                          <li>✓ Test all configured features and settings</li>
                          <li>✓ Confirm tenant branding and colors display correctly</li>
                          {activeWidgetType === 'booking' && (
                            <>
                              <li>✓ Test table selection and availability</li>
                              <li>✓ Verify special requests functionality</li>
                              {currentConfig.requireDeposit && <li>✓ Test deposit payment flow</li>}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Testing URLs */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Alternative Testing Options</h4>
                    <div className="space-y-3">
                      {/* Mobile Preview URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">Mobile Preview (forced mobile view):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&mobile=true&viewport=375x667
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&mobile=true&viewport=375x667', '_blank')}
                          >
                            <Smartphone className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Debug Mode URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">Debug Mode (with console logging):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&debug=true&console=verbose
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&debug=true&console=verbose', '_blank')}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Demo Data URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">With Demo Data (for testing purposes):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&demo=true&test_data=enabled
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&demo=true&test_data=enabled', '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code for Mobile Testing */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-purple-900 mb-1">Mobile Testing QR Code</h4>
                        <p className="text-sm text-purple-700">
                          Scan with your phone to test the widget on a real mobile device
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateWidgetUrl(activeWidgetType))}`;
                          window.open(qrUrl, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Generate QR
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={currentConfig.isEnabled}
                    onCheckedChange={(checked) => updateConfig({ isEnabled: checked })}
                  />
                  <Label>Widget enabled</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation guide and configuration summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Implementation guide */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Basic Implementation</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Simply paste the embed code into your HTML where you want the widget to appear.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">2. WordPress Integration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add the embed code to a Custom HTML block or use the Text widget in your theme.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">3. Shopify Integration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add the code to your theme's liquid files or use a Custom HTML section.
                    </p>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <div>
                      <h4 className="font-medium mb-2">4. Booking System Features</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• Real-time availability checking</p>
                        <p>• Table optimization and management</p>
                        <p>• Customer details collection</p>
                        <p>• Special requests handling</p>
                        {currentConfig.requireDeposit && <p>• Deposit payment processing</p>}
                        {currentConfig.enableSpecialRequests && <p>• Special requirements collection</p>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration summary */}
            <Card>
              <CardHeader>
                <CardTitle>Current Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Widget Type:</span>
                    <span className="capitalize">{activeWidgetType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Primary Color:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: currentConfig.primaryColor }}
                      />
                      <span>{currentConfig.primaryColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Theme:</span>
                    <span className="capitalize">{currentConfig.theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Size:</span>
                    <span className="capitalize">{currentConfig.size}</span>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium">Max Party Size:</span>
                        <span>{currentConfig.maxPartySize || 'No limit'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Table Optimization:</span>
                        <span>{currentConfig.enableTableOptimization ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Deposit Required:</span>
                        <span>{currentConfig.requireDeposit ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Special Requests:</span>
                        <span>{currentConfig.enableSpecialRequests ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Testing & Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tenant-Specific Testing & Validation
              </CardTitle>
              <CardDescription>
                Comprehensive testing guide for {tenant?.name || resolvedTenantSlug} ({activeWidgetType} widget)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Testing Steps */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Test Tenant-Specific Widget URL</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Verify your {activeWidgetType} widget loads correctly with tenant "{resolvedTenantSlug}" configuration
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Test Primary URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&mobile=true', '_blank')}
                        >
                          <Smartphone className="w-4 h-4 mr-1" />
                          Test Mobile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&debug=true', '_blank')}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Debug Mode
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Verify Tenant Branding & Configuration</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Confirm primary color ({currentConfig.primaryColor}) displays correctly</p>
                        <p>✓ Check welcome message: "{currentConfig.welcomeMessage}"</p>
                        <p>✓ Verify button text: "{currentConfig.buttonText}"</p>
                        <p>✓ Test theme: {currentConfig.theme} mode</p>
                        <p>✓ Validate dimensions: {currentConfig.width}x{currentConfig.height}px</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Test Responsive Design</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Desktop view (1200px+): Full widget display</p>
                        <p>✓ Tablet view (768-1024px): Optimized layout</p>
                        <p>✓ Mobile view (320-767px): Touch-friendly interface</p>
                        <p>✓ Test portrait and landscape orientations</p>
                      </div>
                    </div>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Complete Booking Flow Testing</p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>✓ Customer details form validation</p>
                          <p>✓ Date & time selection with availability</p>
                          <p>✓ Party size selection (max: {currentConfig.maxPartySize})</p>
                          {currentConfig.enableTableOptimization && <p>✓ Table optimization functionality</p>}
                          {currentConfig.enableSpecialRequests && <p>✓ Special requests field</p>}
                          {currentConfig.requireDeposit && <p>✓ Deposit payment processing</p>}
                          <p>✓ Booking confirmation and receipt</p>
                          <p>✓ Email notifications (if configured)</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      {activeWidgetType === 'booking' ? '5' : '4'}
                    </div>
                    <div>
                      <p className="font-medium">Performance & Analytics Validation</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Widget load time (should be &lt;3 seconds)</p>
                        <p>✓ Analytics tracking functionality</p>
                        <p>✓ Error handling and user feedback</p>
                        <p>✓ Cross-browser compatibility testing</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      {activeWidgetType === 'booking' ? '6' : '5'}
                    </div>
                    <div>
                      <p className="font-medium">Integration Testing</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Test embed code in staging environment</p>
                        <p>✓ Verify widget works within iframe</p>
                        <p>✓ Check for CSS conflicts with parent site</p>
                        <p>✓ Test with different content management systems</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Test Actions */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Quick Test Actions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const url = generateWidgetUrl(activeWidgetType);
                        copyToClipboard(url, 'Test URL');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy URL
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateWidgetUrl(activeWidgetType))}`;
                        window.open(qrUrl, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      QR Code
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const mailtoUrl = `mailto:?subject=Test ${activeWidgetType} Widget - ${resolvedTenantSlug}&body=Please test our ${activeWidgetType} widget at: ${generateWidgetUrl(activeWidgetType)}`;
                        window.location.href = mailtoUrl;
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email Link
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&screenshot=true', '_blank')}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Screenshot
                    </Button>
                  </div>
                </div>

                {/* Tenant-Specific Test Data */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tenant Test Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tenant ID:</span> {tenant?.id || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Tenant Slug:</span> {resolvedTenantSlug}
                    </div>
                    <div>
                      <span className="font-medium">Widget Type:</span> {activeWidgetType}
                    </div>
                    <div>
                      <span className="font-medium">Configuration Version:</span> 2.0
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deployment status */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium">Configuration</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium">
                    {activeWidgetType === 'booking' ? 'Booking Integration' : 'Testing'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeWidgetType === 'booking' ? 'Connected' : 'Passed'}
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-medium">Deployment</p>
                  <p className="text-sm text-muted-foreground">Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetManagement;

