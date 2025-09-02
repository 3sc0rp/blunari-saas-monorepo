import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SecuritySettings, APIKey, TrustedDevice } from "@/types/profile";
import { APIKeyManager } from "@/components/security/APIKeyManager";
import { TwoFactorAuth } from "@/components/security/TwoFactorAuth";
import {
  Shield,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Phone,
  Tablet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityTabProps {
  securitySettings: SecuritySettings;
  apiKeys: APIKey[];
  onUpdateSecurity: (settings: SecuritySettings) => void;
  onUpdateAPIKeys: (keys: APIKey[]) => void;
}

export function SecurityTab({
  securitySettings,
  apiKeys,
  onUpdateSecurity,
  onUpdateAPIKeys,
}: SecurityTabProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onUpdateSecurity({
        ...securitySettings,
        passwordLastChanged: new Date().toISOString(),
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsEnabling2FA(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onUpdateSecurity({
        ...securitySettings,
        twoFactorEnabled: !securitySettings.twoFactorEnabled,
      });
      toast({
        title: securitySettings.twoFactorEnabled
          ? "2FA Disabled"
          : "2FA Enabled",
        description: securitySettings.twoFactorEnabled
          ? "Two-factor authentication has been disabled."
          : "Two-factor authentication has been enabled.",
      });
    } catch (error) {
      toast({
        title: "2FA Toggle Failed",
        description: "Failed to update two-factor authentication.",
        variant: "destructive",
      });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleRevokeAPIKey = (keyId: string) => {
    const updatedKeys = apiKeys.map((key) =>
      key.id === keyId ? { ...key, isActive: false } : key,
    );
    onUpdateAPIKeys(updatedKeys);
    toast({
      title: "API Key Revoked",
      description: "The API key has been deactivated.",
    });
  };

  const handleRemoveDevice = (deviceId: string) => {
    const updatedDevices = securitySettings.trustedDevices.filter(
      (d) => d.id !== deviceId,
    );
    onUpdateSecurity({
      ...securitySettings,
      trustedDevices: updatedDevices,
    });
    toast({
      title: "Device Removed",
      description: "The trusted device has been removed.",
    });
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) score += 12.5;
    return score;
  };

  const getDeviceIcon = (deviceType: TrustedDevice["deviceType"]) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="h-4 w-4" />;
      case "mobile":
        return <Phone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password & Authentication
          </CardTitle>
          <CardDescription>
            Manage your password and authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                />
                {passwordForm.newPassword && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Password Strength</span>
                      <span>{Math.round(passwordStrength)}%</span>
                    </div>
                    <Progress value={passwordStrength} className="h-2" />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={
                  isChangingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                className="w-full"
              >
                {isChangingPassword ? "Updating..." : "Change Password"}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Password Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character</li>
                </ul>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Last Password Change</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(
                    securitySettings.passwordLastChanged,
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">Authenticator App</h4>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app to generate verification codes
              </p>
            </div>
            <div className="flex items-center gap-3">
              {securitySettings.twoFactorEnabled && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              )}
              <Switch
                checked={securitySettings.twoFactorEnabled}
                onCheckedChange={handleToggle2FA}
                disabled={isEnabling2FA}
              />
            </div>
          </div>

          {securitySettings.twoFactorEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Backup Codes Available:</strong> You have{" "}
                {securitySettings.backupCodes.length} unused backup codes. Store
                them securely in case you lose access to your authenticator app.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Trusted Devices</CardTitle>
          <CardDescription>
            Manage devices that you've marked as trusted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securitySettings.trustedDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device.deviceType)}
                  <div>
                    <h4 className="font-medium">{device.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {device.browser} • {device.os} • {device.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last seen:{" "}
                      {new Date(device.lastSeen).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Security Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <APIKeyManager apiKeys={apiKeys} onUpdateAPIKeys={onUpdateAPIKeys} />
        <TwoFactorAuth
          isEnabled={securitySettings.twoFactorEnabled}
          backupCodes={securitySettings.backupCodes}
          onToggle2FA={(enabled) =>
            onUpdateSecurity({
              ...securitySettings,
              twoFactorEnabled: enabled,
            })
          }
          onRegenerateBackupCodes={(codes) =>
            onUpdateSecurity({
              ...securitySettings,
              backupCodes: codes,
            })
          }
        />
      </div>
    </div>
  );
}
