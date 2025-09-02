import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone,
  Download,
  Play,
  Settings,
  Code,
  Puzzle,
  Palette,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  category: "analytics" | "integration" | "ui" | "automation";
  author: string;
  downloads: number;
  rating: number;
  configurable: boolean;
}

interface Widget {
  id: string;
  name: string;
  type: "chart" | "metric" | "list" | "custom";
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  enabled: boolean;
}

export const ExtensibilityManager: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [mobileAppConfig, setMobileAppConfig] = useState({
    enablePushNotifications: true,
    offlineMode: true,
    biometricAuth: false,
    darkMode: true,
  });
  const [customTheme, setCustomTheme] = useState({
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    accentColor: "#8b5cf6",
    brandName: "Blunari",
    logo: "",
    favicon: "",
  });

  useEffect(() => {
    loadExtensibilityData();
  }, []);

  const loadExtensibilityData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockPlugins: Plugin[] = [
        {
          id: "1",
          name: "Advanced Analytics",
          version: "2.1.0",
          description:
            "Machine learning-powered insights and predictive analytics",
          enabled: true,
          category: "analytics",
          author: "Blunari Team",
          downloads: 1250,
          rating: 4.8,
          configurable: true,
        },
        {
          id: "2",
          name: "Slack Integration",
          version: "1.5.2",
          description: "Send notifications and manage bookings through Slack",
          enabled: false,
          category: "integration",
          author: "Community",
          downloads: 890,
          rating: 4.5,
          configurable: true,
        },
        {
          id: "3",
          name: "Custom Dashboard Widgets",
          version: "3.0.1",
          description:
            "Create and customize dashboard widgets with drag-and-drop",
          enabled: true,
          category: "ui",
          author: "Blunari Team",
          downloads: 2100,
          rating: 4.9,
          configurable: true,
        },
        {
          id: "4",
          name: "Automated Email Campaigns",
          version: "1.8.0",
          description: "Automated marketing campaigns and customer retention",
          enabled: false,
          category: "automation",
          author: "Marketing Pro",
          downloads: 670,
          rating: 4.3,
          configurable: true,
        },
      ];

      const mockWidgets: Widget[] = [
        {
          id: "w1",
          name: "Revenue Chart",
          type: "chart",
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: { chartType: "line", period: "30d" },
          enabled: true,
        },
        {
          id: "w2",
          name: "Active Users",
          type: "metric",
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { format: "number", color: "blue" },
          enabled: true,
        },
        {
          id: "w3",
          name: "Recent Bookings",
          type: "list",
          position: { x: 0, y: 4, w: 9, h: 3 },
          config: { limit: 10, showActions: true },
          enabled: true,
        },
      ];

      setPlugins(mockPlugins);
      setWidgets(mockWidgets);
    } catch (error) {
      toast.error("Failed to load extensibility data");
    }
  };

  const togglePlugin = async (pluginId: string) => {
    try {
      setPlugins((prev) =>
        prev.map((plugin) =>
          plugin.id === pluginId
            ? { ...plugin, enabled: !plugin.enabled }
            : plugin,
        ),
      );
      toast.success("Plugin settings updated");
    } catch (error) {
      toast.error("Failed to update plugin");
    }
  };

  const generateMobileApp = async () => {
    try {
      // Mock mobile app generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(
        "Mobile app build initiated. You can now run `npx cap sync` to sync with native platforms.",
      );
    } catch (error) {
      toast.error("Failed to generate mobile app");
    }
  };

  const enableRealTime = async () => {
    try {
      setRealTimeEnabled(!realTimeEnabled);
      if (!realTimeEnabled) {
        // Initialize WebSocket connection
        toast.success("Real-time updates enabled");
      } else {
        toast.success("Real-time updates disabled");
      }
    } catch (error) {
      toast.error("Failed to toggle real-time updates");
    }
  };

  const saveThemeSettings = async () => {
    try {
      // Mock save theme
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Theme settings saved");
    } catch (error) {
      toast.error("Failed to save theme settings");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "analytics":
        return <Zap className="h-4 w-4" />;
      case "integration":
        return <Puzzle className="h-4 w-4" />;
      case "ui":
        return <Palette className="h-4 w-4" />;
      case "automation":
        return <Settings className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "analytics":
        return "bg-blue-100 text-blue-800";
      case "integration":
        return "bg-green-100 text-green-800";
      case "ui":
        return "bg-purple-100 text-purple-800";
      case "automation":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Extensibility</h2>
          <p className="text-muted-foreground">
            Extend your platform with plugins, mobile apps, and custom features
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          <Zap className="h-3 w-3 mr-1" />
          Beta Features
        </Badge>
      </div>

      <Tabs defaultValue="mobile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mobile">Mobile App</TabsTrigger>
          <TabsTrigger value="plugins">Plugin System</TabsTrigger>
          <TabsTrigger value="widgets">Custom Widgets</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="theming">Theming</TabsTrigger>
        </TabsList>

        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5" />
                <span>Mobile Application</span>
              </CardTitle>
              <CardDescription>
                Generate a native mobile app with Capacitor for iOS and Android
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Mobile app is configured with Capacitor. To test on device,
                  export to GitHub and run `npx cap sync`.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">App Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Push Notifications</label>
                      <Switch
                        checked={mobileAppConfig.enablePushNotifications}
                        onCheckedChange={(checked) =>
                          setMobileAppConfig((prev) => ({
                            ...prev,
                            enablePushNotifications: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Offline Mode</label>
                      <Switch
                        checked={mobileAppConfig.offlineMode}
                        onCheckedChange={(checked) =>
                          setMobileAppConfig((prev) => ({
                            ...prev,
                            offlineMode: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">
                        Biometric Authentication
                      </label>
                      <Switch
                        checked={mobileAppConfig.biometricAuth}
                        onCheckedChange={(checked) =>
                          setMobileAppConfig((prev) => ({
                            ...prev,
                            biometricAuth: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Dark Mode Support</label>
                      <Switch
                        checked={mobileAppConfig.darkMode}
                        onCheckedChange={(checked) =>
                          setMobileAppConfig((prev) => ({
                            ...prev,
                            darkMode: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Build Status</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Capacitor Config</span>
                      <Badge variant="default">Ready</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>iOS Target</span>
                      <Badge variant="secondary">iOS 13+</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Android Target</span>
                      <Badge variant="secondary">API 24+</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>PWA Support</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={generateMobileApp}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Generate Mobile Build</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Test in Browser</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Marketplace</CardTitle>
              <CardDescription>
                Extend your platform with community and official plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-lg ${getCategoryColor(plugin.category)}`}
                        >
                          {getCategoryIcon(plugin.category)}
                        </div>
                        <div>
                          <h4 className="font-medium">{plugin.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {plugin.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>v{plugin.version}</span>
                            <span>by {plugin.author}</span>
                            <span>
                              {plugin.downloads.toLocaleString()} downloads
                            </span>
                            <span>★ {plugin.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {plugin.configurable && (
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3" />
                          </Button>
                        )}
                        <Switch
                          checked={plugin.enabled}
                          onCheckedChange={() => togglePlugin(plugin.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Dashboard Widgets</CardTitle>
              <CardDescription>
                Create and manage custom widgets for your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">
                    Active Widgets ({widgets.filter((w) => w.enabled).length})
                  </h4>
                  <Button size="sm">
                    <Code className="h-3 w-3 mr-1" />
                    Create Widget
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {widgets.map((widget) => (
                    <div key={widget.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{widget.name}</h5>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => {
                            setWidgets((prev) =>
                              prev.map((w) =>
                                w.id === widget.id
                                  ? { ...w, enabled: !w.enabled }
                                  : w,
                              ),
                            );
                          }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Type: {widget.type} • Position: {widget.position.x},
                        {widget.position.y}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                        <Button size="sm" variant="outline">
                          <Palette className="h-3 w-3 mr-1" />
                          Style
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Enable WebSocket-based real-time features across the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Real-time Engine</h4>
                  <p className="text-sm text-muted-foreground">
                    WebSocket-powered live updates for dashboards,
                    notifications, and data
                  </p>
                </div>
                <Switch
                  checked={realTimeEnabled}
                  onCheckedChange={enableRealTime}
                />
              </div>

              {realTimeEnabled && (
                <div className="space-y-4">
                  <h4 className="font-medium">Real-time Features</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Live Dashboard Updates</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Instant Notifications</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Live Chat Support</span>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Collaborative Editing</span>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Theming</CardTitle>
              <CardDescription>
                Customize the look and feel of your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Brand Colors</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">
                        Primary Color
                      </label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type="color"
                          value={customTheme.primaryColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              primaryColor: e.target.value,
                            }))
                          }
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={customTheme.primaryColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              primaryColor: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type="color"
                          value={customTheme.secondaryColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              secondaryColor: e.target.value,
                            }))
                          }
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={customTheme.secondaryColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              secondaryColor: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Accent Color
                      </label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type="color"
                          value={customTheme.accentColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              accentColor: e.target.value,
                            }))
                          }
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={customTheme.accentColor}
                          onChange={(e) =>
                            setCustomTheme((prev) => ({
                              ...prev,
                              accentColor: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Branding</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Brand Name</label>
                      <Input
                        value={customTheme.brandName}
                        onChange={(e) =>
                          setCustomTheme((prev) => ({
                            ...prev,
                            brandName: e.target.value,
                          }))
                        }
                        placeholder="Enter brand name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Logo URL</label>
                      <Input
                        value={customTheme.logo}
                        onChange={(e) =>
                          setCustomTheme((prev) => ({
                            ...prev,
                            logo: e.target.value,
                          }))
                        }
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Favicon URL</label>
                      <Input
                        value={customTheme.favicon}
                        onChange={(e) =>
                          setCustomTheme((prev) => ({
                            ...prev,
                            favicon: e.target.value,
                          }))
                        }
                        placeholder="https://example.com/favicon.ico"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button onClick={saveThemeSettings}>
                  <Palette className="h-4 w-4 mr-2" />
                  Save Theme
                </Button>
                <Button variant="outline">Preview Changes</Button>
                <Button variant="outline">Reset to Default</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
