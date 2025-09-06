import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Webhook,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Copy,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Send,
  Activity,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  deliveryAttempts: {
    total: number;
    successful: number;
    failed: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: "linear" | "exponential";
  };
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: "pending" | "success" | "failed" | "retrying";
  statusCode?: number;
  responseTime?: number;
  attemptCount: number;
  scheduledAt: Date;
  deliveredAt?: Date;
  error?: string;
}

const mockWebhooks: WebhookEndpoint[] = [
  {
    id: "1",
    name: "Stripe Payment Notifications",
    url: "https://api.example.com/webhooks/stripe",
    events: ["payment.succeeded", "payment.failed", "subscription.created"],
    secret: "whsec_1234567890abcdef",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
    deliveryAttempts: { total: 2847, successful: 2834, failed: 13 },
    retryPolicy: { maxRetries: 3, backoffStrategy: "exponential" },
  },
  {
    id: "2",
    name: "Booking Updates",
    url: "https://api.restaurant-system.com/notifications",
    events: ["booking.created", "booking.cancelled", "booking.confirmed"],
    secret: "whsec_abcdef1234567890",
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 30 * 60 * 1000),
    deliveryAttempts: { total: 1523, successful: 1518, failed: 5 },
    retryPolicy: { maxRetries: 5, backoffStrategy: "linear" },
  },
  {
    id: "3",
    name: "Analytics Sync",
    url: "https://analytics.example.com/webhook",
    events: ["user.created", "user.updated", "event.tracked"],
    secret: "whsec_analytics_secret",
    isActive: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 24 * 60 * 60 * 1000),
    deliveryAttempts: { total: 456, successful: 445, failed: 11 },
    retryPolicy: { maxRetries: 3, backoffStrategy: "exponential" },
  },
];

const mockDeliveries: WebhookDelivery[] = [
  {
    id: "1",
    webhookId: "1",
    event: "payment.succeeded",
    payload: { amount: 4999, currency: "usd", customer: "cus_123" },
    status: "success",
    statusCode: 200,
    responseTime: 145,
    attemptCount: 1,
    scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "2",
    webhookId: "2",
    event: "booking.created",
    payload: { bookingId: "book_456", restaurantId: "rest_789" },
    status: "failed",
    statusCode: 500,
    attemptCount: 3,
    scheduledAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    error: "Internal server error",
  },
  {
    id: "3",
    webhookId: "1",
    event: "subscription.created",
    payload: { subscriptionId: "sub_789", customerId: "cus_456" },
    status: "retrying",
    statusCode: 503,
    attemptCount: 2,
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000),
  },
];

const availableEvents = [
  "payment.succeeded",
  "payment.failed",
  "subscription.created",
  "subscription.cancelled",
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "user.created",
  "user.updated",
  "event.tracked",
  "tenant.created",
  "tenant.updated",
];

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(mockWebhooks);
  const [deliveries] = useState<WebhookDelivery[]>(mockDeliveries);
  const [selectedWebhook, setSelectedWebhook] =
    useState<WebhookEndpoint | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState<{
    name: string;
    url: string;
    events: string[];
    maxRetries: number;
    backoffStrategy: "linear" | "exponential";
  }>({
    name: "",
    url: "",
    events: [],
    maxRetries: 3,
    backoffStrategy: "exponential",
  });
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      success: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", icon: XCircle },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      retrying: { color: "bg-blue-100 text-blue-800", icon: RefreshCw },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const calculateSuccessRate = (
    attempts: WebhookEndpoint["deliveryAttempts"],
  ) => {
    if (attempts.total === 0) return 100;
    return Math.round((attempts.successful / attempts.total) * 100);
  };

  const createWebhook = () => {
    const webhook: WebhookEndpoint = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      secret: `whsec_${Math.random().toString(36).substr(2, 24)}`,
      isActive: true,
      createdAt: new Date(),
      deliveryAttempts: { total: 0, successful: 0, failed: 0 },
      retryPolicy: {
        maxRetries: newWebhook.maxRetries,
        backoffStrategy: newWebhook.backoffStrategy,
      },
    };

    setWebhooks((prev) => [...prev, webhook]);
    setNewWebhook({
      name: "",
      url: "",
      events: [],
      maxRetries: 3,
      backoffStrategy: "exponential",
    });
    setIsCreateDialogOpen(false);

    toast({
      title: "Webhook Created",
      description: "New webhook endpoint has been created successfully",
    });
  };

  const toggleWebhook = (webhookId: string) => {
    setWebhooks((prev) =>
      prev.map((webhook) =>
        webhook.id === webhookId
          ? { ...webhook, isActive: !webhook.isActive }
          : webhook,
      ),
    );

    const webhook = webhooks.find((w) => w.id === webhookId);
    toast({
      title: `Webhook ${webhook?.isActive ? "Disabled" : "Enabled"}`,
      description: `${webhook?.name} has been ${webhook?.isActive ? "disabled" : "enabled"}`,
    });
  };

  const deleteWebhook = (webhookId: string) => {
    setWebhooks((prev) => prev.filter((webhook) => webhook.id !== webhookId));
    toast({
      title: "Webhook Deleted",
      description: "Webhook endpoint has been removed",
      variant: "destructive",
    });
  };

  const testWebhook = async (webhook: WebhookEndpoint) => {
    toast({
      title: "Testing Webhook",
      description: "Sending test payload to webhook endpoint...",
    });

    // Simulate test
    setTimeout(() => {
      const success = Math.random() > 0.3;
      toast({
        title: success ? "Test Successful" : "Test Failed",
        description: success
          ? "Webhook endpoint responded successfully"
          : "Failed to deliver test payload",
        variant: success ? "default" : "destructive",
      });
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const retryDelivery = (deliveryId: string) => {
    toast({
      title: "Retrying Delivery",
      description: "Webhook delivery has been queued for retry",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">
            Manage webhook endpoints and delivery monitoring
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
              <DialogDescription>
                Set up a new webhook endpoint to receive real-time notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-name">Name</Label>
                  <Input
                    id="webhook-name"
                    placeholder="e.g., Payment Notifications"
                    value={newWebhook.name}
                    onChange={(e) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://api.example.com/webhooks"
                    value={newWebhook.url}
                    onChange={(e) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Events to Subscribe</Label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook((prev) => ({
                              ...prev,
                              events: [...prev.events, event],
                            }));
                          } else {
                            setNewWebhook((prev) => ({
                              ...prev,
                              events: prev.events.filter((e) => e !== event),
                            }));
                          }
                        }}
                      />
                      <span>{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Select
                    value={newWebhook.maxRetries.toString()}
                    onValueChange={(value) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        maxRetries: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Backoff Strategy</Label>
                  <Select
                    value={newWebhook.backoffStrategy}
                    onValueChange={(value) =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        backoffStrategy: value as "linear" | "exponential",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="exponential">Exponential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createWebhook}
                disabled={
                  !newWebhook.name ||
                  !newWebhook.url ||
                  newWebhook.events.length === 0
                }
              >
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhook Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Endpoints
          </CardTitle>
          <CardDescription>
            Manage your webhook endpoints and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{webhook.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {webhook.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate max-w-xs">
                        {webhook.url}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {webhook.events.length} events
                      <div className="text-xs text-muted-foreground">
                        {webhook.events.slice(0, 2).join(", ")}
                        {webhook.events.length > 2 && "..."}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {calculateSuccessRate(webhook.deliveryAttempts)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {webhook.deliveryAttempts.successful}/
                        {webhook.deliveryAttempts.total} successful
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => toggleWebhook(webhook.id)}
                      />
                      <span className="text-sm">
                        {webhook.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhook)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Deliveries
          </CardTitle>
          <CardDescription>
            Monitor webhook delivery attempts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => {
                const webhook = webhooks.find(
                  (w) => w.id === delivery.webhookId,
                );
                return (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{delivery.event}</div>
                    </TableCell>
                    <TableCell>{webhook?.name}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>
                      {delivery.statusCode && (
                        <div className="text-sm">
                          <div>Status: {delivery.statusCode}</div>
                          {delivery.responseTime && (
                            <div className="text-xs text-muted-foreground">
                              {delivery.responseTime}ms
                            </div>
                          )}
                        </div>
                      )}
                      {delivery.error && (
                        <div className="text-sm text-red-600">
                          {delivery.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {delivery.attemptCount} /{" "}
                        {webhook?.retryPolicy.maxRetries || 3}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {delivery.scheduledAt.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Show payload in modal
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {delivery.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryDelivery(delivery.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

