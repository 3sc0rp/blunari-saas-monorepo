import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Shield, Loader2, Upload, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface EmployeeData {
  role: string;
  employee_id: string;
  status: string;
}

export default function RealProfilePage() {
  const { user, adminRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Fetch profile and employee data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile(profileData);
          setEditedProfile(profileData);
        }

        // Fetch employee data
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("role, employee_id, status")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (empError) {
          console.warn("Employee fetch warning:", empError);
        } else if (empData) {
          setEmployee(empData);
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Avatar must be less than 2MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;

    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
      return null;
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!user?.id || !profile) return;

    try {
      setSaving(true);

      // Upload avatar if changed
      let avatarUrl = editedProfile.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // Check if email changed
      const emailChanged = editedProfile.email !== profile.email;

      // If email changed, update auth.users first
      if (emailChanged && editedProfile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: editedProfile.email,
        });

        if (authError) {
          throw new Error(`Failed to update email: ${authError.message}`);
        }

        toast({
          title: "Email Verification Required",
          description: "Please check both your old and new email for verification links",
          variant: "default",
        });
      }

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          email: editedProfile.email,
          first_name: editedProfile.first_name,
          last_name: editedProfile.last_name,
          phone: editedProfile.phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // If email changed, also update employees table
      if (emailChanged && editedProfile.email && employee) {
        const { error: empError } = await supabase
          .from("employees")
          .update({
            email: editedProfile.email,
          })
          .eq("user_id", user.id);

        if (empError) {
          console.warn("Failed to update employee email:", empError);
        }
      }

      // Update local state
      setProfile({
        ...profile,
        ...editedProfile,
        avatar_url: avatarUrl,
      });

      setAvatarFile(null);
      setAvatarPreview(null);

      toast({
        title: "Success",
        description: emailChanged 
          ? "Profile updated! Check your email to verify the new address."
          : "Profile updated successfully",
      });

      // Trigger a page reload to refresh header data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    if (profile) {
      setEditedProfile(profile);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const hasChanges = 
    JSON.stringify(editedProfile) !== JSON.stringify(profile) || 
    avatarFile !== null;

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : user?.email?.[0]?.toUpperCase() || "A";

  const roleConfig = {
    SUPER_ADMIN: { label: "Super Admin", color: "bg-red-500" },
    ADMIN: { label: "Admin", color: "bg-blue-500" },
    SUPPORT: { label: "Support", color: "bg-green-500" },
  };

  const currentRole = employee?.role || adminRole || "ADMIN";
  const roleInfo = roleConfig[currentRole as keyof typeof roleConfig] || roleConfig.ADMIN;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load profile data. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-4 ring-slate-700">
              <AvatarImage 
                src={avatarPreview || profile.avatar_url || undefined} 
                alt={`${profile.first_name} ${profile.last_name}`}
              />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Upload className="h-6 w-6 text-white" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-slate-400 mt-1">{user?.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className={`${roleInfo.color} text-white border-0`}>
                <Shield className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
              {employee && (
                <Badge variant="outline" className="text-slate-300 border-slate-600">
                  {employee.employee_id}
                </Badge>
              )}
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                Active
              </Badge>
            </div>
          </div>
        </div>

        {/* Save/Reset buttons */}
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Form */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="personal" className="data-[state=active]:bg-slate-700">
            <User className="h-4 w-4 mr-2" />
            Personal Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-slate-200">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  value={editedProfile.first_name || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, first_name: e.target.value })
                  }
                  placeholder="Enter your first name"
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-slate-200">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  value={editedProfile.last_name || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, last_name: e.target.value })
                  }
                  placeholder="Enter your last name"
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
              </div>

              {/* Email (Editable with verification) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editedProfile.email || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
                <p className="text-xs text-slate-500">
                  ⚠️ Changing your email requires verification. You'll receive emails at both old and new addresses.
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-200">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={editedProfile.phone || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
              </div>

              {/* Avatar URL (for reference) */}
              {profile.avatar_url && (
                <div className="space-y-2">
                  <Label className="text-slate-200">Current Avatar URL</Label>
                  <Input
                    value={profile.avatar_url}
                    disabled
                    className="bg-slate-900/50 border-slate-700 text-slate-400 text-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
