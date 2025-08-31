import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Palette, Globe, Camera } from 'lucide-react';
import { BrandingSettings as BrandingSettingsType } from '@/types/settings';
import { useTenantBranding } from '@/contexts/TenantBrandingContext';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

interface BrandingSettingsProps {
  settings: BrandingSettingsType;
  onUpdate: (settings: Partial<BrandingSettingsType>) => void;
  isUpdating: boolean;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ settings, onUpdate, isUpdating }) => {
  const { updateBranding } = useTenantBranding();
  const form = useForm<BrandingSettingsType>({
    defaultValues: settings,
  });

  // Watch form changes for live preview updates
  const watchedValues = form.watch();

  // Update live preview with debounced effect to prevent infinite loops
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateBranding({
        logoUrl: watchedValues.logoUrl,
        restaurantName: watchedValues.restaurantName,
        primaryColor: watchedValues.primaryColor,
        accentColor: watchedValues.accentColor,
      });
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues.logoUrl, watchedValues.restaurantName, watchedValues.primaryColor, watchedValues.accentColor]);

  const onSubmit = (data: BrandingSettingsType) => {
    onUpdate(data);
    toast({
      title: "Branding Updated",
      description: "Your branding settings have been saved successfully.",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Branding & Identity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Restaurant Name & Tagline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="restaurantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter restaurant name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your restaurant's tagline" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Color Palette */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Color Palette</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type="color" 
                            className="w-16 h-10 p-1 border-2" 
                          />
                        </FormControl>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="#1e3a8a" 
                            className="flex-1"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type="color" 
                            className="w-16 h-10 p-1 border-2" 
                          />
                        </FormControl>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="#f59e0b" 
                            className="flex-1"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type="color" 
                            className="w-16 h-10 p-1 border-2" 
                          />
                        </FormControl>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="#059669" 
                            className="flex-1"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Logo & Assets</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm">Restaurant Logo</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {settings.logoUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={settings.logoUrl} 
                          alt="Logo" 
                          className="max-h-20 mx-auto"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          Upload your restaurant logo
                        </div>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm">Favicon</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {settings.faviconUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={settings.faviconUrl} 
                          alt="Favicon" 
                          className="max-h-8 mx-auto"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Favicon
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          Upload favicon (32x32px)
                        </div>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Favicon
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Domain */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Custom Domain</Label>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="customDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Name</FormLabel>
                      <div className="flex gap-2">
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                        </div>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="yourdomain.com" 
                            className="flex-1"
                          />
                        </FormControl>
                        <Badge variant={getStatusBadgeVariant(settings.domainStatus)}>
                          {settings.domainStatus}
                        </Badge>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {settings.customDomain && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <strong>DNS Configuration:</strong><br />
                    Add a CNAME record pointing to: <code>app.blunari.com</code><br />
                    Verification may take up to 24 hours.
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="border rounded-lg p-4 bg-gradient-subtle">
                <div className="flex items-center gap-3 mb-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-8" />
                  ) : (
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {settings.restaurantName?.charAt(0) || 'R'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold" style={{ color: settings.primaryColor }}>
                      {settings.restaurantName || 'Restaurant Name'}
                    </div>
                    {settings.tagline && (
                      <div className="text-sm text-muted-foreground">
                        {settings.tagline}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: settings.secondaryColor }}
                  />
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: settings.accentColor }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Branding Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BrandingSettings;