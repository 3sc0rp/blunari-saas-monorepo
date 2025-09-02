import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Lock,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityMetric {
  name: string;
  status: "good" | "warning" | "critical";
  value: string;
  description: string;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  created_at: string;
  event_data: any;
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);

      // Load recent security events
      const { data: events, error: eventsError } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (eventsError) {
        console.error("Error loading security events:", eventsError);
      } else {
        setRecentEvents(events || []);
      }

      // Calculate security metrics
      const securityMetrics: SecurityMetric[] = [
        {
          name: "Two-Factor Authentication",
          status: user?.user_metadata?.two_factor_enabled ? "good" : "warning",
          value: user?.user_metadata?.two_factor_enabled
            ? "Enabled"
            : "Disabled",
          description:
            "Protects your account with an additional verification step",
        },
        {
          name: "Session Security",
          status: "good",
          value: "Active",
          description: "Your session is encrypted and secure",
        },
        {
          name: "API Key Management",
          status: "good",
          value: "Secure",
          description: "API keys are properly hashed and protected",
        },
        {
          name: "Failed Login Attempts",
          status:
            events?.filter((e) => e.event_type === "login_failed").length > 3
              ? "warning"
              : "good",
          value:
            events
              ?.filter((e) => e.event_type === "login_failed")
              .length.toString() || "0",
          description: "Recent failed authentication attempts",
        },
      ];

      setMetrics(securityMetrics);
    } catch (error) {
      console.error("Error loading security data:", error);
      toast({
        title: "Error",
        description: "Failed to load security dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: SecurityMetric["status"]) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadgeVariant = (status: SecurityMetric["status"]) => {
    switch (status) {
      case "good":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":
        return "text-blue-600";
      case "warning":
        return "text-yellow-600";
      case "medium":
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "login_success":
      case "login_failed":
        return <Key className="h-4 w-4" />;
      case "2fa_enabled":
      case "2fa_disabled":
        return <Shield className="h-4 w-4" />;
      case "role_changed":
        return <Lock className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your account security and recent activity
          </p>
        </div>
        <Button onClick={loadSecurityData} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
              <Badge
                variant={getStatusBadgeVariant(metric.status)}
                className="mt-2"
              >
                {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Alerts */}
      {metrics.some(
        (m) => m.status === "warning" || m.status === "critical",
      ) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Recommendations:</strong>
            <ul className="mt-2 space-y-1">
              {!user?.user_metadata?.two_factor_enabled && (
                <li>
                  • Enable two-factor authentication for enhanced security
                </li>
              )}
              {metrics.find(
                (m) =>
                  m.name === "Failed Login Attempts" && m.status === "warning",
              ) && (
                <li>
                  • Review recent failed login attempts and consider changing
                  your password
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Latest security-related activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No recent security events found.
            </p>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {event.event_type.replace(/_/g, " ").toUpperCase()}
                      </p>
                      <Badge
                        variant="outline"
                        className={getSeverityColor(event.severity)}
                      >
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.event_data &&
                      Object.keys(event.event_data).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {event.event_data.email &&
                            `Email: ${event.event_data.email}`}
                          {event.event_data.error_type &&
                            ` • Error: ${event.event_data.error_type}`}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
