import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigation } from "@/contexts/NavigationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  Monitor,
  Smartphone,
  Sidebar,
  Navigation2,
  Palette,
  Layout,
  Moon,
  Sun,
  Eye,
  Contrast,
  Paintbrush,
  Info,
} from "lucide-react";

const InterfaceSettings: React.FC = () => {
  const { preference, setPreference, actualLayout } = useNavigation();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const {
    theme,
    contrast,
    setTheme,
    setContrast,
    toggleTheme,
    toggleContrast,
  } = useTheme();
  const { updateBranding } = useTenantBranding();

  const navigationOptions = [
    {
      value: "sidebar",
      label: "Sidebar",
      description: "Classic sidebar navigation for desktop and mobile - recommended for power users",
      icon: Sidebar,
      badge: "Default",
    },
    {
      value: "auto",
      label: "Auto (Responsive)",
      description: "Sidebar on desktop (≥1024px), bottom navigation on mobile - best of both worlds",
      icon: Monitor,
      badge: "Smart",
    },
    {
      value: "bottom",
      label: "Bottom Navigation",
      description: "Modern bottom navigation on all devices - optimized for mobile-first usage",
      icon: Smartphone,
      badge: null,
    },
  ];

  const handleColorChange = (
    colorType: "primary" | "accent",
    value: string,
  ) => {
    updateBranding({
      [colorType === "primary" ? "primaryColor" : "accentColor"]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Navigation Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">
              Choose your preferred navigation style
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              This setting controls how the main navigation is displayed across
              your dashboard.
            </p>
          </div>

          <RadioGroup
            value={preference}
            onValueChange={(value: "sidebar" | "bottom" | "auto") =>
              setPreference(value)
            }
            className="space-y-4"
          >
            {navigationOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <div key={option.value} className="space-y-2">
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                    preference === option.value ? 'border-primary bg-primary/5' : ''
                  }`}>
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        preference === option.value ? 'bg-primary/20' : 'bg-primary/10'
                      }`}>
                        <IconComponent className={`h-5 w-5 ${
                          preference === option.value ? 'text-primary' : 'text-primary/70'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={option.value}
                            className="font-medium cursor-pointer"
                          >
                            {option.label}
                          </Label>
                          {option.badge && (
                            <Badge variant={preference === option.value ? "default" : "secondary"} className="text-xs">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation2 className="h-4 w-4" />
              <span>Changes take effect immediately</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-foreground">
                Currently showing: <strong>
                  {actualLayout === "sidebar" ? "Sidebar" : "Bottom Navigation"}
                </strong>
                {preference === "auto" && (
                  <span className="text-muted-foreground ml-1">
                    ({isDesktop ? "Desktop" : "Mobile"} mode)
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme & Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Color Theme</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose between light and dark mode.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="flex-1 flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="flex-1 flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>

          {/* Contrast Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Contrast className="h-5 w-5 text-accent" />
              </div>
              <div>
                <Label className="font-medium">High Contrast Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better accessibility
                </p>
              </div>
            </div>
            <Switch
              checked={contrast === "high"}
              onCheckedChange={toggleContrast}
            />
          </div>

          {/* Brand Colors */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Brand Colors</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Customize your brand colors to match your restaurant's identity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    defaultValue="#1a365d"
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    placeholder="#1a365d"
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent-color"
                    type="color"
                    defaultValue="#2d8a3e"
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    placeholder="#2d8a3e"
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Paintbrush className="h-4 w-4" />
              <span>Brand colors update across your entire dashboard</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Advanced Accessibility
            </h3>
            <p className="text-muted-foreground">
              Motion preferences, screen reader optimizations, and keyboard
              navigation settings coming soon.
            </p>
            <Badge variant="outline" className="mt-4">
              WCAG 2.1 AA Compliant
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterfaceSettings;
