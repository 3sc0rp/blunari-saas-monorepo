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
  
  // Features
  showLogo: boolean;
  showDescription: boolean;
  showFooter: boolean;
  compactMode: boolean;
  enableAnimations: boolean;
  animationType: 'none' | 'fade' | 'slide' | 'bounce' | 'scale';
  
  // Advanced
  customCss: string;
  customJs: string;
  isEnabled: boolean;
  
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
  topSources: Array<{ source: string; count: number }>;
  dailyStats: Array<{ date: string; views: number; clicks: number }>;
}

interface ValidationError {
  field: string;
  message: string;
}

const WidgetManagement: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

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
    
    // Features
    showLogo: true,
    showDescription: true,
    showFooter: true,
    compactMode: false,
    enableAnimations: true,
    animationType: 'fade' as const,
    
    // Advanced
    customCss: '',
    customJs: '',
    isEnabled: true,
    
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

    if (!config.welcomeMessage.trim()) {
      errors.push({ field: 'welcomeMessage', message: 'Welcome message is required' });
    }
    if (!config.buttonText.trim()) {
      errors.push({ field: 'buttonText', message: 'Button text is required' });
    }
    if (config.width < 300 || config.width > 800) {
      errors.push({ field: 'width', message: 'Width must be between 300 and 800 pixels' });
    }
    if (config.height < 400 || config.height > 1000) {
      errors.push({ field: 'height', message: 'Height must be between 400 and 1000 pixels' });
    }
    if (config.fontSize < 10 || config.fontSize > 24) {
      errors.push({ field: 'fontSize', message: 'Font size must be between 10 and 24 pixels' });
    }

    return errors;
  }, []);

  // Update configuration with validation
  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    const newConfig = { ...currentConfig, ...updates };
    setCurrentConfig(newConfig);
    setHasUnsavedChanges(true);
    
    // Validate in real-time
    const errors = validateConfig(newConfig);
    setValidationErrors(errors);
  }, [currentConfig, setCurrentConfig, validateConfig]);

  // Save configuration
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

    setIsSaving(true);
    try {
      // Save to localStorage
      const storageKey = `widget-config-${activeWidgetType}-${tenant?.id}`;
      localStorage.setItem(storageKey, JSON.stringify(currentConfig));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      toast({
        title: "Configuration Saved",
        description: `${activeWidgetType} widget configuration has been saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentConfig, activeWidgetType, tenant?.id, validateConfig, toast]);

  // Load configuration from localStorage
  useEffect(() => {
    if (tenant?.id) {
      const storageKey = `widget-config-${activeWidgetType}-${tenant.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved);
          setCurrentConfig(parsedConfig);
        } catch (error) {
          console.warn('Failed to load saved configuration:', error);
        }
      }
    }
  }, [activeWidgetType, tenant?.id, setCurrentConfig]);

  // Widget URL and embed code generation
  const generateWidgetUrl = useCallback((type: 'booking' | 'catering') => {
    const baseUrl = window.location.origin;
    const config = type === 'booking' ? bookingConfig : cateringConfig;
    const configParams = new URLSearchParams({
      tenant: tenant?.id || '',
      theme: config.theme,
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      borderRadius: config.borderRadius.toString(),
      welcomeMessage: config.welcomeMessage,
      buttonText: config.buttonText,
      showLogo: config.showLogo.toString(),
    });
    return `${baseUrl}/widget/${type}?${configParams.toString()}`;
  }, [bookingConfig, cateringConfig, tenant?.id]);

  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    const url = generateWidgetUrl(type);
    const config = type === 'booking' ? bookingConfig : cateringConfig;
    return `<iframe 
  src="${url}" 
  width="${config.width}" 
  height="${config.height}" 
  frameborder="0"
  style="border-radius: ${config.borderRadius}px; box-shadow: 0 ${config.shadowIntensity * 2}px ${config.shadowIntensity * 4}px rgba(0,0,0,0.1);"
  title="${config.welcomeMessage}">
</iframe>`;
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

  // Mock analytics data
  const mockAnalytics = useMemo((): WidgetAnalytics => ({
    totalViews: Math.floor(Math.random() * 10000) + 1000,
    totalClicks: Math.floor(Math.random() * 1000) + 100,
    conversionRate: Math.round((Math.random() * 15 + 5) * 100) / 100,
    avgSessionDuration: Math.round((Math.random() * 180 + 60) * 100) / 100,
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
    })).reverse(),
  }), []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setCurrentConfig(getDefaultConfig(activeWidgetType));
    setHasUnsavedChanges(true);
    setValidationErrors([]);
    toast({
      title: "Reset to Defaults",
      description: "Configuration has been reset to default values.",
    });
  }, [activeWidgetType, setCurrentConfig, getDefaultConfig, toast]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
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
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Unsaved Changes
            </Badge>
          )}
          
          {/* Widget type selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="widget-type">Active Widget:</Label>
            <Select value={activeWidgetType} onValueChange={(value: 'booking' | 'catering') => setActiveWidgetType(value)}>
              <SelectTrigger id="widget-type" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Booking Widget
                  </div>
                </SelectItem>
                <SelectItem value="catering">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Catering Widget
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={saveConfiguration}
              disabled={isSaving || validationErrors.length > 0}
              className="min-w-20"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
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
                      onChange={(e) => updateConfig({ width: parseInt(e.target.value) || 400 })}
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
                      onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 600 })}
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
                                {/* Interactive content placeholder */}
                                <div 
                                  className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg flex items-center justify-center transition-all duration-300 hover:from-gray-200 hover:to-gray-300"
                                  style={{ 
                                    height: currentConfig.fontSize * 4,
                                    borderRadius: currentConfig.borderRadius / 2 
                                  }}
                                >
                                  <span 
                                    className="text-gray-500 font-medium"
                                    style={{ fontSize: currentConfig.fontSize * 0.75 }}
                                  >
                                    {activeWidgetType === 'booking' ? '📅 Select Date & Time' : '🍽️ Browse Menu'}
                                  </span>
                                </div>
                                
                                {/* CTA Button with hover effect */}
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
                    <p className="text-sm text-muted-foreground">Total Clicks</p>
                    <p className="text-2xl font-bold">{mockAnalytics.totalClicks.toLocaleString()}</p>
                  </div>
                  <Copy className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{mockAnalytics.conversionRate}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Session</p>
                    <p className="text-2xl font-bold">{mockAnalytics.avgSessionDuration}s</p>
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
            
            {/* Daily stats */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockAnalytics.dailyStats.map((day, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-blue-600">{day.views} views</span>
                        <span className="text-green-600">{day.clicks} clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="embed" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Deploy Widget</h3>
            <p className="text-sm text-muted-foreground">
              Get your embed code and deployment instructions
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Embed code */}
            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>
                  Copy this code to your website where you want the widget to appear
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Textarea
                    value={embedCode}
                    readOnly
                    className="font-mono text-sm resize-none h-32"
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(embedCode);
                      // You could add a toast notification here
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={currentConfig.isEnabled}
                    onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <Label>Widget enabled</Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Deployment options */}
            <Card>
              <CardHeader>
                <CardTitle>Deployment Options</CardTitle>
                <CardDescription>
                  Choose how to integrate your widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">HTML/JavaScript</p>
                        <p className="text-sm text-muted-foreground">Direct embed in any website</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">WordPress Plugin</p>
                        <p className="text-sm text-muted-foreground">Easy installation for WordPress sites</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">React Component</p>
                        <p className="text-sm text-muted-foreground">For React applications</p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Docs
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Advanced Settings</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Widget ID</Label>
                      <Badge variant="secondary">{mockWidgetId}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>API Endpoint</Label>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        /api/widgets/{mockWidgetId}
                      </code>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Last Updated</Label>
                      <span className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
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
                  <p className="font-medium">Testing</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
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

