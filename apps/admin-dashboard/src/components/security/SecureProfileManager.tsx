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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, AlertTriangle, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SecureProfileManagerProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

export function SecureProfileManager({
  profile,
  onUpdate,
}: SecureProfileManagerProps) {
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if role is being changed - this should not be allowed
      if (editedProfile.role !== profile.role) {
        setShowRoleWarning(true);
        setIsSaving(false);
        return;
      }

      // Only allow safe profile updates - explicitly prevent role changes
      const allowedUpdates = {
        first_name: editedProfile.first_name,
        last_name: editedProfile.last_name,
        avatar_url: editedProfile.avatar_url,
        // SECURITY: Never allow role, email, or ID updates through this interface
      };

      // Validate no restricted fields have changed
      if (editedProfile.role !== profile.role) {
        setShowRoleWarning(true);
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(allowedUpdates)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Log the profile update
      await supabase.rpc("log_security_event", {
        p_event_type: "profile_updated",
        p_severity: "info",
        p_user_id: user?.id,
        p_event_data: { updated_fields: Object.keys(allowedUpdates) },
      });

      onUpdate(editedProfile);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    JSON.stringify({
      first_name: editedProfile.first_name,
      last_name: editedProfile.last_name,
      avatar_url: editedProfile.avatar_url,
    }) !==
    JSON.stringify({
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
    });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Profile Management
          </CardTitle>
          <CardDescription>
            Update your personal information securely
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Notice */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> Role and permission changes
              require administrative approval and cannot be modified through
              this interface.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editedProfile.first_name || ""}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editedProfile.last_name || ""}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={editedProfile.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email changes require verification through account settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Account Role</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {profile.role || "User"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Contact admin to change role
                  </span>
                </div>
              </div>

              <div>
                <Label>Account Status</Label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Active
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Last Updated</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Warning Dialog */}
      <Dialog open={showRoleWarning} onOpenChange={setShowRoleWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Role Change Detected
            </DialogTitle>
            <DialogDescription>
              Role changes are not permitted through the profile interface for
              security reasons.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Policy:</strong> Role and permission changes must
              be requested through proper administrative channels to maintain
              system security and audit compliance.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              onClick={() => {
                setEditedProfile(profile); // Reset changes
                setShowRoleWarning(false);
              }}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
