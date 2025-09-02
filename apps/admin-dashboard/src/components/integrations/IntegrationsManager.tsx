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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  MessageSquare,
  Cloud,
  Mail,
  Store,
  BarChart3,
  Settings,
  Plus,
  Check,
  X,
  Link,
  Key,
  Webhook,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Integration {
  id: string;
  name: string;
  type:
    | "payment"
    | "communication"
    | "infrastructure"
    | "analytics"
    | "pos"
    | "email";
  provider: string;
  status: "connected" | "disconnected" | "error" | "pending";
  description: string;
  icon: React.ElementType;
  features: string[];
  lastSync?: Date;
  config?: Record<string, any>;
  endpoints?: {
    webhooks: string[];
    api: string;
  };
}

const availableIntegrations: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    type: "payment",
    provider: "Stripe",
    status: "disconnected",
    description: "Payment processing and subscription management",
    icon: CreditCard,
    features: [
      "Payment Processing",
      "Subscriptions",
      "Invoicing",
      "Customer Portal",
    ],
    endpoints: {
      webhooks: ["/webhooks/stripe"],
      api: "https://api.stripe.com",
    },
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    type: "communication",
    provider: "Twilio",
    status: "disconnected",
    description: "SMS messaging and phone number management",
    icon: MessageSquare,
    features: ["SMS Notifications", "Phone Verification", "Two-Way Messaging"],
    endpoints: {
      webhooks: ["/webhooks/twilio"],
      api: "https://api.twilio.com",
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    type: "infrastructure",
    provider: "Cloudflare",
    status: "disconnected",
    description: "DNS, SSL, and CDN management",
    icon: Cloud,
    features: ["DNS Management", "SSL Certificates", "CDN", "DDoS Protection"],
    endpoints: {
      webhooks: ["/webhooks/cloudflare"],
      api: "https://api.cloudflare.com",
    },
  },
  {
    id: "resend",
    name: "Resend",
    type: "email",
    provider: "Resend",
    status: "disconnected",
    description: "Transactional email service",
    icon: Mail,
    features: [
      "Transactional Emails",
      "Email Templates",
      "Analytics",
      "Deliverability",
    ],
    endpoints: {
      webhooks: ["/webhooks/resend"],
      api: "https://api.resend.com",
    },
  },
  {
    id: "toast-pos",
    name: "Toast POS",
    type: "pos",
    provider: "Toast",
    status: "disconnected",
    description: "Restaurant POS system integration",
    icon: Store,
    features: ["Menu Sync", "Order Management", "Inventory", "Reporting"],
    endpoints: {
      webhooks: ["/webhooks/toast"],
      api: "https://ws-api.toasttab.com",
    },
  },
  {
    id: "square",
    name: "Square POS",
    type: "pos",
    provider: "Square",
    status: "disconnected",
    description: "Square POS system integration",
    icon: Store,
    features: ["Payment Processing", "Inventory Management", "Customer Data"],
    endpoints: {
      webhooks: ["/webhooks/square"],
      api: "https://connect.squareup.com",
    },
  },
  {
    id: "analytics",
    name: "Custom Analytics",
    type: "analytics",
    provider: "Platform",
    status: "connected",
    description: "Internal analytics and tracking system",
    icon: BarChart3,
    features: [
      "Event Tracking",
      "User Analytics",
      "Performance Metrics",
      "Custom Reports",
    ],
  },
];

export const IntegrationsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(
    availableIntegrations,
  );
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const getStatusBadge = (status: Integration["status"]) => {
    const statusConfig = {
      connected: {
        variant: "default" as const,
        text: "Connected",
        color: "bg-green-100 text-green-800",
      },
      disconnected: {
        variant: "secondary" as const,
        text: "Disconnected",
        color: "bg-gray-100 text-gray-800",
      },
      error: {
        variant: "destructive" as const,
        text: "Error",
        color: "bg-red-100 text-red-800",
      },
      pending: {
        variant: "outline" as const,
        text: "Pending",
        color: "bg-yellow-100 text-yellow-800",
      },
    };

    const config = statusConfig[status];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getTypeIcon = (type: Integration["type"]) => {
    const icons = {
      payment: CreditCard,
      communication: MessageSquare,
      infrastructure: Cloud,
      email: Mail,
      pos: Store,
      analytics: BarChart3,
    };
    const Icon = icons[type];
    return <Icon className="h-4 w-4" />;
  };

  const handleConnect = async (integration: Integration) => {
    setLoading((prev) => ({ ...prev, [integration.id]: true }));

    try {
      // Simulate connection process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integration.id
            ? { ...int, status: "connected" as const, lastSync: new Date() }
            : int,
        ),
      );

      toast({
        title: "Integration Connected",
        description: `Successfully connected to ${integration.name}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${integration.name}`,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [integration.id]: false }));
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    setLoading((prev) => ({ ...prev, [integration.id]: true }));

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integration.id
            ? { ...int, status: "disconnected" as const, lastSync: undefined }
            : int,
        ),
      );

      toast({
        title: "Integration Disconnected",
        description: `Disconnected from ${integration.name}`,
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: `Failed to disconnect from ${integration.name}`,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [integration.id]: false }));
    }
  };

  const handleTest = async (integration: Integration) => {
    setLoading((prev) => ({ ...prev, [`test-${integration.id}`]: true }));

    try {
      // Simulate test
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const testResult = {
        success: Math.random() > 0.2,
        timestamp: new Date(),
        responseTime: Math.floor(Math.random() * 500) + 100,
        details:
          integration.status === "connected"
            ? "Connection test successful"
            : "Service unavailable",
      };

      setTestResults((prev) => ({ ...prev, [integration.id]: testResult }));

      toast({
        title: testResult.success ? "Test Successful" : "Test Failed",
        description: testResult.details,
        variant: testResult.success ? "default" : "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [`test-${integration.id}`]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const integrationsByType = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.type]) acc[integration.type] = [];
      acc[integration.type].push(integration);
      return acc;
    },
    {} as Record<string, Integration[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground">
            Manage external service connections and API integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="pos">POS Systems</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(integrationsByType).map(
              ([type, typeIntegrations]) => (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getTypeIcon(type as Integration["type"])}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {
                          typeIntegrations.filter(
                            (i) => i.status === "connected",
                          ).length
                        }
                        /{typeIntegrations.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connected integrations
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Integrations</CardTitle>
              <CardDescription>
                View and manage all your external service integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <integration.icon className="h-5 w-5" />
                          <div>
                            <div className="font-medium">
                              {integration.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {integration.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {integration.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(integration.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {integration.lastSync?.toLocaleString() || "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {integration.status === "connected" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTest(integration)}
                                disabled={loading[`test-${integration.id}`]}
                              >
                                {loading[`test-${integration.id}`] ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Test"
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect(integration)}
                                disabled={loading[integration.id]}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(integration)}
                              disabled={loading[integration.id]}
                            >
                              {loading[integration.id] ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                "Connect"
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIntegration(integration);
                              setIsConfigDialogOpen(true);
                            }}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(integrationsByType).map(([type, typeIntegrations]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {typeIntegrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <integration.icon className="h-5 w-5" />
                        {integration.name}
                      </div>
                      {getStatusBadge(integration.status)}
                    </CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Features</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {integration.features.map((feature) => (
                          <Badge
                            key={feature}
                            variant="outline"
                            className="text-xs"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {integration.endpoints && (
                      <div>
                        <Label className="text-sm font-medium">Endpoints</Label>
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>API:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-muted-foreground">
                                {integration.endpoints.api}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(integration.endpoints!.api)
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {integration.endpoints.webhooks.map((webhook) => (
                            <div
                              key={webhook}
                              className="flex items-center justify-between text-xs"
                            >
                              <span>Webhook:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-muted-foreground">
                                  {webhook}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(webhook)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {testResults[integration.id] && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-1">
                          Last Test Result
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {testResults[integration.id].success ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <X className="h-3 w-3 text-red-600" />
                          )}
                          <span>{testResults[integration.id].details}</span>
                          <span className="text-muted-foreground">
                            ({testResults[integration.id].responseTime}ms)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {integration.status === "connected" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(integration)}
                            disabled={loading[`test-${integration.id}`]}
                            className="flex-1"
                          >
                            {loading[`test-${integration.id}`] ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              "Test Connection"
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDisconnect(integration)}
                            disabled={loading[integration.id]}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(integration)}
                          disabled={loading[integration.id]}
                          className="flex-1"
                        >
                          {loading[integration.id] ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && (
                <>
                  <selectedIntegration.icon className="h-5 w-5" />
                  Configure {selectedIntegration.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage settings and credentials for this integration
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret">API Secret</Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="Enter API secret"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook-url"
                    value={`${window.location.origin}${selectedIntegration.endpoints?.webhooks[0] || "/webhook"}`}
                    readOnly
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}${selectedIntegration.endpoints?.webhooks[0] || "/webhook"}`,
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings">Additional Settings</Label>
                <Textarea id="settings" placeholder="JSON configuration..." />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="auto-sync" />
                <Label htmlFor="auto-sync">
                  Enable automatic synchronization
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
