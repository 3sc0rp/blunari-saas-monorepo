import React, { useState } from "react";
import { motion } from "framer-motion";
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
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import BookingDebugger from "@/components/booking/BookingDebugger";

const WidgetPreview: React.FC = () => {
  const { tenant, isLoading } = useTenant();
  const { toast } = useToast();
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetType, setWidgetType] = useState<"booking" | "catering">(
    "booking",
  );

  // Widget configuration state - separate for booking and catering
  const [bookingConfig, setBookingConfig] = useState({
    theme: "light",
    primaryColor: tenant?.primary_color || "#3b82f6",
    showAvailability: true,
    showPricing: false,
    requirePhone: true,
    allowCancellation: true,
    maxAdvanceBooking: 30,
    timeSlotInterval: 30,
    enableWaitlist: true,
    enableNotifications: true,
    showReviews: false,
  });

  const [cateringConfig, setCateringConfig] = useState({
    theme: "light",
    primaryColor: tenant?.primary_color || "#3b82f6",
    showPackages: true,
    showCustomOrders: true,
    enableQuotes: true,
    showGallery: true,
    packageFilters: true,
    minOrderDays: 3,
    requirePhone: true,
    enableNotifications: true,
    showTestimonials: false,
  });

  // Get current config based on widget type
  const currentConfig =
    widgetType === "booking" ? bookingConfig : cateringConfig;
  const setCurrentConfig =
    widgetType === "booking" ? setBookingConfig : setCateringConfig;

  // Device configurations for preview
  const deviceConfigs = {
    desktop: {
      width: "100%",
      height: "h-[600px]",
      icon: Monitor,
      label: "Desktop",
    },
    tablet: {
      width: "768px",
      height: "h-[800px]",
      icon: Tablet,
      label: "Tablet",
    },
    mobile: {
      width: "375px",
      height: "h-[667px]",
      icon: Smartphone,
      label: "Mobile",
    },
  };

  // Generate URLs for both widget types
  const bookingUrl = `${window.location.origin}/booking-widget/${tenant?.id || "demo"}`;
  const cateringUrl = `${window.location.origin}/catering-widget/${tenant?.id || "demo"}`;
  const currentUrl = widgetType === "booking" ? bookingUrl : cateringUrl;

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

  const refreshPreview = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Generate embed codes
  const embedCode = `<!-- Blunari ${widgetType === "booking" ? "Booking" : "Catering"} Widget -->
<iframe
  src="${currentUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="${widgetType === "booking" ? "Booking" : "Catering"} Widget"
></iframe>`;

  const jsEmbedCode = `<!-- Blunari ${widgetType === "booking" ? "Booking" : "Catering"} Widget - Advanced -->
<div id="blunari-${widgetType}-widget" style="min-height: 600px;"></div>
<script>
(function() {
  const iframe = document.createElement('iframe');
  iframe.src = '${currentUrl}';
  iframe.width = '100%';
  iframe.height = '600';
  iframe.frameBorder = '0';
  iframe.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px;';
  iframe.title = '${widgetType === "booking" ? "Booking" : "Catering"} Widget';
  
  const container = document.getElementById('blunari-${widgetType}-widget');
  if (container) {
    container.appendChild(iframe);
  }
})();
</script>`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">Loading...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Widget Preview & Settings</h1>
          <p className="text-muted-foreground">
            Customize and preview your embeddable widgets for both booking and
            catering
          </p>
        </div>

        {/* Widget Type Selector */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={widgetType === "booking" ? "default" : "ghost"}
            size="sm"
            onClick={() => setWidgetType("booking")}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Booking
          </Button>
          <Button
            variant={widgetType === "catering" ? "default" : "ghost"}
            size="sm"
            onClick={() => setWidgetType("catering")}
            className="flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            Catering
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-6">
          {/* Device Selector */}
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Device Selector */}
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-sm font-medium">Preview Device:</Label>
                {Object.entries(deviceConfigs).map(([device, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <Button
                      key={device}
                      variant={previewDevice === device ? "default" : "outline"}
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

              {/* Preview Frame */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div
                  className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
                  style={{
                    width: deviceConfigs[previewDevice].width,
                    maxWidth: "100%",
                  }}
                >
                  <iframe
                    key={`${widgetType}-${refreshing}`}
                    src={currentUrl}
                    className={`w-full border-0 ${deviceConfigs[previewDevice].height}`}
                    title={`${widgetType === "booking" ? "Booking" : "Catering"} Widget Preview`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  {widgetType === "booking" ? "Booking" : "Catering"} Widget
                  Configuration
                </CardTitle>
                <CardDescription>
                  Customize your {widgetType} widget's appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Theme</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        currentConfig.theme === "light" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          theme: "light",
                        }))
                      }
                    >
                      Light
                    </Button>
                    <Button
                      variant={
                        currentConfig.theme === "dark" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setCurrentConfig((prev) => ({ ...prev, theme: "dark" }))
                      }
                    >
                      Dark
                    </Button>
                    <Button
                      variant={
                        currentConfig.theme === "auto" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setCurrentConfig((prev) => ({ ...prev, theme: "auto" }))
                      }
                    >
                      Auto
                    </Button>
                  </div>
                </div>

                {/* Primary Color */}
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

                {/* Feature Toggles - Booking Specific */}
                {widgetType === "booking" && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      Booking Features
                    </Label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Show Availability</Label>
                          <p className="text-xs text-muted-foreground">
                            Display real-time table availability
                          </p>
                        </div>
                        <Switch
                          checked={bookingConfig.showAvailability}
                          onCheckedChange={(checked) =>
                            setBookingConfig((prev) => ({
                              ...prev,
                              showAvailability: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Show Pricing</Label>
                          <p className="text-xs text-muted-foreground">
                            Display pricing information
                          </p>
                        </div>
                        <Switch
                          checked={bookingConfig.showPricing}
                          onCheckedChange={(checked) =>
                            setBookingConfig((prev) => ({
                              ...prev,
                              showPricing: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Allow Cancellation</Label>
                          <p className="text-xs text-muted-foreground">
                            Let customers cancel bookings
                          </p>
                        </div>
                        <Switch
                          checked={bookingConfig.allowCancellation}
                          onCheckedChange={(checked) =>
                            setBookingConfig((prev) => ({
                              ...prev,
                              allowCancellation: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Enable Waitlist</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow customers to join waitlist when fully booked
                          </p>
                        </div>
                        <Switch
                          checked={bookingConfig.enableWaitlist}
                          onCheckedChange={(checked) =>
                            setBookingConfig((prev) => ({
                              ...prev,
                              enableWaitlist: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="advance-booking"
                        className="text-sm font-medium"
                      >
                        Maximum Advance Booking (days)
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
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="time-slot"
                        className="text-sm font-medium"
                      >
                        Time Slot Interval (minutes)
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
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Feature Toggles - Catering Specific */}
                {widgetType === "catering" && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      Catering Features
                    </Label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Show Packages</Label>
                          <p className="text-xs text-muted-foreground">
                            Display pre-designed catering packages
                          </p>
                        </div>
                        <Switch
                          checked={cateringConfig.showPackages}
                          onCheckedChange={(checked) =>
                            setCateringConfig((prev) => ({
                              ...prev,
                              showPackages: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Custom Orders</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow custom catering requests
                          </p>
                        </div>
                        <Switch
                          checked={cateringConfig.showCustomOrders}
                          onCheckedChange={(checked) =>
                            setCateringConfig((prev) => ({
                              ...prev,
                              showCustomOrders: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Enable Quotes</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow customers to request quotes
                          </p>
                        </div>
                        <Switch
                          checked={cateringConfig.enableQuotes}
                          onCheckedChange={(checked) =>
                            setCateringConfig((prev) => ({
                              ...prev,
                              enableQuotes: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Show Gallery</Label>
                          <p className="text-xs text-muted-foreground">
                            Display food gallery and photos
                          </p>
                        </div>
                        <Switch
                          checked={cateringConfig.showGallery}
                          onCheckedChange={(checked) =>
                            setCateringConfig((prev) => ({
                              ...prev,
                              showGallery: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm">Package Filters</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable filtering by event type, guest count
                          </p>
                        </div>
                        <Switch
                          checked={cateringConfig.packageFilters}
                          onCheckedChange={(checked) =>
                            setCateringConfig((prev) => ({
                              ...prev,
                              packageFilters: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="min-order-days"
                        className="text-sm font-medium"
                      >
                        Minimum Order Days in Advance
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
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Common Features */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Common Features</Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Require Phone Number</Label>
                        <p className="text-xs text-muted-foreground">
                          Make phone number mandatory
                        </p>
                      </div>
                      <Switch
                        checked={currentConfig.requirePhone}
                        onCheckedChange={(checked) =>
                          setCurrentConfig((prev) => ({
                            ...prev,
                            requirePhone: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Send confirmation emails/SMS
                        </p>
                      </div>
                      <Switch
                        checked={currentConfig.enableNotifications}
                        onCheckedChange={(checked) =>
                          setCurrentConfig((prev) => ({
                            ...prev,
                            enableNotifications: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Show Reviews</Label>
                        <p className="text-xs text-muted-foreground">
                          Display customer testimonials
                        </p>
                      </div>
                      <Switch
                        checked={
                          widgetType === "booking"
                            ? bookingConfig.showReviews
                            : cateringConfig.showTestimonials
                        }
                        onCheckedChange={(checked) => {
                          if (widgetType === "booking") {
                            setBookingConfig((prev) => ({
                              ...prev,
                              showReviews: checked,
                            }));
                          } else {
                            setCateringConfig((prev) => ({
                              ...prev,
                              showTestimonials: checked,
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Simple Embed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Simple Embed
                </CardTitle>
                <CardDescription>
                  Basic iframe embed code for most websites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{embedCode}</pre>
                </div>

                <Button
                  onClick={() => copyToClipboard(embedCode, "Embed code")}
                  className="w-full"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy Embed Code"}
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
                  JavaScript embed with dynamic loading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{jsEmbedCode}</pre>
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(jsEmbedCode, "Advanced embed code")
                  }
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Advanced Code
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onClick={() => copyToClipboard(currentUrl, "Widget URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Widget Type</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md flex-1">
                      {widgetType === "booking" ? (
                        <Calendar className="w-4 h-4 text-blue-500" />
                      ) : (
                        <ChefHat className="w-4 h-4 text-orange-500" />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {widgetType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === "development" && tenant?.slug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingDebugger slug={tenant.slug} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WidgetPreview;
