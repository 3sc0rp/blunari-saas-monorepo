/**
 * Booking Widget Configuration Component
 * Comprehensive widget settings for booking management
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useWidgetConfig } from '@/widgets/management/useWidgetConfig';
import { CopyButton } from '@/components/ui/CopyButton';
import {
  Settings,
  Palette,
  Type,
  Layout,
  Eye,
  Code,
  Copy,
  Save,
  RotateCcw,
  CheckCircle,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Calendar,
  Loader2,
} from 'lucide-react';
import type { WidgetFontFamily, BookingSource } from '@/widgets/management/types';

interface BookingWidgetConfigurationProps {
  tenantId?: string;
  tenantSlug?: string;
}

export default function BookingWidgetConfiguration({ tenantId, tenantSlug }: BookingWidgetConfigurationProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'appearance' | 'content' | 'features' | 'embed'>('appearance');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeLoading, setIframeLoading] = useState(true);
  
  // Stable iframe key to prevent unnecessary remounts (matches WidgetManagement)
  const iframeKeyRef = useRef<string>('');

  const {
    bookingConfig,
    hasUnsavedChanges,
    validationErrors,
    updateConfig,
    saveConfiguration,
    resetToDefaults,
    saving,
  } = useWidgetConfig('booking', tenantId, tenantSlug);

  const handleSave = useCallback(async () => {
    try {
      await saveConfiguration();
      toast({ title: 'Success', description: 'Widget configuration saved successfully' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to save configuration', 
        variant: 'destructive' 
      });
    }
  }, [saveConfiguration, toast]);

  const handleReset = useCallback(() => {
    resetToDefaults();
    toast({ title: 'Reset', description: 'Configuration reset to defaults' });
  }, [resetToDefaults, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && validationErrors.length === 0) {
          handleSave();
        }
      }
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
      // Tab numbers to switch sections (1-4)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') setActiveSection('appearance');
        else if (e.key === '2') setActiveSection('content');
        else if (e.key === '3') setActiveSection('features');
        else if (e.key === '4') setActiveSection('embed');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, validationErrors, handleSave, handleReset]);

  // Generate widget URL with stable key tracking (matches WidgetManagement approach)
  const widgetUrl = useMemo(() => {
    if (!tenantSlug) return null;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/public-widget/book/${tenantSlug}`;
    
    // Update stable key only when slug changes (prevents unnecessary iframe reloads)
    const nextKey = `${tenantSlug}:booking`;
    if (iframeKeyRef.current !== nextKey) {
      iframeKeyRef.current = nextKey;
    }
    
    return url;
  }, [tenantSlug]);

  // Generate embed code with secure sandbox attributes
  // NOTE: allow-same-origin is REQUIRED for Stripe integration (CORS requests to js.stripe.com)
  // Without it, iframe runs in 'null' origin context and Stripe fails with CORS errors
  const embedCode = useMemo(() => {
    if (!widgetUrl) return '';
    
    // Use production URL if available, otherwise use current origin
    const productionUrl = import.meta.env.VITE_PRODUCTION_URL;
    const embedUrl = productionUrl 
      ? `${productionUrl}/public-widget/book/${tenantSlug}`
      : widgetUrl;
    
    return `<!-- Blunari Booking Widget -->
<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="Booking Widget"
  loading="lazy"
  sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="payment; geolocation"
></iframe>`;
  }, [widgetUrl, tenantSlug]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Booking Widget Configuration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your booking widget appearance and behavior
          </p>
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border">Ctrl+S</kbd>
              Save
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border">Ctrl+R</kbd>
              Reset
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border">1-4</kbd>
              Switch tabs
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
            title="Reset to defaults (Ctrl+R)"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || validationErrors.length > 0}
            title="Save changes (Ctrl+S)"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Configuration */}
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        {/* Appearance Section */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Colors</CardTitle>
                <CardDescription>Customize your widget colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={bookingConfig.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={bookingConfig.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={bookingConfig.backgroundColor}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={bookingConfig.backgroundColor}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={bookingConfig.textColor}
                      onChange={(e) => updateConfig({ textColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={bookingConfig.textColor}
                      onChange={(e) => updateConfig({ textColor: e.target.value })}
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography & Layout</CardTitle>
                <CardDescription>Adjust fonts and spacing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={bookingConfig.fontFamily}
                    onValueChange={(value: WidgetFontFamily) => updateConfig({ fontFamily: value })}
                  >
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
                  <Label>Border Radius ({bookingConfig.borderRadius}px)</Label>
                  <Slider
                    value={[bookingConfig.borderRadius]}
                    onValueChange={([value]) => updateConfig({ borderRadius: value })}
                    min={0}
                    max={24}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Spacing ({bookingConfig.spacing}x)</Label>
                  <Slider
                    value={[bookingConfig.spacing]}
                    onValueChange={([value]) => updateConfig({ spacing: value })}
                    min={0}
                    max={3}
                    step={0.25}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Section */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Content</CardTitle>
              <CardDescription>Customize text and messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Input
                  id="welcomeMessage"
                  value={bookingConfig.welcomeMessage}
                  onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                  placeholder="Book your table with us!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={bookingConfig.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="Reserve your perfect dining experience"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={bookingConfig.buttonText}
                  onChange={(e) => updateConfig({ buttonText: e.target.value })}
                  placeholder="Reserve Now"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Input
                  id="footerText"
                  value={bookingConfig.footerText}
                  onChange={(e) => updateConfig({ footerText: e.target.value })}
                  placeholder="Powered by Blunari"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Section */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Options</CardTitle>
                <CardDescription>Control what's shown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLogo">Show Logo</Label>
                  <Switch
                    id="showLogo"
                    checked={bookingConfig.showLogo}
                    onCheckedChange={(checked) => updateConfig({ showLogo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showDescription">Show Description</Label>
                  <Switch
                    id="showDescription"
                    checked={bookingConfig.showDescription}
                    onCheckedChange={(checked) => updateConfig({ showDescription: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showFooter">Show Footer</Label>
                  <Switch
                    id="showFooter"
                    checked={bookingConfig.showFooter}
                    onCheckedChange={(checked) => updateConfig({ showFooter: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="compactMode">Compact Mode</Label>
                  <Switch
                    id="compactMode"
                    checked={bookingConfig.compactMode}
                    onCheckedChange={(checked) => updateConfig({ compactMode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enableAnimations">Enable Animations</Label>
                  <Switch
                    id="enableAnimations"
                    checked={bookingConfig.enableAnimations}
                    onCheckedChange={(checked) => updateConfig({ enableAnimations: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Features</CardTitle>
                <CardDescription>Advanced booking options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tableOptimization">Smart Table Optimization</Label>
                  <Switch
                    id="tableOptimization"
                    checked={bookingConfig.enableTableOptimization}
                    onCheckedChange={(checked) => updateConfig({ enableTableOptimization: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="availabilityIndicator">Show Availability</Label>
                  <Switch
                    id="availabilityIndicator"
                    checked={bookingConfig.showAvailabilityIndicator}
                    onCheckedChange={(checked) => updateConfig({ showAvailabilityIndicator: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="requireDeposit">Require Deposit</Label>
                  <Switch
                    id="requireDeposit"
                    checked={bookingConfig.requireDeposit}
                    onCheckedChange={(checked) => updateConfig({ requireDeposit: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="specialRequests">Enable Special Requests</Label>
                  <Switch
                    id="specialRequests"
                    checked={bookingConfig.enableSpecialRequests}
                    onCheckedChange={(checked) => updateConfig({ enableSpecialRequests: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="phoneBooking">Enable Phone Booking</Label>
                  <Switch
                    id="phoneBooking"
                    checked={bookingConfig.enablePhoneBooking}
                    onCheckedChange={(checked) => updateConfig({ enablePhoneBooking: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Limits</CardTitle>
                <CardDescription>Set constraints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPartySize">Max Party Size</Label>
                  <Input
                    id="maxPartySize"
                    type="number"
                    value={bookingConfig.maxPartySize}
                    onChange={(e) => updateConfig({ maxPartySize: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAdvanceBooking">Min Advance (hours)</Label>
                  <Input
                    id="minAdvanceBooking"
                    type="number"
                    value={bookingConfig.minAdvanceBooking}
                    onChange={(e) => updateConfig({ minAdvanceBooking: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="48"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAdvanceBooking">Max Advance (days)</Label>
                  <Input
                    id="maxAdvanceBooking"
                    type="number"
                    value={bookingConfig.maxAdvanceBooking}
                    onChange={(e) => updateConfig({ maxAdvanceBooking: parseInt(e.target.value) || 30 })}
                    min="1"
                    max="365"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Booking Source</Label>
                  <Select
                    value={bookingConfig.bookingSource}
                    onValueChange={(value: BookingSource) => updateConfig({ bookingSource: value })}
                  >
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

        {/* Embed Section */}
        <TabsContent value="embed" className="space-y-6">
          {/* Quick Integration Guide */}
          {!widgetUrl && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Setup Required</div>
                <p className="text-sm">
                  Your tenant slug is required to generate the booking widget.
                  Please ensure your tenant is properly configured before embedding the widget.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {widgetUrl && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-600" />
                  Quick Integration Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Copy the embed code below</li>
                  <li>Paste it into your website's HTML where you want the booking widget to appear</li>
                  <li>The widget will automatically adapt to your configured appearance settings</li>
                  <li>Test the widget on your site to ensure proper functionality</li>
                </ol>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Widget URL</CardTitle>
                <CardDescription>Direct link to your booking widget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {widgetUrl ? (
                  <>
                    <div className="p-3 bg-muted rounded-md font-mono text-sm break-all group relative">
                      {widgetUrl}
                    </div>
                    <div className="flex gap-2">
                      <CopyButton
                        value={widgetUrl}
                        label="URL"
                        showToast={true}
                      />
                      <Button
                        variant="outline"
                        onClick={() => window.open(widgetUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Preview
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <p><strong>Use case:</strong> Share this URL directly with customers or use it for testing</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Code className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Configure your tenant to generate widget URL
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>Add this iframe to your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {embedCode ? (
                  <>
                    <Textarea
                      value={embedCode}
                      readOnly
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <CopyButton
                      value={embedCode}
                      label="Embed Code"
                      showToast={true}
                    />
                    <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                      <p><strong>Features included:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Responsive design (auto-adjusts to container width)</li>
                        <li>Secure sandbox with Stripe payment support</li>
                        <li>Lazy loading for better performance</li>
                        <li>CORS protection with strict referrer policy</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Code className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Configure your tenant to generate embed code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>Preview your widget across devices</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('tablet')}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {widgetUrl ? (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <div
                    className="bg-white rounded-lg shadow-lg overflow-hidden relative"
                    style={{
                      width: previewDevice === 'desktop' ? '800px' : previewDevice === 'tablet' ? '600px' : '375px',
                      height: '600px',
                      maxWidth: '100%',
                    }}
                  >
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                          <p className="text-sm text-muted-foreground">Loading preview...</p>
                        </div>
                      </div>
                    )}
                    <iframe
                      key={iframeKeyRef.current}
                      title="Booking Widget Preview"
                      src={widgetUrl || undefined}
                      className="w-full h-full border-0"
                      onLoad={handleIframeLoad}
                      sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="payment; geolocation"
                      style={{
                        display: 'block',
                        background: '#fff',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Preview unavailable - tenant slug required</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
