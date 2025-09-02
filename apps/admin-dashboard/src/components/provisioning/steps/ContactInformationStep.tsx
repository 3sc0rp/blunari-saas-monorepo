import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, Mail, Globe } from "lucide-react";
import type { ProvisioningData } from "../ProvisioningWizard";

interface ContactInformationStepProps {
  data: ProvisioningData;
  updateData: (updates: Partial<ProvisioningData>) => void;
}

export function ContactInformationStep({
  data,
  updateData,
}: ContactInformationStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contact Details
          </CardTitle>
          <CardDescription>
            Communication channels for customer inquiries and business
            operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Business Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@restaurant.com"
                  value={data.email}
                  onChange={(e) => updateData({ email: e.target.value })}
                  className="h-11 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Primary contact email for reservations and inquiries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={data.phone}
                  onChange={(e) => updateData({ phone: e.target.value })}
                  className="h-11 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional: For customer calls and verification
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">
              Website
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                type="url"
                placeholder="https://www.restaurant.com"
                value={data.website}
                onChange={(e) => updateData({ website: e.target.value })}
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional: Your restaurant's website or social media page
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
