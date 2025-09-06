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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  RotateCcw,
  Shield,
  Zap,
  Crown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import { useToast } from "@/hooks/use-toast";
import type { TenantFeature } from "@/types/admin";

interface TenantFeaturesTabProps {
  tenantSlug: string;
}

const FEATURE_METADATA = {
  basic_booking: {
    name: "Basic Booking",
    description: "Core reservation functionality",
    category: "core",
    icon: Settings,
  },
  email_notifications: {
    name: "Email Notifications",
    description: "Automated email confirmations and reminders",
    category: "communication",
    icon: Settings,
  },
  basic_analytics: {
    name: "Basic Analytics",
    description: "Essential reporting and insights",
    category: "analytics",
    icon: Settings,
  },
  widget_integration: {
    name: "Widget Integration",
    description: "Embeddable booking widgets",
    category: "integration",
    icon: Settings,
  },
  pos_integration: {
    name: "POS Integration",
    description: "Point of sale system connectivity",
    category: "integration",
    icon: Zap,
  },
  advanced_analytics: {
    name: "Advanced Analytics",
    description: "Detailed reports and business intelligence",
    category: "analytics",
    icon: Crown,
  },
  custom_branding: {
    name: "Custom Branding",
    description: "White-label customization options",
    category: "branding",
    icon: Crown,
  },
  multi_location: {
    name: "Multi-Location",
    description: "Manage multiple restaurant locations",
    category: "enterprise",
    icon: Crown,
  },
  priority_support: {
    name: "Priority Support",
    description: "Enhanced customer support",
    category: "support",
    icon: Shield,
  },
} as const;

export function TenantFeaturesTab({ tenantSlug }: TenantFeaturesTabProps) {
  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { getTenantFeatures, updateTenantFeature, resetFeaturesToPlan } =
    useAdminAPI();
  const { toast } = useToast();

  useEffect(() => {
    loadFeatures();
  }, [tenantSlug]);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const featuresData = await getTenantFeatures(tenantSlug);
      setFeatures(featuresData);
    } catch (error) {
      console.error("Error loading features:", error);
      toast({
        title: "Error",
        description: "Failed to load tenant features",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (featureKey: string, enabled: boolean) => {
    try {
      setUpdating(featureKey);
      await updateTenantFeature(tenantSlug, featureKey, enabled);

      // Update local state
      setFeatures((prev) =>
        prev.map((feature) =>
          feature.feature_key === featureKey
            ? { ...feature, enabled, source: "OVERRIDE" }
            : feature,
        ),
      );
    } catch (error) {
      console.error("Error updating feature:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleResetToPlan = async () => {
    try {
      setLoading(true);
      await resetFeaturesToPlan(tenantSlug);
      await loadFeatures(); // Reload to get updated state
    } catch (error) {
      console.error("Error resetting features:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (source: "PLAN" | "OVERRIDE") => {
    if (source === "PLAN") {
      return (
        <Badge
          variant="default"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          PLAN
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      >
        OVERRIDE
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "core":
        return Settings;
      case "integration":
        return Zap;
      case "analytics":
      case "enterprise":
        return Crown;
      case "support":
        return Shield;
      default:
        return Settings;
    }
  };

  const groupedFeatures = features.reduce(
    (acc, feature) => {
      const metadata =
        FEATURE_METADATA[feature.feature_key as keyof typeof FEATURE_METADATA];
      const category = metadata?.category || "other";

      if (!acc[category]) acc[category] = [];
      acc[category].push(feature);
      return acc;
    },
    {} as Record<string, TenantFeature[]>,
  );

  const categoryLabels = {
    core: "Core Features",
    communication: "Communication",
    analytics: "Analytics",
    integration: "Integrations",
    branding: "Branding",
    enterprise: "Enterprise",
    support: "Support",
    other: "Other Features",
  };

  const hasOverrides = features.some((f) => f.source === "OVERRIDE");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading features...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Reset Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Feature Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage feature toggles and plan overrides
          </p>
        </div>

        {hasOverrides && (
          <Button
            variant="outline"
            onClick={handleResetToPlan}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Plan
          </Button>
        )}
      </div>

      {/* Override Warning */}
      {hasOverrides && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/20 dark:border-orange-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800 dark:text-orange-200">
                Feature Overrides Active
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Some features have been manually overridden from the plan
                defaults. Use "Reset to Plan" to remove all overrides.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Categories */}
      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
          const CategoryIcon = getCategoryIcon(category);

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CategoryIcon className="h-5 w-5" />
                  {categoryLabels[category as keyof typeof categoryLabels] ||
                    category}
                </CardTitle>
                <CardDescription>
                  {categoryFeatures.length} feature
                  {categoryFeatures.length !== 1 ? "s" : ""} in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryFeatures.map((feature, index) => {
                    const metadata =
                      FEATURE_METADATA[
                        feature.feature_key as keyof typeof FEATURE_METADATA
                      ];

                    return (
                      <div key={feature.id}>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <Label className="font-medium">
                                  {metadata?.name || feature.feature_key}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {metadata?.description ||
                                    "No description available"}
                                </p>
                              </div>
                              {getSourceBadge(feature.source)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={feature.enabled}
                              onCheckedChange={(checked) =>
                                handleFeatureToggle(
                                  feature.feature_key,
                                  checked,
                                )
                              }
                              disabled={updating === feature.feature_key}
                            />
                            {updating === feature.feature_key && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                          </div>
                        </div>

                        {index < categoryFeatures.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {features.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-medium">No Features Configured</h3>
              <p className="text-sm text-muted-foreground">
                This tenant has no features configured yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

