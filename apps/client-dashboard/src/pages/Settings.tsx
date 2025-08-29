import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Clock, 
  Plug, 
  Bell, 
  Shield, 
  Save,
  RefreshCw
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useTenant } from '@/hooks/useTenant';
import BrandingSettings from '@/components/settings/BrandingSettings';
import OperationalSettings from '@/components/settings/OperationalSettings';
import { toast } from '@/hooks/use-toast';

const Settings: React.FC = () => {
  const { tenant } = useTenant();
  const { settings, isLoading, updateBranding, updateOperational, isUpdating } = useSettings();
  const [activeTab, setActiveTab] = useState('branding');

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure your restaurant settings and preferences</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleQuickSave = () => {
    toast({
      title: "Settings Saved",
      description: "All settings have been saved successfully.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your restaurant settings and preferences</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleQuickSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Quick Save
          </Button>
        </div>
      </div>

      {/* Settings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setActiveTab('branding')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Branding</div>
                  <div className="text-sm text-muted-foreground">Colors, logo, domain</div>
                </div>
                <Badge variant={settings.branding.domainStatus === 'verified' ? 'default' : 'secondary'}>
                  {settings.branding.domainStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setActiveTab('operational')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Operations</div>
                  <div className="text-sm text-muted-foreground">Hours, tables, policies</div>
                </div>
                <Badge variant="outline">
                  {settings.operational.timezone.split('/')[1]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setActiveTab('integrations')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Plug className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Integrations</div>
                  <div className="text-sm text-muted-foreground">SMS, email, POS, analytics</div>
                </div>
                <Badge variant={Object.values(settings.integrations).some(i => i.enabled) ? 'default' : 'outline'}>
                  {Object.values(settings.integrations).filter(i => i.enabled).length} active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setActiveTab('notifications')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Notifications</div>
                  <div className="text-sm text-muted-foreground">Email, SMS, staff alerts</div>
                </div>
                <Badge variant={settings.notifications.email.confirmations ? 'default' : 'outline'}>
                  {settings.notifications.email.confirmations ? 'enabled' : 'disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setActiveTab('security')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Security</div>
                  <div className="text-sm text-muted-foreground">2FA, sessions, API limits</div>
                </div>
                <Badge variant={settings.security.twoFactorAuth.enabled ? 'default' : 'destructive'}>
                  {settings.security.twoFactorAuth.enabled ? '2FA enabled' : '2FA disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="cursor-pointer hover:shadow-medium transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Advanced</div>
                  <div className="text-sm text-muted-foreground">API keys, exports, logs</div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Operations</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <BrandingSettings
            settings={settings.branding}
            onUpdate={updateBranding}
            isUpdating={isUpdating}
          />
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <OperationalSettings
            settings={settings.operational}
            onUpdate={updateOperational}
            isUpdating={isUpdating}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-primary" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Integration Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Configure SMS, email, POS, and analytics integrations
                </p>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Notification Preferences</h3>
                <p className="text-muted-foreground mb-4">
                  Manage email, SMS, and staff notification settings
                </p>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Security Configuration</h3>
                <p className="text-muted-foreground mb-4">
                  Configure 2FA, session management, and API security
                </p>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Last Updated</div>
              <div className="text-xs text-muted-foreground">
                {new Date(settings.lastUpdated).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">Tenant</div>
              <div className="text-xs text-muted-foreground">
                {tenant?.name || 'Restaurant'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Settings;