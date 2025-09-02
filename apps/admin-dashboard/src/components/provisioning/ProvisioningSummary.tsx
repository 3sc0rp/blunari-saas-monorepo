import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  User,
  Clock,
  CreditCard,
  Settings,
  MapPin,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import type { ProvisioningData } from "./ProvisioningWizard";

interface ProvisioningSummaryProps {
  data: ProvisioningData;
  currentStep: number;
}

export function ProvisioningSummary({
  data,
  currentStep,
}: ProvisioningSummaryProps) {
  const getBusinessHoursSummary = () => {
    const openDays = data.businessHours.filter((h) => h.isOpen);
    if (openDays.length === 0) return "No hours set";
    if (openDays.length === 7) return "Open 7 days a week";
    return `Open ${openDays.length} days a week`;
  };

  const getEnabledFeaturesCount = () => {
    return Object.values(data.enabledFeatures).filter(Boolean).length;
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-lg">Setup Summary</CardTitle>
        <CardDescription>Review your configuration so far</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        {currentStep > 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building className="h-4 w-4" />
              Restaurant Information
            </div>
            <div className="ml-6 space-y-1 text-sm text-muted-foreground">
              <div>
                <strong>{data.restaurantName || "Not set"}</strong>
              </div>
              {data.slug && <div>URL: bookings.app/{data.slug}</div>}
              {data.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {data.email}
                </div>
              )}
              {data.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {data.phone}
                </div>
              )}
              {data.address.city && data.address.state && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {data.address.city}, {data.address.state}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Owner Account */}
        {currentStep > 2 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Administrator Account
            </div>
            <div className="ml-6 space-y-1 text-sm text-muted-foreground">
              <div>
                {data.ownerFirstName} {data.ownerLastName}
              </div>
              <div>{data.ownerEmail}</div>
              <Badge variant="secondary" className="text-xs">
                Admin Access
              </Badge>
            </div>
          </div>
        )}

        {/* Business Configuration */}
        {currentStep > 3 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Business Configuration
            </div>
            <div className="ml-6 space-y-1 text-sm text-muted-foreground">
              <div>Timezone: {data.timezone.replace("_", " ")}</div>
              <div>{getBusinessHoursSummary()}</div>
              <div>
                Party sizes: {data.partySizeConfig.minPartySize}-
                {data.partySizeConfig.maxPartySize} guests
              </div>
            </div>
          </div>
        )}

        {/* Billing Setup */}
        {currentStep > 4 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Billing Plan
            </div>
            <div className="ml-6 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Selected Plan</span>
                <Badge variant="default" className="text-xs">
                  {data.billingCycle === "yearly" ? "Annual" : "Monthly"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Feature Configuration */}
        {currentStep > 5 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Features
            </div>
            <div className="ml-6 space-y-1 text-sm text-muted-foreground">
              <div>{getEnabledFeaturesCount()} advanced features enabled</div>
              {data.enabledFeatures.deposits && (
                <Badge variant="outline" className="text-xs mr-1">
                  Deposits
                </Badge>
              )}
              {data.enabledFeatures.posIntegration && (
                <Badge variant="outline" className="text-xs mr-1">
                  POS
                </Badge>
              )}
              {data.enabledFeatures.etaNotifications && (
                <Badge variant="outline" className="text-xs mr-1">
                  ETA
                </Badge>
              )}
              {data.enabledFeatures.customBranding && (
                <Badge variant="outline" className="text-xs mr-1">
                  Branding
                </Badge>
              )}
              {data.enabledFeatures.advancedAnalytics && (
                <Badge variant="outline" className="text-xs mr-1">
                  Analytics
                </Badge>
              )}
              {data.enabledFeatures.multiLocation && (
                <Badge variant="outline" className="text-xs mr-1">
                  Multi-Location
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
