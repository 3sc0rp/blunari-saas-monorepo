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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { GlobalSettings, MaintenanceWindow } from "@/types/settings";
import {
  Settings,
  AlertTriangle,
  Clock,
  Save,
  TestTube,
  Shield,
  Calendar,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceModeManagerProps {
  settings: GlobalSettings;
  maintenanceWindows: MaintenanceWindow[];
  onUpdateSettings: (settings: GlobalSettings) => void;
  onScheduleMaintenance?: () => void;
}

export function MaintenanceModeManager({
  settings,
  maintenanceWindows,
  onUpdateSettings,
  onScheduleMaintenance,
}: MaintenanceModeManagerProps) {
  const [editedSettings, setEditedSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      onUpdateSettings(editedSettings);
      toast({
        title: "Settings Updated",
        description: "Maintenance mode settings have been saved.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to update maintenance settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestMaintenanceMode = async () => {
    setIsTestingMode(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
      toast({
        title: "Maintenance Mode Test",
        description:
          "Test completed. Check your monitoring dashboard for results.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test maintenance mode.",
        variant: "destructive",
      });
    } finally {
      setIsTestingMode(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    const newValue = !editedSettings.maintenanceMode;
    setEditedSettings((prev) => ({ ...prev, maintenanceMode: newValue }));

    // Auto-save maintenance mode changes
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onUpdateSettings({ ...editedSettings, maintenanceMode: newValue });

      toast({
        title: newValue
          ? "Maintenance Mode Enabled"
          : "Maintenance Mode Disabled",
        description: newValue
          ? "The platform is now in maintenance mode. Users will see the maintenance message."
          : "The platform is now operational. Normal access has been restored.",
        variant: newValue ? "destructive" : "default",
      });
    } catch (error) {
      // Revert if API call fails
      setEditedSettings((prev) => ({ ...prev, maintenanceMode: !newValue }));
      toast({
        title: "Failed to Toggle Maintenance Mode",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getMaintenanceStatus = (window: MaintenanceWindow) => {
    const now = new Date();
    const start = new Date(window.scheduledStart);
    const end = new Date(window.scheduledEnd);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "active";
    return "completed";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "in_progress":
      case "active":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "none":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "minimal":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "partial":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "full":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const upcomingWindows = maintenanceWindows.filter(
    (w) => getMaintenanceStatus(w) === "upcoming",
  );
  const activeWindows = maintenanceWindows.filter(
    (w) => getMaintenanceStatus(w) === "active",
  );

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Maintenance Mode Status
          </CardTitle>
          <CardDescription>
            Control platform-wide maintenance mode and user access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editedSettings.maintenanceMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Maintenance Mode is Active</strong> - All user access is
                restricted. Only administrators can access the platform.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <h3 className="font-medium">Platform Access Control</h3>
              <p className="text-sm text-muted-foreground">
                {editedSettings.maintenanceMode
                  ? "Platform is currently in maintenance mode"
                  : "Platform is operational and accessible to all users"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                className={
                  editedSettings.maintenanceMode
                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                }
              >
                {editedSettings.maintenanceMode ? "Maintenance" : "Operational"}
              </Badge>
              <Switch
                checked={editedSettings.maintenanceMode}
                onCheckedChange={toggleMaintenanceMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
              <Input
                id="maintenanceMessage"
                value={editedSettings.maintenanceMessage || ""}
                onChange={(e) =>
                  setEditedSettings((prev) => ({
                    ...prev,
                    maintenanceMessage: e.target.value,
                  }))
                }
                placeholder="Message displayed to users during maintenance"
                disabled={!editedSettings.maintenanceMode}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={handleTestMaintenanceMode}
                disabled={isTestingMode}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingMode ? "Testing..." : "Test Mode"}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Maintenance Windows */}
      {activeWindows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-5 w-5" />
              Active Maintenance Windows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeWindows.map((window) => (
                <div
                  key={window.id}
                  className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-medium">{window.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {window.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          {new Date(window.scheduledStart).toLocaleString()} -{" "}
                          {new Date(window.scheduledEnd).toLocaleString()}
                        </span>
                        <Badge className={getImpactColor(window.impact)}>
                          {window.impact} impact
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Contact: {window.contactPerson}
                      </div>
                    </div>
                    <Badge className={getStatusColor(window.status)}>
                      {window.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {window.affectedServices.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm font-medium">
                        Affected Services:{" "}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {window.affectedServices.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Maintenance Windows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Maintenance Windows
            </span>
            <Button onClick={onScheduleMaintenance}>
              Schedule Maintenance
            </Button>
          </CardTitle>
          <CardDescription>
            Upcoming scheduled maintenance windows and their impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingWindows.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No scheduled maintenance windows</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingWindows.map((window) => (
                <div
                  key={window.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-2">
                    <h3 className="font-medium">{window.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {window.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        {new Date(window.scheduledStart).toLocaleString()} -{" "}
                        {new Date(window.scheduledEnd).toLocaleString()}
                      </span>
                      <Badge className={getImpactColor(window.impact)}>
                        {window.impact} impact
                      </Badge>
                    </div>
                  </div>
                  <Badge className={getStatusColor(window.status)}>
                    {window.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">1,847</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">99.8%</div>
              <p className="text-sm text-muted-foreground">Uptime (30d)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">42</div>
              <p className="text-sm text-muted-foreground">Active Tenants</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2.3s</div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
