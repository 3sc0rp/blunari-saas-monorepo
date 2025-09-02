import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Bell, Monitor, Palette, Settings } from "lucide-react";

// Components
import { PersonalInfoTab } from "@/components/profile/PersonalInfoTab";
import { SecurityTab } from "@/components/profile/SecurityTab";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { SessionsTab } from "@/components/profile/SessionsTab";
import { ThemeTab } from "@/components/profile/ThemeTab";

// Data
import {
  mockUserProfile,
  mockSecuritySettings,
  mockNotificationPreferences,
  mockUserSessions,
  mockActivityLogs,
  mockThemePreferences,
  mockAPIKeys,
} from "@/data/mockProfileData";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [profile, setProfile] = useState(mockUserProfile);
  const [securitySettings, setSecuritySettings] =
    useState(mockSecuritySettings);
  const [notificationPreferences, setNotificationPreferences] = useState(
    mockNotificationPreferences,
  );
  const [userSessions, setUserSessions] = useState(mockUserSessions);
  const [themePreferences, setThemePreferences] =
    useState(mockThemePreferences);
  const [apiKeys, setAPIKeys] = useState(mockAPIKeys);
  const { toast } = useToast();

  const handleUpdateProfile = (updates: Partial<typeof profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleTerminateSession = (sessionId: string) => {
    setUserSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, isActive: false } : session,
      ),
    );
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={profile.avatar}
            alt={`${profile.firstName} ${profile.lastName}`}
          />
          <AvatarFallback className="text-xl">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-muted-foreground">{profile.jobTitle}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-success/10 text-success border-success/20">
              Active
            </Badge>
            {securitySettings.twoFactorEnabled && (
              <Badge variant="outline">2FA Enabled</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab profile={profile} onUpdate={handleUpdateProfile} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab
            securitySettings={securitySettings}
            apiKeys={apiKeys}
            onUpdateSecurity={setSecuritySettings}
            onUpdateAPIKeys={setAPIKeys}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab
            preferences={notificationPreferences}
            onUpdate={setNotificationPreferences}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab
            sessions={userSessions}
            activityLogs={mockActivityLogs}
            onTerminateSession={handleTerminateSession}
          />
        </TabsContent>

        <TabsContent value="theme">
          <ThemeTab
            preferences={themePreferences}
            onUpdate={setThemePreferences}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
