import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { Palette, Globe } from "lucide-react";
import { BrandingSettings as BrandingSettingsType } from "@/types/settings";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

interface BrandingSettingsProps {
  settings: BrandingSettingsType;
  onUpdate: (settings: Partial<BrandingSettingsType>) => void;
  isUpdating: boolean;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  settings,
  onUpdate,
  isUpdating,
}) => {
  const { updateBranding } = useTenantBranding();
  const form = useForm<BrandingSettingsType>({
    defaultValues: settings,
  });

  // Do NOT live-apply changes globally; only apply on Save
      const watchedValues = form.watch();

  // Update form values when settings prop changes
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Removed: live preview side-effect. Changes apply only after Save.
      const onSubmit = (data: BrandingSettingsType) => {
    // First persist via hook
    onUpdate(data);
    // Then apply to runtime branding context
    setTimeout(() => {
      updateBranding({
        logoUrl: data.logoUrl,
        restaurantName: data.restaurantName,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
      });
      form.reset(data);
    }, 0);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "verified":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
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
                      <Input
                        {...field}
                        placeholder="Your restaurant's tagline"
                      />
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
                <FileUpload
                  value={form.watch("logoUrl")}
                  onChange={(url) => form.setValue("logoUrl", url)}
                  label="Restaurant Logo"
                  description="Upload your restaurant logo (PNG, JPG, SVG)"
                  maxSize={2 * 1024 * 1024} // 2MB
                />
              </div>
            </div>

            {/* Removed: Custom Domain section */}

            {/* Preview */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="border rounded-lg p-4 bg-gradient-subtle">
                <div className="flex items-center gap-3 mb-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-8" />
                  ) : (
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {settings.restaurantName?.charAt(0) || "R"}
                    </div>
                  )}
                  <div>
                    <div
                      className="font-semibold"
                      style={{ color: settings.primaryColor }}
                    >
                      {settings.restaurantName || "Restaurant Name"}
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
                {isUpdating ? "Saving..." : "Save Branding Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BrandingSettings;

