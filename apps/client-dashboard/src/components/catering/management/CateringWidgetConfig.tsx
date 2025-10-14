import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Code,
  Copy,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Palette,
  Settings,
  Save,
} from 'lucide-react';
import { createWidgetToken } from '@/widgets/management/tokenUtils';
import { copyText } from '@/utils/clipboard';

interface CateringWidgetConfigProps {
  tenantId: string;
  tenantSlug: string;
}

interface WidgetConfig {
  // Branding
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  
  // Layout
  borderRadius: number;
  compactMode: boolean;
  showImages: boolean;
  
  // Features
  allowGuestCountCustomization: boolean;
  showDietaryFilters: boolean;
  requirePhone: boolean;
  requireVenue: boolean;
  
  // Content
  welcomeMessage: string;
  successMessage: string;
  minAdvanceNoticeDays: number;
  
  // Widget Settings
  active: boolean;
}

export function CateringWidgetConfig({ tenantId, tenantSlug }: CateringWidgetConfigProps) {
  const [config, setConfig] = useState<WidgetConfig>({
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter',
    borderRadius: 8,
    compactMode: false,
    showImages: true,
    allowGuestCountCustomization: true,
    showDietaryFilters: true,
    requirePhone: false,
    requireVenue: true,
    welcomeMessage: 'Explore Our Catering Packages',
    successMessage: "Thank you! We'll contact you soon with a quote.",
    minAdvanceNoticeDays: 3,
    active: true,
  });

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [widgetToken, setWidgetToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Disable preview by default

  // Generate widget token once on mount
  useEffect(() => {
    let mounted = true;
    
    const generateToken = async () => {
      if (!tenantSlug) return;
      
      try {
        const token = await createWidgetToken(tenantSlug, '2.0', 'catering');
        if (mounted) {
          setWidgetToken(token);
        }
      } catch (error) {
        console.error('Failed to generate widget token:', error);
        if (mounted) {
          setWidgetToken(''); // Set empty to avoid infinite retries
        }
      }
    };
    
    generateToken();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty deps - only run once on mount

  // Generate widget URL
      const widgetUrl = widgetToken 
    ? `${window.location.origin}/public-widget/catering/${tenantSlug}?token=${encodeURIComponent(widgetToken)}`
    : '';

  // Generate embed code with security sandbox
      const embedCode = `<!-- Blunari Catering Widget -->
<iframe
  src="${widgetUrl}"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="Catering Booking Widget"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>`;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save configuration to database
      const { error } = await supabase
        .from('catering_widget_configs' as any)
        .upsert({
          tenant_id: tenantId,
          primary_color: config.primaryColor,
          secondary_color: config.secondaryColor,
          background_color: config.backgroundColor,
          text_color: config.textColor,
          font_family: config.fontFamily,
          border_radius: config.borderRadius,
          compact_mode: config.compactMode,
          show_images: config.showImages,
          allow_guest_count_customization: config.allowGuestCountCustomization,
          show_dietary_filters: config.showDietaryFilters,
          require_phone: config.requirePhone,
          require_venue: config.requireVenue,
          welcome_message: config.welcomeMessage,
          success_message: config.successMessage,
          min_advance_notice_days: config.minAdvanceNoticeDays,
          active: config.active,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id',
        });

      if (error) throw error;
      
      toast.success('Widget configuration saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmbedCode = () => {
    copyText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const handleCopyUrl = () => {
    copyText(widgetUrl);
    toast.success('Widget URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Preview Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Customize your catering widget appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="branding" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="branding">
                    <Palette className="w-4 h-4 mr-2" />
                    Branding
                  </TabsTrigger>
                  <TabsTrigger value="layout">
                    <Monitor className="w-4 h-4 mr-2" />
                    Layout
                  </TabsTrigger>
                  <TabsTrigger value="features">
                    <Settings className="w-4 h-4 mr-2" />
                    Features
                  </TabsTrigger>
                </TabsList>

                {/* Branding Tab */}
                <TabsContent value="branding" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          placeholder="#f97316"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.secondaryColor}
                          onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                          placeholder="#ea580c"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bg-color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bg-color"
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.backgroundColor}
                          onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="text-color"
                          type="color"
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          placeholder="#1f2937"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcome-msg">Welcome Message</Label>
                    <Input
                      id="welcome-msg"
                      value={config.welcomeMessage}
                      onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                      placeholder="Explore Our Catering Packages"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="success-msg">Success Message</Label>
                    <Textarea
                      id="success-msg"
                      value={config.successMessage}
                      onChange={(e) => setConfig({ ...config, successMessage: e.target.value })}
                      placeholder="Thank you! We'll contact you soon..."
                      rows={2}
                    />
                  </div>
                </TabsContent>

                {/* Layout Tab */}
                <TabsContent value="layout" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="border-radius">Border Radius (px)</Label>
                      <Input
                        id="border-radius"
                        type="number"
                        value={config.borderRadius}
                        onChange={(e) => setConfig({ ...config, borderRadius: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="compact-mode">Compact Mode</Label>
                      <Switch
                        id="compact-mode"
                        checked={config.compactMode}
                        onCheckedChange={(checked) => setConfig({ ...config, compactMode: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-images">Show Package Images</Label>
                      <Switch
                        id="show-images"
                        checked={config.showImages}
                        onCheckedChange={(checked) => setConfig({ ...config, showImages: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="guest-custom">Allow Guest Count Customization</Label>
                        <p className="text-sm text-muted-foreground">Let customers choose guest count</p>
                      </div>
                      <Switch
                        id="guest-custom"
                        checked={config.allowGuestCountCustomization}
                        onCheckedChange={(checked) => setConfig({ ...config, allowGuestCountCustomization: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dietary-filters">Show Dietary Filters</Label>
                        <p className="text-sm text-muted-foreground">Filter by dietary restrictions</p>
                      </div>
                      <Switch
                        id="dietary-filters"
                        checked={config.showDietaryFilters}
                        onCheckedChange={(checked) => setConfig({ ...config, showDietaryFilters: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-phone">Require Phone Number</Label>
                        <p className="text-sm text-muted-foreground">Make phone number mandatory</p>
                      </div>
                      <Switch
                        id="require-phone"
                        checked={config.requirePhone}
                        onCheckedChange={(checked) => setConfig({ ...config, requirePhone: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-venue">Require Venue Details</Label>
                        <p className="text-sm text-muted-foreground">Request venue name and address</p>
                      </div>
                      <Switch
                        id="require-venue"
                        checked={config.requireVenue}
                        onCheckedChange={(checked) => setConfig({ ...config, requireVenue: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advance-notice">Minimum Advance Notice (days)</Label>
                      <Input
                        id="advance-notice"
                        type="number"
                        value={config.minAdvanceNoticeDays}
                        onChange={(e) => setConfig({ ...config, minAdvanceNoticeDays: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Customers must order at least this many days in advance
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                      <div>
                        <Label htmlFor="widget-active">Widget Active</Label>
                        <p className="text-sm text-muted-foreground">Enable/disable the widget</p>
                      </div>
                      <Switch
                        id="widget-active"
                        checked={config.active}
                        onCheckedChange={(checked) => setConfig({ ...config, active: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          {/* Device Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your widget looks on different devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-2 mb-4">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet className="w-4 h-4 mr-2" />
                  Tablet
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile
                </Button>
              </div>

              {/* Preview iframe with sandbox */}
              <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
                <div
                  className="mx-auto transition-all"
                  style={{
                    width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                    maxWidth: '100%',
                  }}
                >
                  {!showPreview ? (
                    <div className="bg-white rounded-lg p-8 text-center space-y-4">
                      <Eye className="w-12 h-12 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-semibold mb-2">Preview Disabled</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click below to enable live preview
                        </p>
                        <Button onClick={() => setShowPreview(true)} variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Enable Preview
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Preview is disabled by default to prevent auto-reload issues
                      </p>
                    </div>
                  ) : widgetUrl ? (
                    <iframe
                      key={widgetUrl} // Force remount when URL changes
                      src={widgetUrl}
                      className="w-full bg-white rounded-lg shadow-lg"
                      style={{
                        height: '600px',
                        border: 'none',
                      }}
                      title="Catering Widget Preview"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className="bg-white rounded-lg p-8 text-center text-muted-foreground">
                      Generating preview...
                    </div>
                  )}
                </div>
                {showPreview && (
                  <div className="mt-2 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowPreview(false)}
                      className="text-xs"
                    >
                      Disable Preview
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle>Embed on Your Website</CardTitle>
              <CardDescription>
                Copy this code and paste it into your website's HTML
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={embedCode}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={handleCopyEmbedCode}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Direct Widget URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={widgetUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyUrl}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(widgetUrl, '_blank')}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmbedCode}
                  className="flex-1"
                >
                  <Code className="w-4 h-4 mr-2" />
                  Copy Embed Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


