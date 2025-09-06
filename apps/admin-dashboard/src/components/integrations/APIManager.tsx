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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Key,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Shield,
  Code,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  usage: {
    total: number;
    today: number;
    limit: number;
  };
  status: "active" | "revoked" | "expired";
}

interface APIEndpoint {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  category: string;
  requiresAuth: boolean;
  rateLimit: number;
  usage: number;
  status: "active" | "deprecated" | "beta";
}

interface RateLimit {
  id: string;
  endpoint: string;
  limit: number;
  window: string;
  current: number;
  resetTime: Date;
}

const mockAPIKeys: APIKey[] = [
  {
    id: "1",
    name: "Production API Key",
    key: "pk_live_51H7...",
    permissions: ["read", "write", "admin"],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    usage: { total: 15420, today: 234, limit: 10000 },
    status: "active",
  },
  {
    id: "2",
    name: "Development API Key",
    key: "pk_test_51H7...",
    permissions: ["read", "write"],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 30 * 60 * 1000),
    usage: { total: 892, today: 45, limit: 1000 },
    status: "active",
  },
  {
    id: "3",
    name: "Mobile App Key",
    key: "pk_live_mobile...",
    permissions: ["read"],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usage: { total: 5234, today: 78, limit: 5000 },
    status: "active",
  },
];

const mockEndpoints: APIEndpoint[] = [
  {
    id: "1",
    path: "/api/v1/tenants",
    method: "GET",
    description: "List all tenants",
    category: "Tenants",
    requiresAuth: true,
    rateLimit: 100,
    usage: 1234,
    status: "active",
  },
  {
    id: "2",
    path: "/api/v1/tenants",
    method: "POST",
    description: "Create a new tenant",
    category: "Tenants",
    requiresAuth: true,
    rateLimit: 50,
    usage: 456,
    status: "active",
  },
  {
    id: "3",
    path: "/api/v1/bookings",
    method: "GET",
    description: "List bookings",
    category: "Bookings",
    requiresAuth: true,
    rateLimit: 200,
    usage: 2345,
    status: "active",
  },
  {
    id: "4",
    path: "/api/v1/analytics/metrics",
    method: "GET",
    description: "Get analytics metrics",
    category: "Analytics",
    requiresAuth: true,
    rateLimit: 100,
    usage: 567,
    status: "beta",
  },
  {
    id: "5",
    path: "/api/v1/webhooks",
    method: "POST",
    description: "Register webhook endpoint",
    category: "Webhooks",
    requiresAuth: true,
    rateLimit: 10,
    usage: 89,
    status: "active",
  },
];

const mockRateLimits: RateLimit[] = [
  {
    id: "1",
    endpoint: "/api/v1/tenants",
    limit: 100,
    window: "1 hour",
    current: 67,
    resetTime: new Date(Date.now() + 33 * 60 * 1000),
  },
  {
    id: "2",
    endpoint: "/api/v1/bookings",
    limit: 200,
    window: "1 hour",
    current: 145,
    resetTime: new Date(Date.now() + 15 * 60 * 1000),
  },
  {
    id: "3",
    endpoint: "/api/v1/analytics/*",
    limit: 50,
    window: "1 hour",
    current: 23,
    resetTime: new Date(Date.now() + 45 * 60 * 1000),
  },
];

export const APIManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>(mockAPIKeys);
  const [endpoints] = useState<APIEndpoint[]>(mockEndpoints);
  const [rateLimits] = useState<RateLimit[]>(mockRateLimits);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const createAPIKey = () => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      permissions: newKeyPermissions,
      createdAt: new Date(),
      usage: { total: 0, today: 0, limit: 1000 },
      status: "active",
    };

    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyName("");
    setNewKeyPermissions([]);
    setIsCreateDialogOpen(false);

    toast({
      title: "API Key Created",
      description: "New API key has been generated successfully",
    });
  };

  const revokeAPIKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === keyId ? { ...key, status: "revoked" as const } : key,
      ),
    );

    toast({
      title: "API Key Revoked",
      description: "The API key has been revoked and is no longer valid",
      variant: "destructive",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", text: "Active" },
      revoked: { color: "bg-red-100 text-red-800", text: "Revoked" },
      expired: { color: "bg-gray-100 text-gray-800", text: "Expired" },
      beta: { color: "bg-blue-100 text-blue-800", text: "Beta" },
      deprecated: {
        color: "bg-yellow-100 text-yellow-800",
        text: "Deprecated",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const methodColors = {
      GET: "bg-green-100 text-green-800",
      POST: "bg-blue-100 text-blue-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
      PATCH: "bg-purple-100 text-purple-800",
    };

    return (
      <Badge
        className={
          methodColors[method as keyof typeof methodColors] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {method}
      </Badge>
    );
  };

  const calculateUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const endpointsByCategory = endpoints.reduce(
    (acc, endpoint) => {
      if (!acc[endpoint.category]) acc[endpoint.category] = [];
      acc[endpoint.category].push(endpoint);
      return acc;
    },
    {} as Record<string, APIEndpoint[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Management</h2>
          <p className="text-muted-foreground">
            Manage API keys, endpoints, and rate limiting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            API Docs
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">API Keys</h3>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key with specific permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {["read", "write", "admin", "webhooks"].map(
                        (permission) => (
                          <label
                            key={permission}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              checked={newKeyPermissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyPermissions((prev) => [
                                    ...prev,
                                    permission,
                                  ]);
                                } else {
                                  setNewKeyPermissions((prev) =>
                                    prev.filter((p) => p !== permission),
                                  );
                                }
                              }}
                            />
                            <span className="text-sm capitalize">
                              {permission}
                            </span>
                          </label>
                        ),
                      )}
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
                    onClick={createAPIKey}
                    disabled={!newKeyName || newKeyPermissions.length === 0}
                  >
                    Create Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                        <CardDescription>
                          Created {apiKey.createdAt.toLocaleDateString()}
                          {apiKey.lastUsed &&
                            ` • Last used ${apiKey.lastUsed.toLocaleString()}`}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(apiKey.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showKey[apiKey.id] ? "text" : "password"}
                        value={apiKey.key}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {showKey[apiKey.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Permissions</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {apiKey.permissions.map((permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                            className="capitalize"
                          >
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Usage</Label>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between text-xs">
                          <span>Today: {apiKey.usage.today}</span>
                          <span>Total: {apiKey.usage.total}</span>
                        </div>
                        <Progress
                          value={calculateUsagePercentage(
                            apiKey.usage.today,
                            apiKey.usage.limit,
                          )}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>

                  {apiKey.expiresAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Expires {apiKey.expiresAt.toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeAPIKey(apiKey.id)}
                      disabled={apiKey.status === "revoked"}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Available API endpoints and their documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(endpointsByCategory).map(
                  ([category, categoryEndpoints]) => (
                    <div key={category}>
                      <h4 className="font-medium mb-3">{category}</h4>
                      <div className="space-y-2">
                        {categoryEndpoints.map((endpoint) => (
                          <div
                            key={endpoint.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {getMethodBadge(endpoint.method)}
                              <div>
                                <div className="font-mono text-sm">
                                  {endpoint.path}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {endpoint.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {endpoint.usage}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  requests
                                </div>
                              </div>
                              {endpoint.requiresAuth && (
                                <Shield className="h-4 w-4 text-green-600" />
                              )}
                              {getStatusBadge(endpoint.status)}
                              <Button variant="outline" size="sm">
                                <Code className="h-3 w-3 mr-1" />
                                Docs
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>
                Current rate limiting status for API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Current Usage</TableHead>
                    <TableHead>Reset Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateLimits.map((limit) => {
                    const percentage = calculateUsagePercentage(
                      limit.current,
                      limit.limit,
                    );
                    const isNearLimit = percentage > 80;

                    return (
                      <TableRow key={limit.id}>
                        <TableCell className="font-mono">
                          {limit.endpoint}
                        </TableCell>
                        <TableCell>{limit.limit}</TableCell>
                        <TableCell>{limit.window}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{limit.current}</span>
                              <span className="text-muted-foreground">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <Progress
                              value={percentage}
                              className={`h-2 ${isNearLimit ? "bg-red-100" : ""}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {limit.resetTime.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {isNearLimit ? (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Near Limit
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Requests Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,847</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  +23% from yesterday
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active API Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiKeys.filter((key) => key.status === "active").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {apiKeys.length} total keys
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0.3%</div>
                <div className="text-sm text-green-600">
                  Within normal range
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">145ms</div>
                <div className="text-sm text-green-600">
                  Excellent performance
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Usage by Endpoint</CardTitle>
              <CardDescription>
                Request volume for the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpoints.slice(0, 5).map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getMethodBadge(endpoint.method)}
                      <span className="font-mono text-sm">{endpoint.path}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">{endpoint.usage}</div>
                        <div className="text-xs text-muted-foreground">
                          requests
                        </div>
                      </div>
                      <div className="w-20">
                        <Progress
                          value={(endpoint.usage / 2500) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

