import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Zap,
  Clock,
  Palette,
  BarChart3,
  Building,
  Star,
  Sparkles,
} from "lucide-react";
import type { ProvisioningData } from "../ProvisioningWizard";

interface FeatureConfigurationStepProps {
  data: ProvisioningData;
  updateData: (updates: Partial<ProvisioningData>) => void;
}

const FEATURES = [
  {
    key: "deposits" as keyof ProvisioningData["enabledFeatures"],
    title: "Deposit Management",
    description:
      "Require and collect deposits for reservations to reduce no-shows",
    icon: CreditCard,
    category: "Revenue",
    plans: ["growth", "enterprise"],
    benefits: [
      "Reduce no-shows by up to 80%",
      "Secure revenue in advance",
      "Automatic refund processing",
    ],
  },
  {
    key: "posIntegration" as keyof ProvisioningData["enabledFeatures"],
    title: "POS Integration",
    description:
      "Connect with your existing point-of-sale system for seamless operations",
    icon: Zap,
    category: "Operations",
    plans: ["growth", "enterprise"],
    benefits: [
      "Real-time inventory sync",
      "Unified customer data",
      "Streamlined operations",
    ],
  },
  {
    key: "etaNotifications" as keyof ProvisioningData["enabledFeatures"],
    title: "ETA Notifications",
    description:
      "Send real-time updates to customers about their table readiness",
    icon: Clock,
    category: "Customer Experience",
    plans: ["starter", "growth", "enterprise"],
    benefits: [
      "Improve customer satisfaction",
      "Reduce wait time complaints",
      "SMS and email notifications",
    ],
  },
  {
    key: "customBranding" as keyof ProvisioningData["enabledFeatures"],
    title: "Custom Branding",
    description:
      "Customize the booking widget and emails with your restaurant branding",
    icon: Palette,
    category: "Branding",
    plans: ["growth", "enterprise"],
    benefits: [
      "Match your restaurant identity",
      "Professional customer experience",
      "Custom colors and logos",
    ],
  },
  {
    key: "advancedAnalytics" as keyof ProvisioningData["enabledFeatures"],
    title: "Advanced Analytics",
    description:
      "Detailed insights into booking patterns, customer behavior, and revenue",
    icon: BarChart3,
    category: "Analytics",
    plans: ["growth", "enterprise"],
    benefits: [
      "Data-driven decisions",
      "Revenue optimization",
      "Customer behavior insights",
    ],
  },
  {
    key: "multiLocation" as keyof ProvisioningData["enabledFeatures"],
    title: "Multi-Location Support",
    description: "Manage multiple restaurant locations from a single dashboard",
    icon: Building,
    category: "Enterprise",
    plans: ["enterprise"],
    benefits: [
      "Centralized management",
      "Cross-location reporting",
      "Unified customer database",
    ],
  },
];

export function FeatureConfigurationStep({
  data,
  updateData,
}: FeatureConfigurationStepProps) {
  const updateFeature = (
    feature: keyof ProvisioningData["enabledFeatures"],
    enabled: boolean,
  ) => {
    updateData({
      enabledFeatures: {
        ...data.enabledFeatures,
        [feature]: enabled,
      },
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Revenue":
        return <CreditCard className="h-4 w-4" />;
      case "Operations":
        return <Zap className="h-4 w-4" />;
      case "Customer Experience":
        return <Star className="h-4 w-4" />;
      case "Branding":
        return <Palette className="h-4 w-4" />;
      case "Analytics":
        return <BarChart3 className="h-4 w-4" />;
      case "Enterprise":
        return <Building className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const groupedFeatures = FEATURES.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, typeof FEATURES>,
  );

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-purple-800">
                Customize Your Experience
              </h4>
              <p className="text-sm text-purple-700">
                Enable the features that matter most to your restaurant. You can
                always change these settings later from your dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedFeatures).map(([category, features]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {category} Features
            </CardTitle>
            <CardDescription>
              Enhance your restaurant operations with these{" "}
              {category.toLowerCase()} features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {feature.category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="ml-11 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Key Benefits:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {feature.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="ml-11">
                    <Badge variant="secondary" className="text-xs">
                      Available in:{" "}
                      {feature.plans
                        .join(", ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                      plans
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <Switch
                    checked={data.enabledFeatures[feature.key]}
                    onCheckedChange={(checked) =>
                      updateFeature(feature.key, checked)
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Sparkles className="h-4 w-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-800">Feature Activation</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  • Features will be activated immediately after your restaurant
                  is provisioned
                </p>
                <p>
                  • Some features may require additional setup or integration
                  steps
                </p>
                <p>
                  • Our support team will help you configure advanced features
                </p>
                <p>• Feature availability depends on your selected plan</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
