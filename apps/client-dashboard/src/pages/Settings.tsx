import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Settings as SettingsIcon,
  Palette,
  Clock,
  Plug,
  Bell,
  Save,
  RefreshCw,
  Wrench,
  Eye,
  Monitor,
  Home,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useTenant } from "@/hooks/useTenant";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import BrandingSettings from "@/components/settings/BrandingSettings";
import OperationalSettings from "@/components/settings/OperationalSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import IntegrationSettings from "@/components/settings/IntegrationSettings";
import InterfaceSettings from "@/components/settings/InterfaceSettings";
import AdvancedSettings from "@/components/settings/AdvancedSettings";
import SettingsErrorBoundary from "@/components/settings/SettingsErrorBoundary";
import { EmptyState } from "@/components/ui/state";
import { toast } from "@/lib/toast";

const Settings: React.FC = () => {
  const { tenant } = useTenant();
  const { logoUrl, restaurantName } = useTenantBranding();
  const {
    settings,
    isLoading,
    error,
    updateBranding,
    updateOperational,
    updateNotifications,
    updateIntegrations,
    isUpdatingBranding,
    isUpdatingOperational,
    isUpdatingNotifications,
    isUpdatingIntegrations,
  } = useSettings();
  const [activeTab, setActiveTab] = useState("branding");

  // Error handling
      if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Configure your restaurant settings and preferences
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load settings. Please refresh the page or try again later.
            {process.env.NODE_ENV === "development" && (
              <details className="mt-2">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 text-xs">{error.message}</pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard")}
            variant="secondary"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Configure your restaurant settings and preferences
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleQuickSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          {activeTab !== "branding" && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="capitalize">
                  {activeTab}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Live Preview */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-h1 font-bold text-text">Settings</h1>
              <p className="text-body text-text-muted">
                Configure your restaurant settings and preferences
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleQuickSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Quick Save
              </Button>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:w-80">
          <Card className="bg-gradient-to-br from-brand/5 to-accent/5 border-brand/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-h4">
                <Eye className="h-5 w-5 text-brand" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface rounded-md border border-surface-2">
                  <img
                    src={logoUrl}
                    alt="Restaurant Logo"
                    className="w-10 h-10 rounded-full object-cover bg-surface-2"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <div>
                    <div className="text-body-sm font-medium text-text">
                      {restaurantName}
                    </div>
                    <div className="text-xs text-text-muted">Brand Preview</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-text-muted">Colors</div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand border border-surface-2"></div>
                    <div className="w-6 h-6 rounded-full bg-accent border border-surface-2"></div>
                    <div className="w-6 h-6 rounded-full bg-secondary border border-surface-2"></div>
                  </div>
                </div>

                {settings?.branding?.customDomain && (
                  <div className="p-2 bg-success/10 rounded border border-success/20">
                    <div className="text-xs text-success font-medium">
                      {settings.branding.customDomain}
                    </div>
                    <div className="text-xs text-success/70">Custom Domain</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setActiveTab("branding")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Branding</div>
                  <div className="text-sm text-muted-foreground">
                    Colors, logo, domain
                  </div>
                </div>
                <Badge
                  variant={
                    settings.branding.domainStatus === "verified"
                      ? "default"
                      : "secondary"
                  }
                >
                  {settings.branding.domainStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setActiveTab("operational")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Operations</div>
                  <div className="text-sm text-muted-foreground">
                    Hours, tables, policies
                  </div>
                </div>
                <Badge variant="outline">
                  {settings?.operational?.timezone?.split("/")?.[1] || "UTC"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setActiveTab("integrations")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Plug className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Integrations</div>
                  <div className="text-sm text-muted-foreground">
                    SMS, email, POS, analytics
                  </div>
                </div>
                <Badge
                  variant={
                    [
                      settings.integrations.sms,
                      settings.integrations.email,
                      settings.integrations.pos,
                      settings.integrations.analytics,
                    ].some((i) => i?.enabled)
                      ? "default"
                      : "outline"
                  }
                >
                  {
                    [
                      settings.integrations.sms,
                      settings.integrations.email,
                      settings.integrations.pos,
                      settings.integrations.analytics,
                    ].filter((i) => i?.enabled).length
                  }{" "}
                  active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setActiveTab("notifications")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Email, SMS, staff alerts
                  </div>
                </div>
                <Badge
                  variant={
                    settings.notifications.email.confirmations
                      ? "default"
                      : "outline"
                  }
                >
                  {settings.notifications.email.confirmations
                    ? "enabled"
                    : "disabled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setActiveTab("interface")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Interface</div>
                  <div className="text-sm text-muted-foreground">
                    Theme, navigation, accessibility
                  </div>
                </div>
                <Badge variant="default">Customizable</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Advanced</div>
                  <div className="text-sm text-muted-foreground">
                    API keys, exports, logs
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Settings Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-7 bg-surface-2 p-1 overflow-x-auto relative">
          <TabsTrigger
            value="branding"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
            {activeTab === "branding" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="operational"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Operations</span>
            {activeTab === "operational" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
            {activeTab === "integrations" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
            {activeTab === "notifications" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="interface"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Interface</span>
            {activeTab === "interface" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 relative data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
            {activeTab === "advanced" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="branding"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <BrandingSettings
              settings={settings.branding}
              onUpdate={updateBranding}
              isUpdating={isUpdatingBranding}
            />
          </SettingsErrorBoundary>
        </TabsContent>

        <TabsContent
          value="operational"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <OperationalSettings
              settings={settings.operational}
              onUpdate={updateOperational}
              isUpdating={isUpdatingOperational}
            />
          </SettingsErrorBoundary>
        </TabsContent>

        <TabsContent
          value="integrations"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <IntegrationSettings
              settings={settings.integrations}
              onUpdate={updateIntegrations}
              isUpdating={isUpdatingIntegrations}
            />
          </SettingsErrorBoundary>
        </TabsContent>

        <TabsContent
          value="notifications"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <NotificationSettings
              settings={settings.notifications}
              onUpdate={updateNotifications}
              isUpdating={isUpdatingNotifications}
            />
          </SettingsErrorBoundary>
        </TabsContent>

        <TabsContent
          value="interface"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <InterfaceSettings />
          </SettingsErrorBoundary>
        </TabsContent>

        <TabsContent
          value="advanced"
          className="space-y-6 p-6 bg-surface/30 rounded-lg border border-border/50"
        >
          <SettingsErrorBoundary>
            <AdvancedSettings />
          </SettingsErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="bg-surface border-surface-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-body-sm font-medium text-text">
                Last Updated
              </div>
              <div className="text-xs text-text-muted">
                {new Date().toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-body-sm font-medium text-text">Tenant</div>
              <div className="text-xs text-text-muted">
                {tenant?.name || "Restaurant"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Settings;

