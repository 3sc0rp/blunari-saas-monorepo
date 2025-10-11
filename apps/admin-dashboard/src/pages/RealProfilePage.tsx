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

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  // Save profile changes
  const handleSave = async () => {
    if (!user?.id || !profile) return;

    try {
      setSaving(true);

      // Validate required fields
      if (!editedProfile.first_name?.trim()) {
        throw new Error("First name is required");
      }
      if (!editedProfile.last_name?.trim()) {
        throw new Error("Last name is required");
      }
      if (!editedProfile.email?.trim()) {
        throw new Error("Email is required");
      }

      // Validate email format
      if (!validateEmail(editedProfile.email)) {
        throw new Error("Please enter a valid email address");
      }

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
        console.log(`Email change detected: ${profile.email} → ${editedProfile.email}`);
        
        const { error: authError } = await supabase.auth.updateUser({
          email: editedProfile.email,
        });

        if (authError) {
          console.error("Email update failed:", authError);
          throw new Error(`Failed to update email: ${authError.message}`);
        }

        console.log("Email update request sent successfully. Verification emails sent.");
        
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

      // NOTE: We do NOT update the employees table here because:
      // 1. Admin dashboard employees table may not have an email column
      // 2. Email should be fetched from auth.users or profiles, not employees
      // 3. Updating employees could accidentally affect tenant data if wrong table
      // The email will be available via auth.users and profiles tables

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
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl" />
        
        <Card className="relative bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Avatar and Info */}
              <div className="flex items-start gap-6">
                {/* Avatar with Upload */}
                <div className="relative group shrink-0">
                  <Avatar className="h-28 w-28 ring-4 ring-slate-700/50 shadow-xl">
                    <AvatarImage 
                      src={avatarPreview || profile.avatar_url || undefined} 
                      alt={`${profile.first_name} ${profile.last_name}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Upload Overlay */}
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                  >
                    <Upload className="h-7 w-7 text-white mb-1" />
                    <span className="text-xs text-white font-medium">Upload</span>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  
                  {/* Online Status Indicator */}
                  <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-slate-800 shadow-lg" 
                       title="Online" />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100 mb-2">
                    {profile.first_name || "Admin"} {profile.last_name || "User"}
                  </h1>
                  <p className="text-slate-400 text-base mb-4 flex items-center gap-2">
                    <span className="truncate">{user?.email}</span>
                  </p>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${roleInfo.color} text-white border-0 px-3 py-1 shadow-lg`}>
                      <Shield className="h-3.5 w-3.5 mr-1.5" />
                      {roleInfo.label}
                    </Badge>
                    {employee && (
                      <Badge variant="outline" className="text-slate-300 border-slate-600 bg-slate-900/50 px-3 py-1">
                        <User className="h-3 w-3 mr-1" />
                        {employee.employee_id}
                      </Badge>
                    )}
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1">
                      <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                      Active
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {hasChanges && (
                <div className="flex gap-3 md:shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                    className="border-slate-600 hover:bg-slate-700 text-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20"
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
          </CardContent>
        </Card>
      </div>

      {/* Profile Form */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
          <TabsTrigger 
            value="personal" 
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white px-6"
          >
            <User className="h-4 w-4 mr-2" />
            Personal Information
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
            <CardHeader className="border-b border-slate-700 pb-6">
              <CardTitle className="text-2xl text-slate-100">Personal Information</CardTitle>
              <p className="text-slate-400 text-sm mt-2">
                Update your personal details and contact information
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-slate-200 font-medium">
                    First Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={editedProfile.first_name || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, first_name: e.target.value })
                    }
                    placeholder="Enter your first name"
                    className="bg-slate-900/50 border-slate-600 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-slate-200 font-medium">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={editedProfile.last_name || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, last_name: e.target.value })
                    }
                    placeholder="Enter your last name"
                    className="bg-slate-900/50 border-slate-600 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                  />
                </div>
              </div>

              {/* Email - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 font-medium">
                  Email Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editedProfile.email || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="bg-slate-900/50 border-slate-600 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                />
                <div className="flex items-start gap-2 mt-2">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Changing your email requires verification. You'll receive confirmation emails at both your old and new addresses.
                  </p>
                </div>
              </div>

              {/* Phone Number - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-200 font-medium">
                  Phone Number <span className="text-slate-500">(Optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editedProfile.phone || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="bg-slate-900/50 border-slate-600 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                />
              </div>

              {/* Avatar URL Display (Read-only for reference) */}
              {profile.avatar_url && (
                <div className="space-y-2 pt-4 border-t border-slate-700">
                  <Label className="text-slate-200 font-medium">Current Avatar URL</Label>
                  <div className="relative">
                    <Input
                      value={profile.avatar_url}
                      readOnly
                      className="bg-slate-900/30 border-slate-700 text-slate-400 text-xs pr-20 h-10"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1 h-8 text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        navigator.clipboard.writeText(profile.avatar_url!);
                        toast({
                          title: "Copied!",
                          description: "Avatar URL copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
