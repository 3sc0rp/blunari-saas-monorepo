import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Check,
  X,
  RefreshCw,
  Key,
  AlertTriangle,
  Shield,
  Calendar,
  Activity,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TenantUserManagementProps {
  tenantId: string;
}

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  user_metadata?: any;
}

interface TenantInfo {
  name: string;
  email: string;
  slug: string;
}

export function TenantUserManagement({ tenantId }: TenantUserManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  
  // Email editing
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  
  // Password editing
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "email" | "password" | null;
    title: string;
    description: string;
  }>({
    open: false,
    action: null,
    title: "",
    description: "",
  });

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Get tenant info
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("name, email, slug")
        .eq("id", tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenantInfo(tenant);

      // Get owner user ID from provisioning or tenant email
      let ownerUserId: string | null = null;

      // Try auto_provisioning first
      const { data: provisioning } = await supabase
        .from("auto_provisioning")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .maybeSingle();

      if (provisioning) {
        ownerUserId = provisioning.user_id;
      } else if (tenant.email) {
        // Fallback: get user by email using edge function
        const { data: userData, error: userError } = await supabase.functions.invoke(
          "get-user-by-email",
          {
            body: { email: tenant.email },
          }
        );

        if (!userError && userData?.user) {
          ownerUserId = userData.user.id;
        }
      }

      if (ownerUserId) {
        // Get user data from profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", ownerUserId)
          .single();

        if (!profileError && profile) {
          setUserData({
            id: profile.user_id,
            email: profile.email,
            created_at: profile.created_at,
            last_sign_in_at: profile.updated_at,
            email_confirmed_at: profile.created_at,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setGeneratedPassword(password);
    copyToClipboard(password, "Generated password");
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || !userData) return;

    // Check if email change will create a new user
    const emailChanged = newEmail !== userData.email;
    
    if (emailChanged && !confirmDialog.open) {
      // Show warning dialog before creating new account
      setConfirmDialog({
        open: true,
        action: "email",
        title: "⚠️ Email Change Creates New Account",
        description: `Changing the email to ${newEmail} will create a new tenant owner account with a generated password. You'll need to securely communicate the new credentials to the tenant owner. This operation cannot be undone. Continue?`,
      });
      return;
    }

    setUpdatingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-tenant-credentials",
        {
          body: {
            tenantId,
            action: "update_email",
            newEmail: newEmail,
          },
        }
      );

      // Check for errors in response
      if (error) {
        console.error("Edge Function error:", error);
        throw new Error(error.message || 'Failed to update email');
      }
      
      // Check if response data contains an error
      if (data?.error) {
        console.error("Edge Function returned error:", data);
        throw new Error(data.error);
      }

      // Show success with password if user was created
      if (data.userCreated && data.temporaryPassword) {
        toast({
          title: "✅ New Owner Account Created",
          description: (
            <div className="space-y-2">
              <p>Email updated to: {newEmail}</p>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-medium mb-1">Temporary Password:</p>
                <p className="font-mono text-sm break-all">{data.temporaryPassword}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(data.temporaryPassword, "Password")}
              >
                Copy Password
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Save this password securely before closing
              </p>
            </div>
          ),
          duration: 60000, // 60 seconds to copy password
        });
      } else {
        toast({
          title: "✅ Email Updated",
          description: `Email changed to ${newEmail}`,
        });
      }

      setUserData({ ...userData, email: newEmail });
      setIsEditingEmail(false);
      setNewEmail("");
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error("Error updating email:", error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !userData) return;

    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-tenant-credentials",
        {
          body: {
            tenantId,
            action: "update_password",
            newPassword: newPassword,
          },
        }
      );

      // Check for errors in response
      if (error) {
        throw new Error(error.message || 'Failed to update password');
      }
      
      // Check if response data contains an error
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setIsEditingPassword(false);
      setNewPassword("");
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const confirmEmailChange = () => {
    setConfirmDialog({
      open: true,
      action: "email",
      title: "Confirm Email Change",
      description: `Are you sure you want to change the login email from ${userData?.email} to ${newEmail}? The user will need to use this new email to log in.`,
    });
  };

  const confirmPasswordChange = () => {
    setConfirmDialog({
      open: true,
      action: "password",
      title: "Confirm Password Change",
      description: "Are you sure you want to change the password? The user will need to use the new password to log in. Make sure to share this password securely with the tenant owner.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading user data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            No User Account Found
          </CardTitle>
          <CardDescription>
            No user account is associated with this tenant yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Tenant Email: {tenantInfo?.email || "Not set"}
          </p>
          <p className="text-sm text-muted-foreground">
            The tenant owner needs to complete the account setup process to create their login credentials.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Account Overview
          </CardTitle>
          <CardDescription>
            Login credentials for {tenantInfo?.name} owner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">User ID</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={userData.id}
                  readOnly
                  className="bg-muted font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(userData.id, "User ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Account Created</Label>
              <Input
                value={new Date(userData.created_at).toLocaleString()}
                readOnly
                className="bg-muted"
              />
            </div>

            {userData.last_sign_in_at && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Last Sign In</Label>
                <Input
                  value={new Date(userData.last_sign_in_at).toLocaleString()}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email Status</Label>
              <div>
                <Badge variant={userData.email_confirmed_at ? "default" : "secondary"}>
                  {userData.email_confirmed_at ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Login Credentials
          </CardTitle>
          <CardDescription>
            Manage email and password for app.blunari.ai login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Management */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Login Email
            </Label>
            <div className="flex items-center gap-2">
              {isEditingEmail ? (
                <>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new.email@example.com"
                    className="flex-1"
                    type="email"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={confirmEmailChange}
                    disabled={updatingEmail || !newEmail || newEmail === userData.email}
                  >
                    {updatingEmail ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setNewEmail("");
                    }}
                    disabled={updatingEmail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    value={userData.email}
                    readOnly
                    className="bg-muted flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(userData.email, "Email")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewEmail(userData.email);
                      setIsEditingEmail(true);
                    }}
                    title="Change login email"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isEditingEmail
                ? "Enter the new email address the user will use to log in"
                : "Primary login email for app.blunari.ai"}
            </p>
          </div>

          {/* Password Management */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </Label>
            {isEditingPassword ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1"
                    type={showPassword ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={confirmPasswordChange}
                    disabled={updatingPassword || !newPassword || newPassword.length < 6}
                  >
                    {updatingPassword ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setNewPassword("");
                      setGeneratedPassword("");
                    }}
                    disabled={updatingPassword}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generatePassword}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Secure Password
                </Button>
                {generatedPassword && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Password generated and copied to clipboard. Make sure to save it securely and share it with the tenant owner.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value="••••••••••••"
                  readOnly
                  className="bg-muted flex-1"
                  type="password"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingPassword(true)}
                  title="Change password"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {isEditingPassword
                ? "Enter a new password (minimum 6 characters) or generate one"
                : "Click edit to set a new password for the user"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• All password changes take effect immediately</p>
            <p>• Users must use the new credentials to log in</p>
            <p>• Email changes will require email verification</p>
            <p>• Always share credentials securely with tenant owners</p>
            <p>• Consider using the "Send Password Reset" feature for better security</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.action === "email") {
                  handleEmailUpdate();
                } else if (confirmDialog.action === "password") {
                  handlePasswordUpdate();
                }
              }}
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
