import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Mail,
  CreditCard,
  BarChart3,
  Webhook,
  Settings as SettingsIcon,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Plug,
} from "lucide-react";
import { IntegrationSettings as IntegrationSettingsType } from "@/types/settings";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface IntegrationSettingsProps {
  settings: IntegrationSettingsType;
  onUpdate: (settings: Partial<IntegrationSettingsType>) => void;
  isUpdating: boolean;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  settings,
  onUpdate,
  isUpdating,
}) => {
  const form = useForm<IntegrationSettingsType>({
    defaultValues: settings,
  });

  const onSubmit = (data: IntegrationSettingsType) => {
    onUpdate(data);
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <AlertCircle className="h-4 w-4 text-muted-foreground" />
    );
  };

  const getStatusBadge = (enabled: boolean) => {
    return (
      <Badge variant={enabled ? "default" : "outline"}>
        {enabled ? "Connected" : "Disconnected"}
      </Badge>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* SMS Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                SMS Integration
              </div>
              {getStatusBadge(form.watch("sms.enabled"))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="sms.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Enable SMS Notifications</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Send booking confirmations and reminders via SMS
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("sms.enabled") && (
              <FormField
                control={form.control}
                name="sms.provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select SMS provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="messagebird">MessageBird</SelectItem>
                        <SelectItem value="aws-sns">AWS SNS</SelectItem>
                        <SelectItem value="vonage">Vonage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon(form.watch("sms.enabled"))}
              <span>
                {form.watch("sms.enabled")
                  ? "SMS integration is active and ready to send messages"
                  : "SMS integration is disabled"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Email Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Integration
              </div>
              {getStatusBadge(form.watch("email.enabled"))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Email Notifications</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Send booking confirmations and marketing emails
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("email.enabled") && (
              <FormField
                control={form.control}
                name="email.provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                        <SelectItem value="aws-ses">AWS SES</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon(form.watch("email.enabled"))}
              <span>
                {form.watch("email.enabled")
                  ? "Email integration is active and ready to send emails"
                  : "Email integration is disabled"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* POS Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                POS Integration
              </div>
              {getStatusBadge(form.watch("pos.enabled"))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pos.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Enable POS Integration</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Sync bookings with your point-of-sale system
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("pos.enabled") && (
              <FormField
                control={form.control}
                name="pos.provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POS Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select POS provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="toast">Toast</SelectItem>
                        <SelectItem value="resy">Resy</SelectItem>
                        <SelectItem value="opentable">OpenTable</SelectItem>
                        <SelectItem value="aloha">Aloha</SelectItem>
                        <SelectItem value="micros">Oracle Micros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon(form.watch("pos.enabled"))}
              <span>
                {form.watch("pos.enabled")
                  ? "POS integration is active and syncing data"
                  : "POS integration is disabled"}
              </span>
            </div>

            {form.watch("pos.enabled") && (
              <div className="space-y-2">
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sync Settings</span>
                  <Button variant="outline" size="sm">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Configure menu sync, table mapping, and reservation flow
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics Integration
              </div>
              {getStatusBadge(form.watch("analytics.enabled"))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="analytics.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Advanced Analytics</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Track detailed metrics and customer insights
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon(form.watch("analytics.enabled"))}
              <span>
                {form.watch("analytics.enabled")
                  ? "Analytics tracking is active"
                  : "Analytics tracking is disabled"}
              </span>
            </div>

            {form.watch("analytics.enabled") && (
              <div className="space-y-2">
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">
                        Customer Journey Tracking
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Track customer behavior and preferences
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">
                        Revenue Analytics
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Monitor revenue trends and forecasting
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Configure webhooks to receive real-time notifications about
              booking events
            </div>

            <div className="space-y-3">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-app.com/webhook/bookings"
                type="url"
              />
              <div className="text-sm text-muted-foreground">
                We'll send POST requests to this URL for booking events
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Events to Send</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "booking.created",
                  "booking.cancelled",
                  "booking.confirmed",
                  "booking.completed",
                  "booking.no_show",
                  "customer.created",
                ].map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <Switch id={event} />
                    <Label htmlFor={event} className="text-sm font-mono">
                      {event}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm">
                Test Webhook
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Integration Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default IntegrationSettings;
