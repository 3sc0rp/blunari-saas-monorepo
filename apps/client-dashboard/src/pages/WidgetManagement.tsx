/**
 * Widget Management Page - Production Widget Configuration
 * Manage booking and catering widgets for the restaurant
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
// Use mock implementation for now until database is properly set up
import { useMockWidgetManagement as useWidgetManagement } from '@/hooks/useMockWidgetManagement';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  ChefHat,
  Settings2,
  Wifi,
  WifiOff,
  Activity,
  Save,
  Eye,
  ExternalLink,
  Copy,
  Palette,
  Type,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe,
  Smartphone,
  Monitor
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WidgetManagement: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  // Loading and error states
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Widget configuration states
  const [bookingConfig, setBookingConfig] = useState({
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Book your table with us!',
    buttonText: 'Reserve Now',
    showLogo: true,
    compactMode: false,
    theme: 'light' as 'light' | 'dark'
  });

  const [cateringConfig, setCateringConfig] = useState({
    primaryColor: '#f97316',
    backgroundColor: '#ffffff', 
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Order catering for your event!',
    buttonText: 'Order Catering',
    showLogo: true,
    compactMode: false,
    theme: 'light' as 'light' | 'dark'
  });

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
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    getWidgetByType,
    saveWidgetConfig,
    toggleWidgetActive,
    isOnline
  } = useWidgetManagement(hookOptions);

  // Load existing configurations with error handling
  useEffect(() => {
    const initializeConfigurations = async () => {
      try {
        setInitError(null);

        if (!tenant?.id) {
          setInitError('No tenant selected. Please select a tenant to manage widgets.');
          setIsInitializing(false);
          return;
        }

        // Wait for widgets to load
        if (loading) {
          setIsInitializing(true);
          return;
        }

        setIsInitializing(true);

        const bookingWidget = getWidgetByType('booking');
        const cateringWidget = getWidgetByType('catering');

        if (bookingWidget?.config) {
          setBookingConfig(prev => ({ 
            ...prev, 
            ...bookingWidget.config,
            // Ensure required fields have defaults
            welcomeMessage: bookingWidget.config.welcomeMessage || prev.welcomeMessage,
            buttonText: bookingWidget.config.buttonText || prev.buttonText,
            primaryColor: bookingWidget.config.primaryColor || prev.primaryColor,
            backgroundColor: bookingWidget.config.backgroundColor || prev.backgroundColor
          }));
        }
        
        if (cateringWidget?.config) {
          setCateringConfig(prev => ({ 
            ...prev, 
            ...cateringWidget.config,
            // Ensure required fields have defaults
            welcomeMessage: cateringWidget.config.welcomeMessage || prev.welcomeMessage,
            buttonText: cateringWidget.config.buttonText || prev.buttonText,
            primaryColor: cateringWidget.config.primaryColor || prev.primaryColor,
            backgroundColor: cateringWidget.config.backgroundColor || prev.backgroundColor
          }));
        }

        setIsInitializing(false);

      } catch (err) {
        console.error('Failed to initialize widget configurations:', err);
        setInitError('Failed to load widget configurations. Please refresh the page.');
        setIsInitializing(false);
      }
    };

    initializeConfigurations();
  }, [widgets, getWidgetByType, loading, tenant?.id]);

  // Handle connection errors
  useEffect(() => {
    if (error && !initError) {
      setInitError(`Connection error: ${error}`);
    }
  }, [error, initError]);

  const bookingWidget = getWidgetByType('booking');
  const cateringWidget = getWidgetByType('catering');

  // Save handlers with validation
  const handleSaveBooking = useCallback(async () => {
    try {
      // Validate configuration
      const validationError = validateConfig(bookingConfig);
      if (validationError) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      const result = await saveWidgetConfig('booking', bookingConfig);
      
      if (result.success) {
        toast({
          title: "Booking Widget Saved",
          description: "Your booking widget configuration has been updated successfully.",
          variant: "default"
        });
      } else {
        throw new Error(result.error || 'Failed to save booking widget configuration');
      }
    } catch (err) {
      console.error('Error saving booking widget:', err);
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : 'Failed to save booking widget configuration',
        variant: "destructive"
      });
    }
  }, [bookingConfig, saveWidgetConfig, validateConfig, toast]);

  const handleSaveCatering = useCallback(async () => {
    try {
      // Validate configuration
      const validationError = validateConfig(cateringConfig);
      if (validationError) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      const result = await saveWidgetConfig('catering', cateringConfig);
      
      if (result.success) {
        toast({
          title: "Catering Widget Saved",
          description: "Your catering widget configuration has been updated successfully.",
          variant: "default"
        });
      } else {
        throw new Error(result.error || 'Failed to save catering widget configuration');
      }
    } catch (err) {
      console.error('Error saving catering widget:', err);
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : 'Failed to save catering widget configuration',
        variant: "destructive"
      });
    }
  }, [cateringConfig, saveWidgetConfig, validateConfig, toast]);

  // Toggle widget active status with error handling
  const handleToggleWidget = useCallback(async (type: 'booking' | 'catering') => {
    try {
      const result = await toggleWidgetActive(type);
      
      if (result.success) {
        // Get the updated widget status from the current state
        const updatedWidget = getWidgetByType(type);
        const isNowActive = result.data?.is_active ?? updatedWidget?.is_active ?? false;
        
        toast({
          title: "Widget Status Updated",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} widget has been ${isNowActive ? 'activated' : 'deactivated'}.`,
          variant: "default"
        });
      } else {
        throw new Error(result.error || `Failed to toggle ${type} widget status`);
      }
    } catch (err) {
      console.error(`Error toggling ${type} widget:`, err);
      toast({
        title: "Toggle Failed",
        description: err instanceof Error ? err.message : `Failed to toggle ${type} widget status`,
        variant: "destructive"
      });
    }
  }, [toggleWidgetActive, getWidgetByType, toast]);

  // Generate embed codes with better error handling
  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    if (!tenant?.id) {
      return '<!-- Please select a tenant to generate embed code -->';
    }
    
    const baseUrl = window.location.origin;
    return `<iframe 
  src="${baseUrl}/widget/${type}/${tenant.id}" 
  width="400" 
  height="600" 
  frameborder="0"
  title="${type.charAt(0).toUpperCase() + type.slice(1)} Widget"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  allowtransparency="true">
</iframe>`;
  }, [tenant?.id]);

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
                {isInitializing ? 'Initializing configurations...' : 'Loading widget data...'}
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
          <AlertTitle>Initialization Error</AlertTitle>
          <AlertDescription className="mt-2">
            {initError}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Management</h1>
          <p className="text-muted-foreground">
            Configure and manage your booking and catering widgets
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <Badge variant={connected && isOnline ? "default" : "destructive"}>
            {connected && isOnline ? (
              <Wifi className="w-3 h-3 mr-1" />
            ) : (
              <WifiOff className="w-3 h-3 mr-1" />
            )}
            {connected && isOnline ? "Connected" : "Disconnected"}
          </Badge>
          
          {/* Save Status */}
          {hasUnsavedChanges && (
            <Badge variant="secondary">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          {lastSaved && (
            <Badge variant="outline">
              <CheckCircle className="w-3 h-3 mr-1" />
              Saved {lastSaved.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="booking" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="booking" className="text-xs sm:text-sm">
            <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Booking Widget</span>
            <span className="sm:hidden">Booking</span>
          </TabsTrigger>
          <TabsTrigger value="catering" className="text-xs sm:text-sm">
            <ChefHat className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Catering Widget</span>
            <span className="sm:hidden">Catering</span>
          </TabsTrigger>
          <TabsTrigger value="embed" className="text-xs sm:text-sm">
            <Globe className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Embed Codes</span>
            <span className="sm:hidden">Embed</span>
          </TabsTrigger>
        </TabsList>

        {/* Booking Widget Tab */}
        <TabsContent value="booking" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Booking Widget Configuration
                </CardTitle>
                <CardDescription>
                  Customize the appearance and behavior of your booking widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-2">
                  <Label htmlFor="booking-theme">Theme</Label>
                  <Select
                    value={bookingConfig.theme}
                    onValueChange={(value: 'light' | 'dark') => 
                      setBookingConfig(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger id="booking-theme" aria-label="Select booking widget theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking-primary">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="booking-primary"
                        type="color"
                        value={bookingConfig.primaryColor}
                        onChange={(e) => setBookingConfig(prev => ({ 
                          ...prev, 
                          primaryColor: e.target.value 
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={bookingConfig.primaryColor}
                        onChange={(e) => setBookingConfig(prev => ({ 
                          ...prev, 
                          primaryColor: e.target.value 
                        }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="booking-bg">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="booking-bg"
                        type="color"
                        value={bookingConfig.backgroundColor}
                        onChange={(e) => setBookingConfig(prev => ({ 
                          ...prev, 
                          backgroundColor: e.target.value 
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={bookingConfig.backgroundColor}
                        onChange={(e) => setBookingConfig(prev => ({ 
                          ...prev, 
                          backgroundColor: e.target.value 
                        }))}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking-welcome">Welcome Message</Label>
                    <Textarea
                      id="booking-welcome"
                      value={bookingConfig.welcomeMessage}
                      onChange={(e) => setBookingConfig(prev => ({ 
                        ...prev, 
                        welcomeMessage: e.target.value 
                      }))}
                      placeholder="Book your table with us!"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="booking-button">Button Text</Label>
                    <Input
                      id="booking-button"
                      value={bookingConfig.buttonText}
                      onChange={(e) => setBookingConfig(prev => ({ 
                        ...prev, 
                        buttonText: e.target.value 
                      }))}
                      placeholder="Reserve Now"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="booking-logo"
                      checked={bookingConfig.showLogo}
                      onCheckedChange={(checked) => setBookingConfig(prev => ({ 
                        ...prev, 
                        showLogo: checked 
                      }))}
                    />
                    <Label htmlFor="booking-logo">Show Restaurant Logo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="booking-compact"
                      checked={bookingConfig.compactMode}
                      onCheckedChange={(checked) => setBookingConfig(prev => ({ 
                        ...prev, 
                        compactMode: checked 
                      }))}
                    />
                    <Label htmlFor="booking-compact">Compact Mode</Label>
                  </div>
                </div>

                <Separator />

                {/* Widget Status & Actions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Widget Status</Label>
                    <Badge variant={bookingWidget?.is_active ? "default" : "secondary"}>
                      {bookingWidget?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveBooking}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Save className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Configuration
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleToggleWidget('booking')}
                      disabled={isSaving}
                    >
                      {bookingWidget?.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  See how your booking widget will appear to customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4" style={{
                  backgroundColor: bookingConfig.backgroundColor,
                  color: bookingConfig.textColor
                }}>
                  <div className="space-y-4">
                    {bookingConfig.showLogo && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                          Logo
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">
                        {bookingConfig.welcomeMessage}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Date" />
                        <Input placeholder="Time" />
                      </div>
                      <Input placeholder="Party Size" />
                      <Input placeholder="Name" />
                      <Input placeholder="Phone" />
                    </div>
                    
                    <Button
                      style={{ backgroundColor: bookingConfig.primaryColor }}
                      className="w-full"
                    >
                      {bookingConfig.buttonText}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Catering Widget Tab */}
        <TabsContent value="catering" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-500" />
                  Catering Widget Configuration
                </CardTitle>
                <CardDescription>
                  Customize the appearance and behavior of your catering widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Similar configuration options as booking widget */}
                <div className="space-y-2">
                  <Label htmlFor="catering-theme">Theme</Label>
                  <Select
                    value={cateringConfig.theme}
                    onValueChange={(value: 'light' | 'dark') => 
                      setCateringConfig(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger id="catering-theme" aria-label="Select catering widget theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="catering-primary">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="catering-primary"
                        type="color"
                        value={cateringConfig.primaryColor}
                        onChange={(e) => setCateringConfig(prev => ({ 
                          ...prev, 
                          primaryColor: e.target.value 
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={cateringConfig.primaryColor}
                        onChange={(e) => setCateringConfig(prev => ({ 
                          ...prev, 
                          primaryColor: e.target.value 
                        }))}
                        placeholder="#f97316"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="catering-bg">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="catering-bg"
                        type="color"
                        value={cateringConfig.backgroundColor}
                        onChange={(e) => setCateringConfig(prev => ({ 
                          ...prev, 
                          backgroundColor: e.target.value 
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={cateringConfig.backgroundColor}
                        onChange={(e) => setCateringConfig(prev => ({ 
                          ...prev, 
                          backgroundColor: e.target.value 
                        }))}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="catering-welcome">Welcome Message</Label>
                    <Textarea
                      id="catering-welcome"
                      value={cateringConfig.welcomeMessage}
                      onChange={(e) => setCateringConfig(prev => ({ 
                        ...prev, 
                        welcomeMessage: e.target.value 
                      }))}
                      placeholder="Order catering for your event!"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="catering-button">Button Text</Label>
                    <Input
                      id="catering-button"
                      value={cateringConfig.buttonText}
                      onChange={(e) => setCateringConfig(prev => ({ 
                        ...prev, 
                        buttonText: e.target.value 
                      }))}
                      placeholder="Order Catering"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="catering-logo"
                      checked={cateringConfig.showLogo}
                      onCheckedChange={(checked) => setCateringConfig(prev => ({ 
                        ...prev, 
                        showLogo: checked 
                      }))}
                    />
                    <Label htmlFor="catering-logo">Show Restaurant Logo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="catering-compact"
                      checked={cateringConfig.compactMode}
                      onCheckedChange={(checked) => setCateringConfig(prev => ({ 
                        ...prev, 
                        compactMode: checked 
                      }))}
                    />
                    <Label htmlFor="catering-compact">Compact Mode</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Widget Status</Label>
                    <Badge variant={cateringWidget?.is_active ? "default" : "secondary"}>
                      {cateringWidget?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveCatering}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Save className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Configuration
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleToggleWidget('catering')}
                      disabled={isSaving}
                    >
                      {cateringWidget?.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  See how your catering widget will appear to customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4" style={{
                  backgroundColor: cateringConfig.backgroundColor,
                  color: cateringConfig.textColor
                }}>
                  <div className="space-y-4">
                    {cateringConfig.showLogo && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                          Logo
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">
                        {cateringConfig.welcomeMessage}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <Input placeholder="Event Date" />
                      <Input placeholder="Number of Guests" />
                      <Input placeholder="Event Type" />
                      <Input placeholder="Contact Name" />
                      <Input placeholder="Phone Number" />
                    </div>
                    
                    <Button
                      style={{ backgroundColor: cateringConfig.primaryColor }}
                      className="w-full"
                    >
                      {cateringConfig.buttonText}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Embed Codes Tab */}
        <TabsContent value="embed" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Booking Widget Embed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Booking Widget Embed
                </CardTitle>
                <CardDescription>
                  Copy this code to embed the booking widget on your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="relative">
                    <Textarea
                      value={generateEmbedCode('booking')}
                      readOnly
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyEmbedCode('booking')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={bookingWidget?.is_active ? "default" : "secondary"}>
                    {bookingWidget?.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {bookingWidget?.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/widget/booking/${tenant?.id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Test Widget
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Catering Widget Embed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-500" />
                  Catering Widget Embed
                </CardTitle>
                <CardDescription>
                  Copy this code to embed the catering widget on your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="relative">
                    <Textarea
                      value={generateEmbedCode('catering')}
                      readOnly
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyEmbedCode('catering')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={cateringWidget?.is_active ? "default" : "secondary"}>
                    {cateringWidget?.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {cateringWidget?.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/widget/catering/${tenant?.id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Test Widget
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Integration Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Monitor className="h-4 w-4" />
                <AlertTitle>Website Integration</AlertTitle>
                <AlertDescription>
                  Copy the embed code above and paste it into your website's HTML where you want the widget to appear.
                  The widget is responsive and will adapt to mobile devices automatically.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertTitle>Mobile Optimization</AlertTitle>
                <AlertDescription>
                  The widgets are optimized for mobile devices and will automatically adjust their layout.
                  Enable "Compact Mode" for better mobile experience in tight spaces.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetManagement;
