import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Settings,
  RefreshCw,
  Key,
} from "lucide-react";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import { SendWelcomePackDialog } from "@/components/tenant/SendWelcomePackDialog";
import { SendCredentialsDialog } from "@/components/tenant/SendCredentialsDialog";
import { TenantFeaturesTab } from "@/components/admin/TenantFeaturesTab";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import type { TenantData } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getTenant, resendWelcomeEmail } = useAdminAPI();

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [resending, setResending] = useState(false);
  const [openWelcomeDialog, setOpenWelcomeDialog] = useState(false);
  const [openCredentialsDialog, setOpenCredentialsDialog] = useState(false);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(false);
  const [lastWelcomeJob, setLastWelcomeJob] = useState<
    | { id: string; status: string; created_at: string; updated_at?: string | null }
    | null
  >(null);
  const [emailHistory, setEmailHistory] = useState<
    Array<{
      id: string;
      job_type: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoadingPage(true);
      setError(null);
      const tenantData = await getTenant(tenantId);
      setTenant(tenantData);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load tenant",
      );
    } finally {
      setLoadingPage(false);
    }
  }, [tenantId, getTenant]);

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId, fetchTenant]);

  // Fetch email status + history
  const refreshEmailStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoadingEmailStatus(true);
      const { data, error } = await (supabase as any)
        .from("background_jobs")
        .select("id, job_type, status, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .in("job_type", ["WELCOME_EMAIL", "NOTIFICATION_EMAIL"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as Array<{
        id: string;
        job_type: string;
        status: string;
        created_at: string;
        updated_at: string | null;
      }>;
      setEmailHistory(
        list.map((r) => ({
          id: r.id,
          job_type: r.job_type,
          status: r.status,
          created_at: r.created_at,
        })),
      );
      const first = list[0] || null;
      setLastWelcomeJob(
        first
          ? {
              id: first.id,
              status: first.status,
              created_at: first.created_at,
              updated_at: first.updated_at,
            }
          : null,
      );
    } catch (e) {
      console.warn("Failed to fetch email history", e);
      setLastWelcomeJob(null);
      setEmailHistory([]);
    } finally {
      setLoadingEmailStatus(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refreshEmailStatus();
  }, [refreshEmailStatus]);

  const handleResendWelcomeEmail = async () => {
    if (!tenant) return;

    try {
      setResending(true);
      const { jobId, message, email } = await resendWelcomeEmail({
        id: tenant.id,
        slug: tenant.slug,
      });
      const sent = email?.success === true;
      const title = sent ? "Sent" : "Queued";
      const desc = sent
        ? email?.message || "Welcome email sent"
        : message ||
          email?.warning ||
          email?.error ||
          (jobId
            ? `Job ${jobId}`
            : "Welcome email has been queued for delivery.");
      toast({ title, description: desc });
    } catch (error) {
      console.error("Error resending welcome email:", error);
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (loadingPage) {
    return (
      <LoadingState
        title="Loading Tenant"
        description="Fetching tenant details and configuration"
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <ErrorState title="Failed to Load Tenant" description={error} />
        <Button onClick={fetchTenant} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <ErrorState
          title="Tenant Not Found"
          description="The requested tenant could not be found"
        />
        <Button onClick={() => navigate("/admin/tenants")} variant="outline">
          Back to Tenants
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="default"
            className="bg-success/10 text-success border-success/20"
          >
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge
            variant="secondary"
            className="bg-muted/50 text-muted-foreground"
          >
            Inactive
          </Badge>
        );
      case "suspended":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/10 text-destructive border-destructive/20"
          >
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/tenants")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {tenant.name}
              </h1>
              <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
            </div>
            {getStatusBadge(tenant.status)}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenWelcomeDialog(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Welcome Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenCredentialsDialog(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            Send Credentials
          </Button>
        </div>
      </div>

      {/* Last email status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="h-4 w-4" />
        {loadingEmailStatus ? (
          <span>Checking welcome email status…</span>
        ) : lastWelcomeJob ? (
          <span>
            Welcome email: <span className="font-medium">{lastWelcomeJob.status}</span>
            {" "}• {new Date(lastWelcomeJob.created_at).toLocaleString()}
          </span>
        ) : (
          <span>Welcome email: Never sent</span>
        )}
        <Button
          variant="link"
          size="sm"
          className="px-1"
          onClick={() => navigate("/admin/operations")}
        >
          View Jobs
        </Button>
        <Button
          variant="link"
          size="sm"
          className="px-1"
          onClick={refreshEmailStatus}
        >
          Reload
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Domains</p>
                <p className="text-2xl font-bold">{tenant.domainsCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">
                  {tenant.analytics?.total_bookings || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold">
                  {tenant.analytics?.active_tables || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Details */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>
            Basic tenant configuration and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Restaurant Name
              </label>
              <p className="text-foreground">{tenant.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Slug
              </label>
              <p className="font-mono text-sm">/{tenant.slug}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Timezone
              </label>
              <p className="text-foreground">{tenant.timezone}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Currency
              </label>
              <p className="text-foreground">{tenant.currency}</p>
            </div>

            {tenant.email && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{tenant.email}</p>
                </div>
              </div>
            )}

            {tenant.phone && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Phone
                </label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{tenant.phone}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Created
              </label>
              <p className="text-foreground">
                {tenant.created_at
                  ? new Date(tenant.created_at).toLocaleString()
                  : "-"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Last Updated
              </label>
              <p className="text-foreground">
                {tenant.updated_at
                  ? new Date(tenant.updated_at).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>

          {tenant.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <p className="text-foreground">{tenant.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <TenantFeaturesTab tenantSlug={tenant.slug} />
        </TabsContent>

        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Domain Management</CardTitle>
              <CardDescription>
                Manage custom domains and DNS configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Domain management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                Performance metrics and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics dashboard coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Welcome Email Dialog */}
      <SendWelcomePackDialog
        open={openWelcomeDialog}
        onOpenChange={setOpenWelcomeDialog}
        tenantName={tenant.name}
        defaultEmail={tenant.email || null}
        onSent={refreshEmailStatus}
      />
      <SendCredentialsDialog
        open={openCredentialsDialog}
        onOpenChange={setOpenCredentialsDialog}
        tenantName={tenant.name}
        defaultEmail={tenant.email || null}
        onSent={refreshEmailStatus}
      />

      {/* Email History */}
      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
          <CardDescription>Last 10 welcome-related jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEmailStatus ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : emailHistory.length === 0 ? (
            <p className="text-muted-foreground">No email jobs yet.</p>
          ) : (
            <ul className="space-y-2">
              {emailHistory.map((j) => (
                <li key={j.id} className="flex items-center justify-between">
                  <span className="font-mono text-xs">{j.id.slice(0, 8)}</span>
                  <span className="text-sm">{j.job_type}</span>
                  <span className="text-sm font-medium">{j.status}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(j.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
