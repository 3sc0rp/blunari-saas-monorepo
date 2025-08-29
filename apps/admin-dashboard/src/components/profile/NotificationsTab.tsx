import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NotificationPreferences } from '@/types/profile';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Monitor, 
  Clock, 
  Volume2,
  VolumeX,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationsTabProps {
  preferences: NotificationPreferences;
  onUpdate: (preferences: NotificationPreferences) => void;
}

export function NotificationsTab({ preferences, onUpdate }: NotificationsTabProps) {
  const [editedPreferences, setEditedPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onUpdate(editedPreferences);
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save notification preferences.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEmailNotification = (key: keyof typeof editedPreferences.emailNotifications, value: boolean) => {
    setEditedPreferences(prev => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [key]: value
      }
    }));
  };

  const updateSMSNotification = (key: keyof typeof editedPreferences.smsNotifications, value: boolean) => {
    setEditedPreferences(prev => ({
      ...prev,
      smsNotifications: {
        ...prev.smsNotifications,
        [key]: value
      }
    }));
  };

  const updateDashboardNotification = (key: keyof typeof editedPreferences.dashboardNotifications, value: boolean) => {
    setEditedPreferences(prev => ({
      ...prev,
      dashboardNotifications: {
        ...prev.dashboardNotifications,
        [key]: value
      }
    }));
  };

  const hasChanges = JSON.stringify(editedPreferences) !== JSON.stringify(preferences);

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="booking-confirmations">Booking Confirmations</Label>
                <p className="text-sm text-muted-foreground">Get notified when bookings are confirmed or modified</p>
              </div>
              <Switch
                id="booking-confirmations"
                checked={editedPreferences.emailNotifications.bookingConfirmations}
                onCheckedChange={(checked) => updateEmailNotification('bookingConfirmations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-alerts">System Alerts</Label>
                <p className="text-sm text-muted-foreground">Important system notifications and alerts</p>
              </div>
              <Switch
                id="system-alerts"
                checked={editedPreferences.emailNotifications.systemAlerts}
                onCheckedChange={(checked) => updateEmailNotification('systemAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-reports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">Weekly analytics and performance summaries</p>
              </div>
              <Switch
                id="weekly-reports"
                checked={editedPreferences.emailNotifications.weeklyReports}
                onCheckedChange={(checked) => updateEmailNotification('weeklyReports', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="security-alerts-email">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">Login attempts and security-related notifications</p>
              </div>
              <Switch
                id="security-alerts-email"
                checked={editedPreferences.emailNotifications.securityAlerts}
                onCheckedChange={(checked) => updateEmailNotification('securityAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="account-updates">Account Updates</Label>
                <p className="text-sm text-muted-foreground">Changes to your account or profile</p>
              </div>
              <Switch
                id="account-updates"
                checked={editedPreferences.emailNotifications.accountUpdates}
                onCheckedChange={(checked) => updateEmailNotification('accountUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="marketing-emails">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Product updates, tips, and promotional content</p>
              </div>
              <Switch
                id="marketing-emails"
                checked={editedPreferences.emailNotifications.marketingEmails}
                onCheckedChange={(checked) => updateEmailNotification('marketingEmails', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Receive important alerts via text message
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="urgent-alerts">Urgent Alerts</Label>
                <p className="text-sm text-muted-foreground">Critical system issues requiring immediate attention</p>
              </div>
              <Switch
                id="urgent-alerts"
                checked={editedPreferences.smsNotifications.urgentAlerts}
                onCheckedChange={(checked) => updateSMSNotification('urgentAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="booking-reminders">Booking Reminders</Label>
                <p className="text-sm text-muted-foreground">Reminders for upcoming reservations</p>
              </div>
              <Switch
                id="booking-reminders"
                checked={editedPreferences.smsNotifications.bookingReminders}
                onCheckedChange={(checked) => updateSMSNotification('bookingReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-downtime">System Downtime</Label>
                <p className="text-sm text-muted-foreground">Notifications about planned or unplanned downtime</p>
              </div>
              <Switch
                id="system-downtime"
                checked={editedPreferences.smsNotifications.systemDowntime}
                onCheckedChange={(checked) => updateSMSNotification('systemDowntime', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="security-alerts-sms">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">Suspicious login attempts and security breaches</p>
              </div>
              <Switch
                id="security-alerts-sms"
                checked={editedPreferences.smsNotifications.securityAlerts}
                onCheckedChange={(checked) => updateSMSNotification('securityAlerts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Dashboard Notifications
          </CardTitle>
          <CardDescription>
            Control how notifications appear in the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="real-time-updates">Real-time Updates</Label>
                <p className="text-sm text-muted-foreground">Show live updates as they happen</p>
              </div>
              <Switch
                id="real-time-updates"
                checked={editedPreferences.dashboardNotifications.realTimeUpdates}
                onCheckedChange={(checked) => updateDashboardNotification('realTimeUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-toasts">Toast Notifications</Label>
                <p className="text-sm text-muted-foreground">Show popup notifications in the corner</p>
              </div>
              <Switch
                id="show-toasts"
                checked={editedPreferences.dashboardNotifications.showToasts}
                onCheckedChange={(checked) => updateDashboardNotification('showToasts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sound-enabled">Sound Notifications</Label>
                <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
              </div>
              <div className="flex items-center gap-2">
                {editedPreferences.dashboardNotifications.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  id="sound-enabled"
                  checked={editedPreferences.dashboardNotifications.soundEnabled}
                  onCheckedChange={(checked) => updateDashboardNotification('soundEnabled', checked)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications when tab is not active</p>
              </div>
              <Switch
                id="desktop-notifications"
                checked={editedPreferences.dashboardNotifications.desktopNotifications}
                onCheckedChange={(checked) => updateDashboardNotification('desktopNotifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification Timing
          </CardTitle>
          <CardDescription>
            Control when and how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="frequency">Notification Frequency</Label>
              <Select 
                value={editedPreferences.frequency} 
                onValueChange={(value: typeof editedPreferences.frequency) => 
                  setEditedPreferences(prev => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editedPreferences.quietHours.enabled}
                  onCheckedChange={(checked) => 
                    setEditedPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: checked }
                    }))
                  }
                />
                <Label>Enable Quiet Hours</Label>
              </div>
              {editedPreferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start-time">From</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={editedPreferences.quietHours.startTime}
                      onChange={(e) => 
                        setEditedPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, startTime: e.target.value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">To</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={editedPreferences.quietHours.endTime}
                      onChange={(e) => 
                        setEditedPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, endTime: e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Summary</CardTitle>
          <CardDescription>
            Overview of your current notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Bell className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Email Notifications</p>
              <Badge variant="secondary">
                {Object.values(editedPreferences.emailNotifications).filter(Boolean).length} enabled
              </Badge>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="font-medium">SMS Notifications</p>
              <Badge variant="secondary">
                {Object.values(editedPreferences.smsNotifications).filter(Boolean).length} enabled
              </Badge>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Monitor className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">Dashboard Notifications</p>
              <Badge variant="secondary">
                {Object.values(editedPreferences.dashboardNotifications).filter(Boolean).length} enabled
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}
    </div>
  );
}