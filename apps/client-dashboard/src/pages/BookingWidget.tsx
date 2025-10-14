import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { createWidgetToken } from "@/widgets/management/tokenUtils";
import {
  Code,
  Eye,
  Copy,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  Globe,
  RefreshCw,
  Share,
  Calendar,
  ChefHat,
} from "lucide-react";

type WidgetType = "booking" | "catering";

const BookingWidgetPage: React.FC = () => {
  const { tenant, isLoading } = useTenant();
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [widgetType, setWidgetType] = useState<WidgetType>("booking");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetToken, setWidgetToken] = useState<string>("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string>("");

  // Generate widget URLs with proper authentication tokens
      const generateWidgetUrls = async () => {
    if (!tenant?.slug) return { bookingUrl: "", cateringUrl: "", currentUrl: "", fullCurrentUrl: "" };

    try {
      setTokenLoading(true);
      setTokenError("");
      const token = await createWidgetToken(tenant.slug, "2.0", widgetType);
      setWidgetToken(token);
      
      const baseUrl = widgetType === "booking" 
        ? `/public-widget/book/${tenant.slug}` 
        : `/public-widget/catering/${tenant.slug}`;
      
      const urlWithToken = `${baseUrl}?token=${encodeURIComponent(token)}`;
      const fullUrl = `${window.location.origin}${urlWithToken}`;
      
      return {
        bookingUrl: `/public-widget/book/${tenant.slug}?token=${encodeURIComponent(token)}`,
        cateringUrl: `/public-widget/catering/${tenant.slug}?token=${encodeURIComponent(token)}`,
        currentUrl: urlWithToken,
        fullCurrentUrl: fullUrl
      };
    } catch (error) {
      console.error('Failed to generate widget token:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setTokenError(errorMessage);
      
      toast({
        title: "Token Generation Failed",
        description: "Unable to generate widget authentication token. Using fallback URLs.",
        variant: "destructive"
      });
      
      // Fallback URLs without tokens (may not work properly)
      const bookingUrl = `/public-widget/book/${tenant.slug}`;
      const cateringUrl = `/public-widget/catering/${tenant.slug}`;
      const currentUrl = widgetType === "booking" ? bookingUrl : cateringUrl;
      
      return {
        bookingUrl,
        cateringUrl, 
        currentUrl,
        fullCurrentUrl: `${window.location.origin}${currentUrl}`
      };
    } finally {
      setTokenLoading(false);
    }
  };

  // State for widget URLs
      const [urls, setUrls] = useState({
    bookingUrl: "",
    cateringUrl: "",
    currentUrl: "",
    fullCurrentUrl: ""
  });

  // Generate URLs when tenant or widget type changes
  useEffect(() => {
    if (tenant?.slug) {
      generateWidgetUrls().then(setUrls);
    }
  }, [tenant?.slug, widgetType]);

  const { bookingUrl, cateringUrl, currentUrl, fullCurrentUrl } = urls;

  const embedCode = `<iframe 
  src="${fullCurrentUrl}"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  title="${tenant?.name || "Restaurant"} ${widgetType === "booking" ? "Booking" : "Catering"} Widget">
</iframe>`;

  const deviceConfigs = {
    desktop: {
      width: "w-full max-w-5xl",
      height: "h-[600px]",
      label: "Desktop",
      icon: Monitor,
    },
    tablet: {
      width: "w-full max-w-3xl",
      height: "h-[550px]",
      label: "Tablet",
      icon: Tablet,
    },
    mobile: {
      width: "w-full max-w-sm",
      height: "h-[600px]",
      label: "Mobile",
      icon: Smartphone,
    },
  };

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

  const refreshPreview = async () => {
    setRefreshing(true);
    if (tenant?.slug) {
      const newUrls = await generateWidgetUrls();
      setUrls(newUrls);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Widget Preview</h1>
          <p className="text-lg text-muted-foreground">
            Preview your booking and catering widgets across different devices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={refreshPreview}
            disabled={refreshing || tokenLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing || tokenLoading ? "animate-spin" : ""}`}
            />
            {tokenLoading ? "Generating Token..." : "Refresh"}
          </Button>

          <Button asChild>
            <a href={currentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Widget
            </a>
          </Button>
        </div>
      </div>

      {/* Widget Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Type</CardTitle>
          <CardDescription>
            Choose which widget to preview and configure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={widgetType === "booking" ? "default" : "outline"}
              onClick={() => setWidgetType("booking")}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Booking Widget
            </Button>
            <Button
              variant={widgetType === "catering" ? "default" : "outline"}
              onClick={() => setWidgetType("catering")}
              className="flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Catering Widget
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Live & Active
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {widgetType === "booking" ? (
                  <Calendar className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChefHat className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Widget Type</p>
                <p className="text-sm text-muted-foreground">
                  {widgetType === "booking"
                    ? "Table Reservations"
                    : "Catering Orders"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Code className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Widget URL</p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentUrl}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Embed Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-6">
          {/* Device Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Device Preview</CardTitle>
              <CardDescription>
                Test your booking widget across different screen sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {Object.entries(deviceConfigs).map(([key, config]) => {
                  const IconComponent = config.icon;
                  const isActive = previewMode === key;
                  return (
                    <motion.div key={key} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewMode(key as any)}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="hidden sm:inline">{config.label}</span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Preview Frame */}
          <motion.div
            key={previewMode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            <div
              className={`${deviceConfigs[previewMode].width} transition-all duration-300`}
            >
              <Card className="overflow-hidden shadow-2xl">
                <CardContent className="p-0">
                  <iframe
                    key={`${widgetType}-${refreshing.toString()}`}
                    src={currentUrl}
                    className={`w-full border-0 ${deviceConfigs[previewMode].height}`}
                    title={`${widgetType === "booking" ? "Booking" : "Catering"} Widget Preview`}
                    onError={(e) => {
                      console.error("Iframe loading error:", e);
                      toast({
                        title: "Preview Error",
                        description: `Unable to load the ${widgetType} widget preview. The widget may still work when embedded.`,
                        variant: "destructive",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                {widgetType === "booking" ? "Booking" : "Catering"} Widget Embed
                Code
              </CardTitle>
              <CardDescription>
                Copy this code and paste it into your website where you want the{" "}
                {widgetType} widget to appear
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tokenError ? (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 mb-4">
                  <p className="font-medium">Token Generation Error</p>
                  <p className="text-sm mt-1">{tokenError}</p>
                  <Button 
                    onClick={generateWidgetUrls} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    disabled={tokenLoading}
                  >
                    Retry Token Generation
                  </Button>
                </div>
              ) : null}
              <Textarea
                value={embedCode}
                readOnly
                className="font-mono text-sm min-h-[120px]"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(embedCode, "Embed code")}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy Embed Code"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(fullCurrentUrl, "Widget URL")}
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share URL
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Quick Start:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Copy the embed code above</li>
                  <li>Paste it into your website's HTML</li>
                  <li>
                    The widget will automatically load and be ready for bookings
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Mobile Ready</span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Real-time</span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Globe className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Universal</span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Badge variant="outline" className="text-xs">
                    Branded
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default BookingWidgetPage;

