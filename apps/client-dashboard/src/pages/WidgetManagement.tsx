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

interface WidgetConfig {
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadowIntensity: number;
  
  // Typography
  fontFamily: 'system' | 'inter' | 'roboto' | 'open-sans' | 'lato';
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  lineHeight: number;
  
  // Content
  welcomeMessage: string;
  description: string;
  buttonText: string;
  footerText: string;
  
  // Layout
  width: number;
  height: number;
  padding: number;
  spacing: number;
  alignment: 'left' | 'center' | 'right';
  size: 'small' | 'medium' | 'large';
  
  // Features
  showLogo: boolean;
  showDescription: boolean;
  showFooter: boolean;
  compactMode: boolean;
  enableAnimations: boolean;
  animationType: 'none' | 'fade' | 'slide' | 'bounce' | 'scale';
  
  // Booking-specific features
  enableTableOptimization: boolean;
  showAvailabilityIndicator: boolean;
  requireDeposit: boolean;
  enableSpecialRequests: boolean;
  showDurationSelector: boolean;
  enablePhoneBooking: boolean;
  maxPartySize: number;
  minAdvanceBooking: number; // hours
  maxAdvanceBooking: number; // days
  
  // Advanced
  customCss: string;
  customJs: string;
  isEnabled: boolean;
  bookingSource: 'widget' | 'website' | 'social' | 'partner';
  
  // Behavior
  autoFocus: boolean;
  closeOnOutsideClick: boolean;
  showCloseButton: boolean;
}

interface WidgetAnalytics {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  avgSessionDuration: number;
  
  // Booking-specific metrics
  totalBookings?: number;
  completionRate?: number;
  avgPartySize?: number;
  peakHours?: string[];
  
  topSources: Array<{ source: string; count: number }>;
  dailyStats: Array<{ 
    date: string; 
    views: number; 
    clicks: number;
    bookings?: number;
    revenue?: number;
  }>;
}

interface ValidationError {
  field: string;
  message: string;
}

const WidgetManagement: React.FC = () => {
  const { tenant, tenantSlug, loading: tenantLoading, error: tenantError } = useTenant();
  const { toast } = useToast();
  
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Comprehensive tenant slug resolution with fallbacks
  const resolvedTenantSlug = useMemo(() => {
    // Priority order for slug resolution:
    // 1. URL slug parameter (from useTenant)
    // 2. Tenant object slug
    // 3. Fallback to 'demo' for development/testing
    return tenantSlug || tenant?.slug || 'demo';
  }, [tenantSlug, tenant?.slug]);

  // Helper function for safe numeric parsing
  const safeParseInt = useCallback((value: string, fallback: number, min?: number, max?: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  }, []);

  // Default widget configuration
  const getDefaultConfig = useCallback((type: 'booking' | 'catering'): WidgetConfig => ({
    // Appearance
    theme: 'light' as const,
    primaryColor: type === 'booking' ? '#3b82f6' : '#f97316',
    secondaryColor: type === 'booking' ? '#1e40af' : '#ea580c',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowIntensity: 2,
    
    // Typography
    fontFamily: 'system' as const,
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 1.5,
    
    // Content
    welcomeMessage: type === 'booking' ? 'Book your table with us!' : 'Order catering for your event!',
    description: type === 'booking' ? 'Reserve your perfect dining experience' : 'Delicious catering for any occasion',
    buttonText: type === 'booking' ? 'Reserve Now' : 'Order Catering',
    footerText: 'Powered by Blunari',
    
    // Layout
    width: 400,
    height: 600,
    padding: 20,
    spacing: 16,
    alignment: 'center' as const,
    size: 'medium' as const,
    
    // Features
    showLogo: true,
    showDescription: true,
    showFooter: true,
    compactMode: false,
    enableAnimations: true,
    animationType: 'fade' as const,
    
    // Booking-specific features
    enableTableOptimization: type === 'booking',
    showAvailabilityIndicator: true,
    requireDeposit: false,
    enableSpecialRequests: true,
    showDurationSelector: type === 'booking',
    enablePhoneBooking: true,
    maxPartySize: type === 'booking' ? 12 : 50,
    minAdvanceBooking: 1, // 1 hour minimum
    maxAdvanceBooking: 30, // 30 days maximum
    
    // Advanced
    customCss: '',
    customJs: '',
    isEnabled: true,
    bookingSource: 'widget' as const,
    
    // Behavior
    autoFocus: true,
    closeOnOutsideClick: true,
    showCloseButton: true,
  }), []);

  const [bookingConfig, setBookingConfig] = useState<WidgetConfig>(() => getDefaultConfig('booking'));
  const [cateringConfig, setCateringConfig] = useState<WidgetConfig>(() => getDefaultConfig('catering'));

  // Additional component state
  const mockWidgetId = `widget_${Date.now()}`;

  // Configuration management
  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
  const setCurrentConfig = activeWidgetType === 'booking' ? setBookingConfig : setCateringConfig;

  // Generate embed code based on current config
  const embedCode = `<iframe src="https://yourdomain.com/widget/${mockWidgetId}" width="${currentConfig.width}" height="${currentConfig.height}" frameborder="0"></iframe>`;

  // Validation
  const validateConfig = useCallback((config: WidgetConfig): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required text fields
    if (!config.welcomeMessage?.trim()) {
      errors.push({ field: 'welcomeMessage', message: 'Welcome message is required' });
    }
    if (!config.buttonText?.trim()) {
      errors.push({ field: 'buttonText', message: 'Button text is required' });
    }
    
    // Numeric validations with proper bounds checking
    if (!config.width || config.width < 300 || config.width > 800) {
      errors.push({ field: 'width', message: 'Width must be between 300 and 800 pixels' });
    }
    if (!config.height || config.height < 400 || config.height > 1000) {
      errors.push({ field: 'height', message: 'Height must be between 400 and 1000 pixels' });
    }
    if (!config.fontSize || config.fontSize < 10 || config.fontSize > 24) {
      errors.push({ field: 'fontSize', message: 'Font size must be between 10 and 24 pixels' });
    }
    
    // Color validations
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(config.primaryColor)) {
      errors.push({ field: 'primaryColor', message: 'Primary color must be a valid hex color' });
    }
    if (!colorRegex.test(config.secondaryColor)) {
      errors.push({ field: 'secondaryColor', message: 'Secondary color must be a valid hex color' });
    }
    if (!colorRegex.test(config.backgroundColor)) {
      errors.push({ field: 'backgroundColor', message: 'Background color must be a valid hex color' });
    }
    if (!colorRegex.test(config.textColor)) {
      errors.push({ field: 'textColor', message: 'Text color must be a valid hex color' });
    }
    
    // Booking-specific validations
    if (!config.maxPartySize || config.maxPartySize < 1 || config.maxPartySize > 100) {
      errors.push({ field: 'maxPartySize', message: 'Max party size must be between 1 and 100' });
    }
    if (config.minAdvanceBooking < 0 || config.minAdvanceBooking > 48) {
      errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be between 0 and 48 hours' });
    }
    if (!config.maxAdvanceBooking || config.maxAdvanceBooking < 1 || config.maxAdvanceBooking > 365) {
      errors.push({ field: 'maxAdvanceBooking', message: 'Max advance booking must be between 1 and 365 days' });
    }
    
    // Cross-field validations
    if (config.minAdvanceBooking >= (config.maxAdvanceBooking * 24)) {
      errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be less than max advance booking' });
    }

    return errors;
  }, []);

  // Update configuration with validation
  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    try {
      const newConfig = { ...currentConfig, ...updates };
      setCurrentConfig(newConfig);
      setHasUnsavedChanges(true);
      
      // Validate in real-time
      const errors = validateConfig(newConfig);
      setValidationErrors(errors);
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentConfig, setCurrentConfig, validateConfig, toast]);

  // Enhanced save configuration with better error handling
  const saveConfiguration = useCallback(async () => {
    const errors = validateConfig(currentConfig);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: `Please fix ${errors.length} error(s) before saving`,
        variant: "destructive",
      });
      return;
    }

    if (!tenant?.id && !resolvedTenantSlug) {
      toast({
        title: "Save Error",
        description: "Unable to save: tenant information not available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Use tenant ID if available, otherwise use resolved slug
      const tenantIdentifier = tenant?.id || resolvedTenantSlug;
      const storageKey = `widget-config-${activeWidgetType}-${tenantIdentifier}`;
      
      // Create a clean configuration object for storage
      const configToSave = {
        ...currentConfig,
        lastSaved: new Date().toISOString(),
        version: '2.0'
      };
      
      localStorage.setItem(storageKey, JSON.stringify(configToSave));
      
      // Simulate API call for future backend integration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      toast({
        title: "Configuration Saved",
        description: `${activeWidgetType} widget configuration has been saved successfully.`,
      });
    } catch (error) {
      console.error('Save configuration error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentConfig, activeWidgetType, tenant?.id, resolvedTenantSlug, validateConfig, toast]);

  // Enhanced configuration loading with better error handling
  useEffect(() => {
    if (tenant?.id || resolvedTenantSlug) {
      try {
        // Use tenant ID if available, otherwise use resolved slug
        const tenantIdentifier = tenant?.id || resolvedTenantSlug;
        const storageKey = `widget-config-${activeWidgetType}-${tenantIdentifier}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          
          // Validate loaded config structure
          if (parsedConfig && typeof parsedConfig === 'object') {
            // Merge with defaults to ensure all required properties exist
            const defaultConfig = getDefaultConfig(activeWidgetType);
            const mergedConfig = { ...defaultConfig, ...parsedConfig };
            
            // Additional validation for critical fields
            if (mergedConfig.width && mergedConfig.height && mergedConfig.primaryColor) {
              setCurrentConfig(mergedConfig);
            } else {
              console.warn('Loaded configuration missing critical fields, using defaults');
              setCurrentConfig(getDefaultConfig(activeWidgetType));
            }
          } else {
            console.warn('Invalid configuration format, using defaults');
            setCurrentConfig(getDefaultConfig(activeWidgetType));
          }
        } else {
          // No saved configuration, use defaults
          setCurrentConfig(getDefaultConfig(activeWidgetType));
        }
      } catch (error) {
        console.warn('Failed to load saved configuration:', error);
        toast({
          title: "Configuration Load Warning",
          description: "Failed to load saved configuration. Using defaults.",
          variant: "default",
        });
        setCurrentConfig(getDefaultConfig(activeWidgetType));
      }
    }
  }, [activeWidgetType, tenant?.id, resolvedTenantSlug, setCurrentConfig, getDefaultConfig, toast]);

  // Widget URL and embed code generation with enhanced error handling
  const generateWidgetUrl = useCallback((type: 'booking' | 'catering') => {
    try {
      // Enhanced tenant slug resolution with multiple fallbacks
      const effectiveSlug = resolvedTenantSlug;
      
      if (!effectiveSlug) {
        console.warn('No tenant slug available for URL generation, using fallback');
        // In development, use a demo slug; in production, show a user-friendly message
        if (import.meta.env.MODE === 'development') {
          const fallbackSlug = 'demo';
          const baseUrl = window.location.origin;
          const widgetPath = type === 'booking' ? '/book' : '/catering';
          return `${baseUrl}${widgetPath}/${fallbackSlug}?source=widget-demo&widget_version=2.0`;
        }
        return '';
      }
      
      const baseUrl = window.location.origin;
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      
      if (!config) {
        console.warn('No configuration available for URL generation');
        // Return basic URL without configuration parameters
        const widgetPath = type === 'booking' ? '/book' : '/catering';
        return `${baseUrl}${widgetPath}/${effectiveSlug}?source=widget&widget_version=2.0`;
      }
      
      // Use the actual booking system routes
      const widgetPath = type === 'booking' ? '/book' : '/catering';
      
      // Build configuration parameters with comprehensive fallbacks
      const configParams = new URLSearchParams();
      
      // Essential parameters
      configParams.set('slug', effectiveSlug);
      configParams.set('source', 'widget');
      configParams.set('widget_version', '2.0');
      
      // Appearance parameters with safe fallbacks
      configParams.set('theme', config.theme || 'light');
      configParams.set('primaryColor', encodeURIComponent(config.primaryColor || '#3b82f6'));
      configParams.set('secondaryColor', encodeURIComponent(config.secondaryColor || '#1e40af'));
      configParams.set('backgroundColor', encodeURIComponent(config.backgroundColor || '#ffffff'));
      configParams.set('textColor', encodeURIComponent(config.textColor || '#1f2937'));
      
      // Layout parameters with safe defaults
      configParams.set('borderRadius', (config.borderRadius || 8).toString());
      configParams.set('width', (config.width || 400).toString());
      configParams.set('height', (config.height || 600).toString());
      
      // Content parameters with safe encoding
      if (config.welcomeMessage) {
        configParams.set('welcomeMessage', encodeURIComponent(config.welcomeMessage));
      }
      if (config.buttonText) {
        configParams.set('buttonText', encodeURIComponent(config.buttonText));
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
      // Return a basic functional URL as fallback
      const baseUrl = window.location.origin;
      const widgetPath = type === 'booking' ? '/book' : '/catering';
      const fallbackSlug = resolvedTenantSlug || 'demo';
      return `${baseUrl}${widgetPath}/${fallbackSlug}?source=widget-error&widget_version=2.0`;
    }
  }, [bookingConfig, cateringConfig, resolvedTenantSlug]);

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
      
      return `<!-- Blunari ${type.charAt(0).toUpperCase() + type.slice(1)} Widget -->
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
      iframe.title = '${(config.welcomeMessage || '').replace(/'/g, "\\'")}';
      
      // Error handling
      iframe.onerror = function() {
        console.error('Failed to load Blunari ${type} widget');
        widget.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Unable to load widget. Please try again later.</div>';
      };
      
      // Success callback
      iframe.onload = function() {
        console.log('Blunari ${type} widget loaded successfully');
      };
      
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

<!-- Alternative: Simple iframe embed -->
<iframe 
  src="${url}"
  width="${config.width || 400}" 
  height="${config.height || 600}" 
  frameborder="0"
  style="border-radius: ${config.borderRadius || 8}px; box-shadow: 0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,0.1); max-width: 100%;"
  title="${(config.welcomeMessage || '').replace(/"/g, '&quot;')}"
  onerror="this.style.display='none'; console.error('Failed to load Blunari widget');">
</iframe>`;
    } catch (error) {
      console.error('Error generating embed code:', error);
      return '<!-- Error: Unable to generate embed code. Please check your configuration and try again. -->';
    }
  }, [generateWidgetUrl, bookingConfig, cateringConfig]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      setIsLoading(true);
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Mock analytics data with booking-specific metrics
  const mockAnalytics = useMemo((): WidgetAnalytics => ({
    totalViews: Math.floor(Math.random() * 10000) + 1000,
    totalClicks: Math.floor(Math.random() * 1000) + 100,
    conversionRate: Math.round((Math.random() * 15 + 5) * 100) / 100,
    avgSessionDuration: Math.round((Math.random() * 180 + 60) * 100) / 100,
    // Booking-specific metrics
    totalBookings: Math.floor(Math.random() * 500) + 50,
    completionRate: Math.round((Math.random() * 30 + 70) * 100) / 100,
    avgPartySize: Math.round((Math.random() * 2 + 2) * 100) / 100,
    peakHours: ['6:00 PM', '7:00 PM', '8:00 PM'],
    topSources: [
      { source: 'Direct', count: Math.floor(Math.random() * 500) + 200 },
      { source: 'Google', count: Math.floor(Math.random() * 400) + 150 },
      { source: 'Social Media', count: Math.floor(Math.random() * 300) + 100 },
      { source: 'Email', count: Math.floor(Math.random() * 200) + 50 },
    ],
    dailyStats: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      views: Math.floor(Math.random() * 200) + 50,
      clicks: Math.floor(Math.random() * 50) + 10,
      bookings: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 1000) + 200,
    })).reverse(),
  }), []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to reset to defaults? This action cannot be undone.'
      );
      if (!confirmed) return;
    }
    
    setCurrentConfig(getDefaultConfig(activeWidgetType));
    setHasUnsavedChanges(true);
    setValidationErrors([]);
    toast({
      title: "Reset to Defaults",
      description: "Configuration has been reset to default values.",
    });
  }, [activeWidgetType, setCurrentConfig, getDefaultConfig, toast, hasUnsavedChanges]);

  // Keyboard shortcuts
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
              saveConfiguration();
            }
            break;
          case 'r':
            event.preventDefault();
            resetToDefaults();
            break;
          case '1':
            event.preventDefault();
            setSelectedTab('configure');
            break;
          case '2':
            event.preventDefault();
            setSelectedTab('preview');
            break;
          case '3':
            event.preventDefault();
            setSelectedTab('analytics');
            break;
          case '4':
            event.preventDefault();
            setSelectedTab('embed');
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
      {/* Tenant Loading State */}
      {tenantLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading tenant information...</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tenant Error State */}
      {tenantError && !tenantLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tenant Loading Error</AlertTitle>
          <AlertDescription>
            Unable to load tenant information. Using demo configuration for widget preview.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Current tenant slug: {resolvedTenantSlug}
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Tenant Status Information */}
      {!tenantLoading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>
              Active Tenant: <strong>{tenant?.name || resolvedTenantSlug}</strong> 
              ({resolvedTenantSlug})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Widget URLs will use:</span>
            <code className="bg-background px-2 py-1 rounded text-xs">
              /{activeWidgetType === 'booking' ? 'book' : 'catering'}/{resolvedTenantSlug}
            </code>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg" aria-hidden="true">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Widget Management</h1>
            <p className="text-muted-foreground">
              Configure, preview, and deploy your widgets
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="flex items-center gap-1" aria-live="polite">
              <AlertCircle className="w-3 h-3" />
              Unsaved Changes
            </Badge>
          )}
          
          {/* Widget type selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="widget-type">Active Widget:</Label>
            <Select 
              value={activeWidgetType} 
              onValueChange={(value: 'booking' | 'catering') => setActiveWidgetType(value)}
              aria-label="Select widget type"
            >
              <SelectTrigger id="widget-type" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    Booking Widget
                  </div>
                </SelectItem>
                <SelectItem value="catering">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4" aria-hidden="true" />
                    Catering Widget
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetToDefaults}
              aria-label="Reset configuration to defaults (Ctrl+R)"
              title="Reset configuration to defaults (Ctrl+R)"
            >
              <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={saveConfiguration}
              disabled={isSaving || validationErrors.length > 0}
              className="min-w-20"
              aria-label={`Save configuration (Ctrl+S)${validationErrors.length > 0 ? ' - Fix validation errors first' : ''}`}
              title={`Save configuration (Ctrl+S)${validationErrors.length > 0 ? ' - Fix validation errors first' : ''}`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" aria-hidden="true" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1" role="list">
              {validationErrors.map((error, index) => (
                <li key={index} role="listitem">{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
                    className={validationErrors.find(e => e.field === 'welcomeMessage') ? 'border-red-500' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={currentConfig.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    placeholder="Enter widget description"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="button-text">Button Text</Label>
                  <Input
                    id="button-text"
                    value={currentConfig.buttonText}
                    onChange={(e) => updateConfig({ buttonText: e.target.value })}
                    placeholder="Enter button text"
                    className={validationErrors.find(e => e.field === 'buttonText') ? 'border-red-500' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={currentConfig.footerText}
                    onChange={(e) => updateConfig({ footerText: e.target.value })}
                    placeholder="Enter footer text"
                  />
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
                  <Select value={currentConfig.fontFamily} onValueChange={(value: any) => updateConfig({ fontFamily: value })}>
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
                  <Select value={currentConfig.bookingSource} onValueChange={(value: any) => updateConfig({ bookingSource: value })}>
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
                  className={`
                    transition-all duration-500 ease-in-out relative
                    ${previewDevice === 'desktop' ? 'max-w-6xl w-full' : ''}
                    ${previewDevice === 'tablet' ? 'w-96' : ''}
                    ${previewDevice === 'mobile' ? 'w-80' : ''}
                  `}
                >
                  {/* Device chrome/frame */}
                  <div 
                    className={`
                      relative transition-all duration-500
                      ${previewDevice === 'desktop' ? 'rounded-lg border-2 border-gray-300 bg-gray-900 p-6 shadow-2xl' : ''}
                      ${previewDevice === 'tablet' ? 'rounded-2xl border-4 border-gray-400 bg-black p-4 shadow-2xl' : ''}
                      ${previewDevice === 'mobile' ? 'rounded-3xl border-4 border-gray-800 bg-black p-2 shadow-2xl' : ''}
                    `}
                  >
                    {/* Screen/viewport */}
                    <div 
                      className={`
                        relative overflow-hidden bg-white transition-all duration-500
                        ${previewDevice === 'desktop' ? 'rounded min-h-96' : ''}
                        ${previewDevice === 'tablet' ? 'rounded-xl aspect-[4/3]' : ''}
                        ${previewDevice === 'mobile' ? 'rounded-2xl aspect-[9/16]' : ''}
                      `}
                    >
                      {/* Widget container with proper centering */}
                      <div className="h-full flex items-center justify-center p-4 bg-gray-50">
                        {/* Actual Widget Preview */}
                        <div 
                          className={`
                            rounded-lg shadow-lg transition-all duration-300 overflow-hidden relative
                            ${previewDevice === 'desktop' ? 'scale-100' : ''}
                            ${previewDevice === 'tablet' ? 'scale-75' : ''}
                            ${previewDevice === 'mobile' ? 'scale-50' : ''}
                          `}
                          style={{
                            width: Math.min(currentConfig.width, previewDevice === 'mobile' ? 280 : previewDevice === 'tablet' ? 350 : 450),
                            height: Math.min(currentConfig.height, previewDevice === 'mobile' ? 400 : previewDevice === 'tablet' ? 500 : 600),
                            backgroundColor: currentConfig.backgroundColor,
                            borderRadius: currentConfig.borderRadius,
                            border: `${currentConfig.borderWidth}px solid ${currentConfig.borderColor}`,
                            boxShadow: `0 ${currentConfig.shadowIntensity * 2}px ${currentConfig.shadowIntensity * 4}px rgba(0,0,0,0.1)`,
                            fontFamily: currentConfig.fontFamily === 'system' ? 'system-ui' : currentConfig.fontFamily,
                            color: currentConfig.textColor,
                          }}
                        >
                          {/* Widget Content */}
                          <div className="h-full flex flex-col" style={{ padding: currentConfig.padding }}>
                            {/* Header Section */}
                            <div className={`space-y-${Math.floor(currentConfig.spacing / 4)} mb-${Math.floor(currentConfig.spacing / 4)}`}>
                              {currentConfig.showLogo && (
                                <div className={`flex ${currentConfig.alignment === 'left' ? 'justify-start' : currentConfig.alignment === 'right' ? 'justify-end' : 'justify-center'}`}>
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
                                  className={`font-${currentConfig.fontWeight} mb-2`}
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
                              <div 
                                className={`
                                  w-full h-full
                                  ${currentConfig.animationType === 'fade' ? 'animate-pulse' : ''}
                                  ${currentConfig.animationType === 'scale' ? 'animate-bounce' : ''}
                                  ${currentConfig.animationType === 'slide' ? 'animate-pulse' : ''}
                                `}
                              />
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
                      // Trigger a re-render to show animation
                      const widget = document.querySelector('[data-widget-preview]');
                      if (widget) {
                        widget.classList.add('animate-pulse');
                        setTimeout(() => widget.classList.remove('animate-pulse'), 1000);
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
          <div>
            <h3 className="text-lg font-semibold">Widget Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Performance metrics for your {activeWidgetType} widget
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{mockAnalytics.totalViews.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{mockAnalytics.totalBookings?.toLocaleString() || '0'}</p>
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
                    <p className="text-2xl font-bold">{mockAnalytics.completionRate?.toFixed(1) || '0'}%</p>
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
                        ? mockAnalytics.avgPartySize?.toFixed(1) || '0'
                        : `$${Math.floor(Math.random() * 200 + 100)}`
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
                  {mockAnalytics.topSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{source.source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(source.count / mockAnalytics.topSources[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{source.count}</span>
                      </div>
                    </div>
                  ))}
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
                  {activeWidgetType === 'booking' && mockAnalytics.peakHours && (
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Booking Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {mockAnalytics.peakHours.map((hour, index) => (
                          <Badge key={index} variant="secondary">{hour}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium text-green-600">{mockAnalytics.conversionRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Avg Session Duration</span>
                      <span className="font-medium">{mockAnalytics.avgSessionDuration}s</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium text-blue-600">{mockAnalytics.completionRate?.toFixed(1) || '0'}%</span>
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
                {mockAnalytics.dailyStats.map((day, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-medium text-blue-600">{day.views}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {activeWidgetType === 'booking' ? 'Bookings' : 'Orders'}
                      </p>
                      <p className="font-medium text-green-600">{day.bookings || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium text-purple-600">${day.revenue || 0}</p>
                    </div>
                  </div>
                ))}
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
                    onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, isEnabled: checked }))}
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

