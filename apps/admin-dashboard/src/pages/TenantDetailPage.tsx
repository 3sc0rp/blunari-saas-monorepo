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
  Activity,
  RefreshCw,
  Key,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Trash2,
} from "lucide-react";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import { SendCredentialsDialog } from "@/components/tenant/SendCredentialsDialog";
import { TenantFeaturesTab } from "@/components/admin/TenantFeaturesTab";
import { TenantBillingTab } from "@/components/tenant/TenantBillingTab";
import { TenantApiKeysPanel } from "@/components/tenant/TenantApiKeysPanel";
import { TenantOperationsPanel } from "@/components/tenant/TenantOperationsPanel";
import { TenantSecurityExtended } from "@/components/tenant/TenantSecurityExtended";
import { TenantUserManagement } from "@/components/tenant/TenantUserManagement";
import { EditableTenantInfo } from "@/components/tenant/EditableTenantInfo";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import type { TenantData } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getTenant, resendWelcomeEmail, issuePasswordSetupLink } = useAdminAPI();
  const [sendingSetupEmail, setSendingSetupEmail] = useState(false);
  const [lastSetupRequest, setLastSetupRequest] = useState<null | { mode: string; requestId: string; at: number }>(null);
  const [passwordSetupRate, setPasswordSetupRate] = useState<null | { remaining: number; tenantRemaining: number; adminRemaining: number; limited: boolean }>(null);

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [resending, setResending] = useState(false);
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
  const [issuingRecovery, setIssuingRecovery] = useState(false);
  const [recoveryData, setRecoveryData] = useState<null | { ownerEmail: string; recoveryLink: string; requestId: string; message: string; deprecatedActionUsed?: boolean; rateLimit?: any; issuedAt: number }>(null);
  const [confirmRecoveryOpen, setConfirmRecoveryOpen] = useState(false);
  const [rateInfo, setRateInfo] = useState<null | { tenantCount: number; tenantLimit: number; adminCount: number; adminLimit: number; tenantWindowSec: number; adminWindowSec: number; tenantRemaining?: number; adminRemaining?: number }>(null);
  const recoveryDisplayTTLms = 5 * 60 * 1000; // 5 minutes
  const [showRecoveryLink, setShowRecoveryLink] = useState(false);
  const [revokingRecovery, setRevokingRecovery] = useState(false);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoadingPage(true);
      setError(null);
      
      // 1. Verify admin authorization
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("Not authenticated");
      }
      
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("role, status")
        .eq("user_id", session.session.user.id)
        .single();
      
      if (employeeError || !employee) {
        logger.warn("No employee record found", {
          component: "TenantDetailPage",
          userId: session.session.user.id,
        });
        setError("Unauthorized: Admin access required");
        toast({
          title: "Access Denied",
          description: "You don't have permission to view tenant details.",
          variant: "destructive",
        });
        navigate("/admin/tenants");
        return;
      }
      
      const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(employee.role);
      if (!isAdmin || employee.status !== "ACTIVE") {
        logger.warn("Unauthorized access attempt", {
          component: "TenantDetailPage",
          userId: session.session.user.id,
          role: employee.role,
          status: employee.status,
        });
        setError("Unauthorized: Admin access required");
        toast({
          title: "Access Denied",
          description: "You don't have permission to view tenant details.",
          variant: "destructive",
        });
        navigate("/admin/tenants");
        return;
      }
      
      // 2. Then fetch tenant data
      const tenantData = await getTenant(tenantId);
      setTenant(tenantData);
    } catch (error) {
      logger.error("Error fetching tenant", {
        component: "TenantDetailPage",
        tenantId,
        error,
      });
      setError(
        error instanceof Error ? error.message : "Failed to load tenant",
      );
    } finally {
      setLoadingPage(false);
    }
  }, [tenantId, getTenant, navigate, toast]);

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
      const { data, error } = await supabase
        .from("background_jobs")
        .select("id, job_type, status, created_at, updated_at")
        // Filter by payload JSON field since background_jobs has no tenant_id column
        .contains("payload", { tenantId })
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
      logger.warn("Failed to fetch email history", {
        component: "TenantDetailPage",
        tenantId,
        error: e,
      });
      toast({
        title: "Email History Error",
        description: "Failed to load email history. Please try again.",
        variant: "destructive",
      });
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
      logger.error("Error resending welcome email", {
        component: "TenantDetailPage",
        tenantId: tenant.id,
        error,
      });
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleIssueRecoveryLink = async () => {
    if (!tenantId) return;
    setIssuingRecovery(true);
    setRecoveryData(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "tenant-owner-credentials",
        { body: { tenantId, action: "issue-recovery" } },
      );
      if (error || data?.error) {
        const metaRate = data?.error?.meta?.rate;
        if (metaRate) {
          setRateInfo(metaRate);
        }
        throw new Error(data?.error?.message || error?.message || "Failed");
      }
      if (data?.rateLimit) {
        const rl = data.rateLimit;
        setRateInfo({
          tenantCount: rl.tenantCount,
          tenantLimit: rl.tenantLimit,
          adminCount: rl.adminCount,
          adminLimit: rl.adminLimit,
          tenantWindowSec: rl.tenantWindowSec,
          adminWindowSec: rl.adminWindowSec,
          tenantRemaining: typeof rl.tenantRemaining === 'number' ? rl.tenantRemaining : (rl.tenantLimit - rl.tenantCount),
          adminRemaining: typeof rl.adminRemaining === 'number' ? rl.adminRemaining : (rl.adminLimit - rl.adminCount),
        });
      }
      setRecoveryData({
        ownerEmail: data.ownerEmail,
        recoveryLink: data.recoveryLink,
        requestId: data.requestId,
        message: data.message,
        deprecatedActionUsed: data.deprecatedActionUsed,
        rateLimit: data.rateLimit,
        issuedAt: Date.now(),
      });
      toast({
        title: "Recovery Link Issued",
        description: "Share it securely with the tenant owner.",
      });
    } catch (e) {
      toast({
        title: "Failed to issue link",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIssuingRecovery(false);
      setConfirmRecoveryOpen(false);
    }
  };

  const handleRevokeRecoveryLink = async () => {
    if (!tenantId || !recoveryData) return;
    
    try {
      setRevokingRecovery(true);
      
      const { data, error } = await supabase.functions.invoke(
        "tenant-owner-credentials",
        { 
          body: { 
            tenantId, 
            action: "revoke-recovery", 
            requestId: recoveryData.requestId 
          } 
        },
      );
      
      if (error || data?.error) {
        throw new Error(data?.error?.message || error?.message || "Failed to revoke");
      }
      
      setRecoveryData(null);
      setShowRecoveryLink(false);
      
      toast({
        title: "Recovery Link Revoked",
        description: "The recovery link is no longer valid.",
      });
    } catch (e) {
      logger.error("Failed to revoke recovery link", {
        component: "TenantDetailPage",
        tenantId,
        error: e,
      });
      toast({
        title: "Revocation Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRevokingRecovery(false);
    }
  };

  // Auto-expire displayed recovery link after TTL
  useEffect(() => {
    if (!recoveryData) return;
    
    const remaining = recoveryDisplayTTLms - (Date.now() - recoveryData.issuedAt);
    if (remaining <= 0) {
      setRecoveryData(null);
      setShowRecoveryLink(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setRecoveryData(null);
      setShowRecoveryLink(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [recoveryData, recoveryDisplayTTLms]);

  // Auto-hide recovery link after 30 seconds when revealed
  useEffect(() => {
    if (!showRecoveryLink) return;
    
    const hideTimer = setTimeout(() => {
      setShowRecoveryLink(false);
      toast({
        title: "Recovery Link Hidden",
        description: "The link has been automatically hidden for security.",
        variant: "default",
      });
    }, 30000); // 30 seconds
    
    return () => clearTimeout(hideTimer);
  }, [showRecoveryLink, toast]);

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
            onClick={() => setOpenCredentialsDialog(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            Send Credentials
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={sendingSetupEmail || passwordSetupRate?.limited || passwordSetupRate?.remaining === 0}
            onClick={async () => {
              if (!tenantId) return;
              try {
                setSendingSetupEmail(true);
                const resp = await issuePasswordSetupLink(tenantId, { sendEmail: true, ownerNameOverride: tenant?.name });
                setLastSetupRequest({ mode: (resp as any).mode, requestId: (resp as any).requestId, at: Date.now() });
                const rl = (resp as any).rateLimit;
                if (rl) {
                  const remaining = Math.min(
                    typeof rl.tenantRemaining === 'number' ? rl.tenantRemaining : 999,
                    typeof rl.adminRemaining === 'number' ? rl.adminRemaining : 999,
                  );
                  setPasswordSetupRate({
                    remaining,
                    tenantRemaining: rl.tenantRemaining ?? remaining,
                    adminRemaining: rl.adminRemaining ?? remaining,
                    limited: !!rl.limited,
                  });
                }
                toast({ title: 'Password Setup Email Sent', description: `Mode: ${(resp as any).mode}` });
              } catch (e) {
                toast({ title: 'Failed to send setup email', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
              } finally {
                setSendingSetupEmail(false);
              }
            }}
            className="relative"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendingSetupEmail ? 'Sending...' : 'Password Setup Email'}
            {passwordSetupRate && (
              <span
                className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border ${passwordSetupRate.remaining === 0 || passwordSetupRate.limited ? 'border-destructive/40 text-destructive' : 'border-border'}`}
              >
                {passwordSetupRate.remaining} left
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={(() => {
              if (issuingRecovery) return true;
              if (!rateInfo) return false;
              const tenantRem = rateInfo.tenantRemaining ?? (rateInfo.tenantLimit - rateInfo.tenantCount);
              const adminRem = rateInfo.adminRemaining ?? (rateInfo.adminLimit - rateInfo.adminCount);
              return tenantRem <= 0 || adminRem <= 0;
            })()}
            onClick={() => setConfirmRecoveryOpen(true)}
            className="relative"
          >
            <Shield className="h-4 w-4 mr-2" />
            {issuingRecovery ? "Issuing..." : "Recovery Link"}
            {rateInfo && (
              (() => {
                const tenantRem = rateInfo.tenantRemaining ?? (rateInfo.tenantLimit - rateInfo.tenantCount);
                const adminRem = rateInfo.adminRemaining ?? (rateInfo.adminLimit - rateInfo.adminCount);
                const remaining = Math.min(tenantRem, adminRem);
                return (
                  <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border ${remaining === 0 ? 'border-destructive/40 text-destructive' : 'border-border'}`}>
                    {remaining} left
                  </span>
                );
              })()
            )}
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
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Activity Score</p>
                <p className="text-2xl font-bold">
                  {Math.round(((tenant.analytics?.total_bookings || 0) + 
                    (tenant.analytics?.active_tables || 0)) / 2)}
                </p>
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
      <EditableTenantInfo 
        tenant={tenant} 
        onUpdate={(updatedTenant) => setTenant(updatedTenant)} 
      />

      {/* Tabs for different sections */}
  <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
      <TabsTrigger value="users">Users</TabsTrigger>
      <TabsTrigger value="billing">Billing</TabsTrigger>
      <TabsTrigger value="security">Security</TabsTrigger>
      <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <TenantFeaturesTab tenantSlug={tenant.slug} />
        </TabsContent>

        <TabsContent value="users">
          {tenantId && <TenantUserManagement key={tenantId} tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Plan</CardTitle>
              <CardDescription>Subscription, Stripe identifiers & monthly usage snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              <TenantBillingTab tenantId={tenant.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <TenantApiKeysPanel tenantId={tenant.id} />
          <Card>
            <CardHeader>
              <CardTitle>Staff & Recovery History</CardTitle>
              <CardDescription>Staff accounts and recent password/recovery events</CardDescription>
            </CardHeader>
            <CardContent>
              <TenantSecurityExtended tenantId={tenant.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>Background jobs & rate state</CardDescription>
            </CardHeader>
            <CardContent>
              <TenantOperationsPanel tenantId={tenant.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          ) : !emailHistory || emailHistory.length === 0 ? (
            <p className="text-muted-foreground">No email jobs yet.</p>
          ) : (
            <ul className="space-y-2">
              {(emailHistory || []).map((j) => (
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
      {rateInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Link Rate Limits</CardTitle>
            <CardDescription>Current usage within enforcement windows</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            <p className="text-sm text-muted-foreground">Tenant: {rateInfo.tenantCount} / {rateInfo.tenantLimit} (30m)</p>
            <p className="text-sm text-muted-foreground">Admin: {rateInfo.adminCount} / {rateInfo.adminLimit} (60m)</p>
          </CardContent>
        </Card>
      )}
      {recoveryData && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-warning" />
              Owner Recovery Link
            </CardTitle>
            <CardDescription>
              Generated recovery link. Click to reveal (auto-hides after 30 seconds for security).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Owner Email</label>
              <p className="font-mono break-all text-sm bg-muted/50 p-2 rounded">{recoveryData.ownerEmail}</p>
            </div>
            
            {showRecoveryLink ? (
              <>
                <div className="space-y-2 bg-destructive/5 border border-destructive/20 p-4 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-wide text-destructive font-semibold flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Recovery Link (Sensitive)
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryData.recoveryLink);
                        toast({ 
                          title: "Copied to Clipboard",
                          description: "Recovery link copied. Handle with care.",
                        });
                      }}
                      className="h-7"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="text-xs break-all block bg-background p-3 rounded border">
                    {recoveryData.recoveryLink}
                  </code>
                  <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                    <EyeOff className="h-3 w-3" />
                    <span>Link will auto-hide in 30 seconds</span>
                  </div>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecoveryLink(true)}
                className="w-full border-warning/40 hover:bg-warning/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                Reveal Recovery Link
              </Button>
            )}
            
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Request ID:</span> {recoveryData.requestId}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Expires:</span> Link valid for 5 minutes from issuance
              </p>
              <p className="text-xs text-muted-foreground">{recoveryData.message}</p>
              {recoveryData.deprecatedActionUsed && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                  <span className="font-semibold">⚠️ Warning:</span> Legacy action used; UI should be updated if this persists.
                </p>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRecoveryData(null);
                  setShowRecoveryLink(false);
                }}
                className="flex-1"
              >
                Dismiss
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeRecoveryLink}
                disabled={revokingRecovery}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {revokingRecovery ? "Revoking..." : "Revoke Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmRecoveryOpen} onOpenChange={setConfirmRecoveryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Recovery Link</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a password recovery link for the tenant owner ({tenant.email || 'no email'}). Existing login sessions aren't revoked. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={issuingRecovery}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleIssueRecoveryLink} disabled={issuingRecovery}>
              {issuingRecovery ? 'Issuing...' : 'Generate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
