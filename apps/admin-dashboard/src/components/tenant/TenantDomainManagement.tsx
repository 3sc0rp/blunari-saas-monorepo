import { useState } from "react";
import {
  Plus,
  Globe,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Domain {
  id: string;
  domain: string;
  domain_type: "custom" | "subdomain";
  status: "pending" | "active" | "error" | "suspended";
  ssl_status: "pending" | "active" | "failed" | "expired";
  ssl_expires_at: string | null;
  verification_status: string;
  is_primary: boolean;
  created_at: string;
  tenant_id: string;
  metadata: any;
}

interface DomainHealthCheck {
  id: string;
  status: string;
  response_time_ms: number;
  ssl_days_remaining: number | null;
  created_at: string;
  error_message: string | null;
}

interface DomainAnalytics {
  requests_count: number;
  unique_visitors: number;
  bandwidth_bytes: number;
  cache_hit_rate: number;
  error_rate: number;
  date: string;
}

// Helper functions
const calculateSSLDaysRemaining = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const expirationDate = new Date(expiresAt);
  const today = new Date();
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getStatusBadge = (status: string) => {
  const variants = {
    active: "default",
    pending: "secondary",
    error: "destructive",
    suspended: "outline",
  } as const;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"}>
      {status}
    </Badge>
  );
};

const getSSLStatusBadge = (sslStatus: string) => {
  const variants = {
    active: "default",
    pending: "secondary",
    failed: "destructive",
    expired: "destructive",
  } as const;

  return (
    <Badge variant={variants[sslStatus as keyof typeof variants] || "outline"}>
      {sslStatus}
    </Badge>
  );
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface TenantDomainManagementProps {
  tenantId: string;
}

export function TenantDomainManagement({
  tenantId,
}: TenantDomainManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  // Fetch domains for this tenant
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["tenant-domains", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domains")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Domain[];
    },
  });

  // Fetch domain health for selected domain
  const { data: healthChecks = [] } = useQuery({
    queryKey: ["tenant-domain-health", selectedDomain?.id],
    queryFn: async () => {
      if (!selectedDomain) return [];
      const { data, error } = await supabase
        .from("domain_health_checks")
        .select("*")
        .eq("domain_id", selectedDomain.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as DomainHealthCheck[];
    },
    enabled: !!selectedDomain,
  });

  // Fetch domain analytics for selected domain
  const { data: analytics = [] } = useQuery({
    queryKey: ["tenant-domain-analytics", selectedDomain?.id],
    queryFn: async () => {
      if (!selectedDomain) return [];
      const { data, error } = await supabase
        .from("domain_analytics")
        .select("*")
        .eq("domain_id", selectedDomain.id)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as DomainAnalytics[];
    },
    enabled: !!selectedDomain,
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (domainData: { domain: string; domain_type: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "domain-management",
        {
          body: {
            action: "add_domain",
            tenant_id: tenantId,
            ...domainData,
          },
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Domain added successfully" });
      queryClient.invalidateQueries({ queryKey: ["tenant-domains", tenantId] });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "domain-management",
        {
          body: {
            action: "verify_domain",
            domain_id: domainId,
          },
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Domain verification checked" });
      queryClient.invalidateQueries({ queryKey: ["tenant-domains", tenantId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to verify domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check domain health mutation
  const checkHealthMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "domain-management",
        {
          body: {
            action: "check_domain_health",
            domain_id: domainId,
          },
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Health check completed" });
      queryClient.invalidateQueries({ queryKey: ["tenant-domain-health"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Domain Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom domains and SSL certificates for this tenant
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
              <DialogDescription>
                Add a new custom domain for this tenant's booking pages
              </DialogDescription>
            </DialogHeader>
            <AddDomainForm
              onSubmit={(data) => addDomainMutation.mutate(data)}
              isLoading={addDomainMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Domain Overview Cards - Only show if loading or have data */}
      {(isLoading || domains.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Domains
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-2xl font-bold animate-pulse">-</div>
              ) : (
                <div className="text-2xl font-bold">{domains.length}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${domains.filter((d) => d.status === "active").length} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                SSL Certificates
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-2xl font-bold animate-pulse">-</div>
              ) : (
                <div className="text-2xl font-bold">
                  {domains.filter((d) => d.ssl_status === "active").length}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : "Active SSL certificates"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Health Status
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-2xl font-bold animate-pulse">-</div>
              ) : (
                <div className="text-2xl font-bold text-success">
                  {domains.length > 0
                    ? Math.round(
                        (domains.filter((d) => d.status === "active").length /
                          domains.length) *
                          100,
                      )
                    : 0}
                  %
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : "Domains healthy"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expiring Soon
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-2xl font-bold animate-pulse">-</div>
              ) : (
                <div className="text-2xl font-bold text-warning">
                  {
                    domains.filter((d) => {
                      const daysRemaining = calculateSSLDaysRemaining(
                        d.ssl_expires_at,
                      );
                      return daysRemaining !== null && daysRemaining < 30;
                    }).length
                  }
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : "SSL certs expiring in 30 days"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no domains and not loading */}
      {!isLoading && domains.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No domains configured
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              This tenant hasn't added any custom domains yet. Add a domain to
              get started with custom branding.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="health">Health Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="dns">DNS Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain List</CardTitle>
              <CardDescription>
                Manage custom domains and SSL certificates for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainTable
                domains={domains}
                isLoading={isLoading}
                onVerify={(id) => verifyDomainMutation.mutate(id)}
                onCheckHealth={(id) => checkHealthMutation.mutate(id)}
                onSelect={setSelectedDomain}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Health Monitoring</CardTitle>
              <CardDescription>
                Real-time health status and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HealthMonitoring
                domains={domains}
                healthChecks={healthChecks}
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Analytics</CardTitle>
              <CardDescription>
                Traffic, performance, and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainAnalytics
                analytics={analytics}
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
                domains={domains}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DNS Setup Instructions</CardTitle>
              <CardDescription>
                Configure DNS records at your domain registrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DNSInstructions
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
                domains={domains}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddDomainForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { domain: string; domain_type: string }) => void;
  isLoading: boolean;
}) {
  const [domain, setDomain] = useState("");
  const [domainType, setDomainType] = useState("custom");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ domain, domain_type: domainType });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="domain">Domain Name</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain-type">Domain Type</Label>
        <Select value={domainType} onValueChange={setDomainType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Domain</SelectItem>
            <SelectItem value="subdomain">Subdomain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Adding..." : "Add Domain"}
      </Button>
    </form>
  );
}

function DomainTable({
  domains,
  isLoading,
  onVerify,
  onCheckHealth,
  onSelect,
}: {
  domains: Domain[];
  isLoading: boolean;
  onVerify: (id: string) => void;
  onCheckHealth: (id: string) => void;
  onSelect: (domain: Domain) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-4">Loading domains...</div>;
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No domains configured</h3>
        <p className="text-muted-foreground">
          Add a custom domain to get started
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>SSL Status</TableHead>
          <TableHead>SSL Expires</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {domains.map((domain) => {
          const sslDaysRemaining = calculateSSLDaysRemaining(
            domain.ssl_expires_at,
          );

          return (
            <TableRow key={domain.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <span>{domain.domain}</span>
                  {domain.is_primary && (
                    <Badge variant="outline">Primary</Badge>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell className="capitalize">{domain.domain_type}</TableCell>
              <TableCell>{getStatusBadge(domain.status)}</TableCell>
              <TableCell>{getSSLStatusBadge(domain.ssl_status)}</TableCell>
              <TableCell>
                {sslDaysRemaining !== null ? (
                  <span className={sslDaysRemaining < 30 ? "text-warning" : ""}>
                    {sslDaysRemaining} days
                  </span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVerify(domain.id)}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCheckHealth(domain.id)}
                  >
                    Check Health
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(domain)}
                  >
                    Details
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function HealthMonitoring({
  domains,
  healthChecks,
  selectedDomain,
  onSelectDomain,
}: {
  domains: Domain[];
  healthChecks: DomainHealthCheck[];
  selectedDomain: Domain | null;
  onSelectDomain: (domain: Domain) => void;
}) {
  return (
    <div className="space-y-4">
      {!selectedDomain ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Select a domain</h3>
          <p className="text-muted-foreground">
            Choose a domain to view its health monitoring data
          </p>
          <div className="mt-4 space-y-2">
            {domains.map((domain) => (
              <Button
                key={domain.id}
                variant="outline"
                onClick={() => onSelectDomain(domain)}
                className="w-full"
              >
                {domain.domain}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">{selectedDomain.domain}</h4>
            <Button
              variant="outline"
              onClick={() => onSelectDomain(selectedDomain)}
            >
              Refresh
            </Button>
          </div>

          {healthChecks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No health check data available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {healthChecks.map((check) => (
                <Card key={check.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {check.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">Health Check</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(check.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Response Time
                        </span>
                        <p className="font-medium">
                          {check.response_time_ms}ms
                        </p>
                      </div>
                      {check.ssl_days_remaining && (
                        <div>
                          <span className="text-sm text-muted-foreground">
                            SSL Days Remaining
                          </span>
                          <p className="font-medium">
                            {check.ssl_days_remaining} days
                          </p>
                        </div>
                      )}
                    </div>
                    {check.error_message && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">
                          Error
                        </span>
                        <p className="text-destructive text-sm">
                          {check.error_message}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DomainAnalytics({
  analytics,
  selectedDomain,
  onSelectDomain,
  domains,
}: {
  analytics: DomainAnalytics[];
  selectedDomain: Domain | null;
  onSelectDomain: (domain: Domain) => void;
  domains: Domain[];
}) {
  return (
    <div className="space-y-4">
      {!selectedDomain ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Select a domain</h3>
          <p className="text-muted-foreground">
            Choose a domain to view its analytics data
          </p>
          <div className="mt-4 space-y-2">
            {domains.map((domain) => (
              <Button
                key={domain.id}
                variant="outline"
                onClick={() => onSelectDomain(domain)}
                className="w-full"
              >
                {domain.domain}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">
              {selectedDomain.domain} Analytics
            </h4>
          </div>

          {analytics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No analytics data available
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {analytics.slice(0, 1).map((data) => (
                <div key={data.date} className="contents">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.requests_count.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Unique Visitors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.unique_visitors.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Bandwidth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatBytes(data.bandwidth_bytes)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Cache Hit Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(data.cache_hit_rate * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DNSInstructions({
  selectedDomain,
  onSelectDomain,
  domains,
}: {
  selectedDomain: Domain | null;
  onSelectDomain: (domain: Domain) => void;
  domains: Domain[];
}) {
  return (
    <div className="space-y-4">
      {!selectedDomain ? (
        <div className="text-center py-8">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Select a domain</h3>
          <p className="text-muted-foreground">
            Choose a domain to see DNS setup instructions
          </p>
          <div className="mt-4 space-y-2">
            {domains.map((domain) => (
              <Button
                key={domain.id}
                variant="outline"
                onClick={() => onSelectDomain(domain)}
                className="w-full"
              >
                {domain.domain}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-2">
              DNS Setup for {selectedDomain.domain}
            </h4>
            <p className="text-muted-foreground">
              Add these DNS records at your domain registrar to point your
              domain to our servers.
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">A Record (Required)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Type:</strong> A
                  </div>
                  <div>
                    <strong>Name:</strong> @
                  </div>
                  <div>
                    <strong>Value:</strong> 185.158.133.1
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  CNAME Record (Optional - for www)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Type:</strong> CNAME
                  </div>
                  <div>
                    <strong>Name:</strong> www
                  </div>
                  <div>
                    <strong>Value:</strong> {selectedDomain.domain}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h5 className="font-semibold mb-2">Important Notes:</h5>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• DNS changes can take up to 24-48 hours to propagate</li>
              <li>
                • SSL certificates will be automatically provisioned after
                verification
              </li>
              <li>
                • Remove any conflicting A or CNAME records pointing elsewhere
              </li>
              <li>
                • Contact support if you need assistance with DNS configuration
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
