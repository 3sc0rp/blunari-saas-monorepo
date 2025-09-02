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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { User, Mail, Eye, EyeOff } from "lucide-react";
import type { ProvisioningData } from "../ProvisioningWizard";

interface OwnerAccountStepProps {
  data: ProvisioningData;
  updateData: (updates: Partial<ProvisioningData>) => void;
}

export function OwnerAccountStep({ data, updateData }: OwnerAccountStepProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateData({ ownerPassword: password });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Admin Account Setup
          </CardTitle>
          <CardDescription>
            This account will have full access to your restaurant's management
            system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ownerFirstName" className="text-sm font-medium">
                First Name *
              </Label>
              <Input
                id="ownerFirstName"
                placeholder="John"
                value={data.ownerFirstName}
                onChange={(e) => updateData({ ownerFirstName: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerLastName" className="text-sm font-medium">
                Last Name *
              </Label>
              <Input
                id="ownerLastName"
                placeholder="Smith"
                value={data.ownerLastName}
                onChange={(e) => updateData({ ownerLastName: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail" className="text-sm font-medium">
              Admin Email *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                placeholder="admin@restaurant.com"
                value={data.ownerEmail}
                onChange={(e) => updateData({ ownerEmail: e.target.value })}
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be your login email for the dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPassword" className="text-sm font-medium">
              Password *
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ownerPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={data.ownerPassword}
                  onChange={(e) =>
                    updateData({ ownerPassword: e.target.value })
                  }
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="h-11 px-4"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters with letters, numbers, and symbols
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
