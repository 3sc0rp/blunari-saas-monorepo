import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Clock, Key, AlertTriangle } from 'lucide-react';
import { SecuritySettings as SecuritySettingsType } from '@/types/settings';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface SecuritySettingsProps {
  settings: SecuritySettingsType;
  onUpdate: (settings: Partial<SecuritySettingsType>) => void;
  isUpdating: boolean;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ 
  settings, 
  onUpdate, 
  isUpdating 
}) => {
  const form = useForm<SecuritySettingsType>({
    defaultValues: settings,
  });

  const onSubmit = (data: SecuritySettingsType) => {
    onUpdate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Two-Factor Authentication
              <Badge variant={form.watch('twoFactorAuth.enabled') ? 'default' : 'destructive'}>
                {form.watch('twoFactorAuth.enabled') ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="twoFactorAuth.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Two-Factor Authentication</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('twoFactorAuth.enabled') && (
              <FormField
                control={form.control}
                name="twoFactorAuth.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authentication Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select authentication method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="authenticator">Authenticator App</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!form.watch('twoFactorAuth.enabled') && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Two-factor authentication is disabled. Your account may be vulnerable.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="sessionTimeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Timeout (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="30" 
                      max="1440"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    Sessions will expire after this period of inactivity
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Password Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="passwordPolicy.minLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Password Length</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="6" 
                      max="32"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="passwordPolicy.requireUppercase"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Require Uppercase</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        At least one uppercase letter
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordPolicy.requireNumbers"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Require Numbers</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        At least one number
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordPolicy.requireSymbols"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Require Symbols</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        At least one special character
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="apiRateLimit.requestsPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requests Per Hour</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="100" 
                        max="10000"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Maximum API requests per hour
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiRateLimit.burstLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Burst Limit</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="10" 
                        max="1000"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Maximum burst requests per minute
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Login Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Login Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="loginAttempts.maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Login Attempts</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="3" 
                        max="10"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Account locks after this many failed attempts
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loginAttempts.lockoutDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lockout Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="5" 
                        max="1440"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      How long to lock account after failed attempts
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="auditLogging"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Audit Logging</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Log all security-related events
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SecuritySettings;