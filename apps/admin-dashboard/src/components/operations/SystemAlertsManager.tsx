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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Shield,
  Bell,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  description?: string;
  createdAt: string;
  lastTriggered?: string;
}

interface AlertInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "acknowledged" | "resolved";
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  message: string;
}

const defaultAlertRules: AlertRule[] = [
  {
    id: "1",
    name: "High CPU Usage",
    metric: "cpu_usage",
    threshold: 90,
    operator: "gt",
    severity: "high",
    enabled: true,
    cooldownMinutes: 5,
    notificationChannels: ["email", "dashboard"],
    description: "Alert when CPU usage exceeds 90%",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "High Memory Usage",
    metric: "memory_usage",
    threshold: 85,
    operator: "gt",
    severity: "high",
    enabled: true,
    cooldownMinutes: 5,
    notificationChannels: ["email", "dashboard"],
    description: "Alert when memory usage exceeds 85%",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "High Error Rate",
    metric: "error_rate",
    threshold: 5,
    operator: "gt",
    severity: "critical",
    enabled: true,
    cooldownMinutes: 2,
    notificationChannels: ["email", "sms", "dashboard"],
    description: "Alert when error rate exceeds 5%",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Slow Response Time",
    metric: "response_time",
    threshold: 500,
    operator: "gt",
    severity: "medium",
    enabled: true,
    cooldownMinutes: 10,
    notificationChannels: ["dashboard"],
    description: "Alert when response time exceeds 500ms",
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Low Disk Space",
    metric: "disk_usage",
    threshold: 85,
    operator: "gt",
    severity: "high",
    enabled: true,
    cooldownMinutes: 30,
    notificationChannels: ["email", "dashboard"],
    description: "Alert when disk usage exceeds 85%",
    createdAt: new Date().toISOString(),
  },
];

export const SystemAlertsManager: React.FC = () => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(defaultAlertRules);
  const [alertInstances, setAlertInstances] = useState<AlertInstance[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { toast } = useToast();

  // Simulate alert instances
  useEffect(() => {
    const mockInstances: AlertInstance[] = [
      {
        id: "1",
        ruleId: "1",
        ruleName: "High CPU Usage",
        metric: "cpu_usage",
        currentValue: 92.5,
        threshold: 90,
        severity: "high",
        status: "active",
        triggeredAt: new Date(Date.now() - 300000).toISOString(),
        message: "CPU usage is 92.5% (threshold: 90%)",
      },
      {
        id: "2",
        ruleId: "3",
        ruleName: "High Error Rate",
        metric: "error_rate",
        currentValue: 7.2,
        threshold: 5,
        severity: "critical",
        status: "acknowledged",
        triggeredAt: new Date(Date.now() - 600000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 300000).toISOString(),
        acknowledgedBy: "admin@blunari.ai",
        message: "Error rate is 7.2% (threshold: 5%)",
      },
    ];
    setAlertInstances(mockInstances);
  }, []);

  const handleCreateRule = (newRule: Omit<AlertRule, "id" | "createdAt">) => {
    const rule: AlertRule = {
      ...newRule,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    setAlertRules((prev) => [...prev, rule]);
    setIsCreateDialogOpen(false);

    toast({
      title: "Alert Rule Created",
      description: `Alert rule "${rule.name}" has been created successfully.`,
    });
  };

  const handleUpdateRule = (updatedRule: AlertRule) => {
    setAlertRules((prev) =>
      prev.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)),
    );
    setEditingRule(null);

    toast({
      title: "Alert Rule Updated",
      description: `Alert rule "${updatedRule.name}" has been updated successfully.`,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = alertRules.find((r) => r.id === ruleId);
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));

    toast({
      title: "Alert Rule Deleted",
      description: `Alert rule "${rule?.name}" has been deleted.`,
    });
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setAlertRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule)),
    );

    const rule = alertRules.find((r) => r.id === ruleId);
    toast({
      title: enabled ? "Alert Rule Enabled" : "Alert Rule Disabled",
      description: `Alert rule "${rule?.name}" has been ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlertInstances((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "acknowledged",
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: "admin@blunari.ai",
            }
          : alert,
      ),
    );

    toast({
      title: "Alert Acknowledged",
      description: "The alert has been acknowledged.",
    });
  };

  const handleResolveAlert = (alertId: string) => {
    setAlertInstances((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "resolved",
              resolvedAt: new Date().toISOString(),
            }
          : alert,
      ),
    );

    toast({
      title: "Alert Resolved",
      description: "The alert has been marked as resolved.",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "acknowledged":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredInstances = alertInstances.filter((instance) => {
    if (selectedSeverity !== "all" && instance.severity !== selectedSeverity)
      return false;
    if (selectedStatus !== "all" && instance.status !== selectedStatus)
      return false;
    return true;
  });

  const activeAlertsCount = alertInstances.filter(
    (a) => a.status === "active",
  ).length;
  const criticalAlertsCount = alertInstances.filter(
    (a) => a.severity === "critical" && a.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      {/* Alert Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {activeAlertsCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              {criticalAlertsCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Alert Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertRules.length}</div>
            <p className="text-xs text-muted-foreground">
              {alertRules.filter((r) => r.enabled).length} enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24h</div>
            <p className="text-xs text-muted-foreground">Last 7 days: 142</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Instances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alert Instances</CardTitle>
              <CardDescription>
                Current and recent system alerts
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInstances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alerts found matching the selected filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstances.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(alert.status)}
                        <Badge variant="outline" className="capitalize">
                          {alert.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {alert.ruleName}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {alert.message}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(alert.triggeredAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {alert.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          </>
                        )}
                        {alert.status === "acknowledged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                Configure automatic monitoring and alerting rules
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Alert Rule</DialogTitle>
                  <DialogDescription>
                    Configure a new alert rule to monitor system metrics
                  </DialogDescription>
                </DialogHeader>
                <AlertRuleForm
                  onSubmit={handleCreateRule}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Notifications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) =>
                        handleToggleRule(rule.id, enabled)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    {rule.metric.replace("_", " ").toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {rule.operator} {rule.threshold}
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(rule.severity)}>
                      {rule.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {rule.notificationChannels.map((channel) => (
                        <Badge
                          key={channel}
                          variant="outline"
                          className="text-xs"
                        >
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Alert Rule</DialogTitle>
                            <DialogDescription>
                              Modify the alert rule configuration
                            </DialogDescription>
                          </DialogHeader>
                          <AlertRuleForm
                            initialRule={rule}
                            onSubmit={handleUpdateRule}
                            onCancel={() => setEditingRule(null)}
                          />
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Alert Rule
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the alert rule "
                              {rule.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

interface AlertRuleFormProps {
  initialRule?: AlertRule;
  onSubmit: (rule: AlertRule | Omit<AlertRule, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const AlertRuleForm: React.FC<AlertRuleFormProps> = ({
  initialRule,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: initialRule?.name || "",
    metric: initialRule?.metric || "cpu_usage",
    threshold: initialRule?.threshold || 80,
    operator: initialRule?.operator || ("gt" as const),
    severity: initialRule?.severity || ("medium" as const),
    enabled: initialRule?.enabled ?? true,
    cooldownMinutes: initialRule?.cooldownMinutes || 5,
    notificationChannels: initialRule?.notificationChannels || ["dashboard"],
    description: initialRule?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (initialRule) {
      onSubmit({ ...initialRule, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Rule Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="metric">Metric</Label>
          <Select
            value={formData.metric}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, metric: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpu_usage">CPU Usage</SelectItem>
              <SelectItem value="memory_usage">Memory Usage</SelectItem>
              <SelectItem value="disk_usage">Disk Usage</SelectItem>
              <SelectItem value="response_time">Response Time</SelectItem>
              <SelectItem value="error_rate">Error Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="operator">Operator</Label>
          <Select
            value={formData.operator}
            onValueChange={(value: AlertRule["operator"]) =>
              setFormData((prev) => ({ ...prev, operator: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">Greater than</SelectItem>
              <SelectItem value="gte">Greater than or equal</SelectItem>
              <SelectItem value="lt">Less than</SelectItem>
              <SelectItem value="lte">Less than or equal</SelectItem>
              <SelectItem value="eq">Equal to</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="threshold">Threshold</Label>
          <Input
            id="threshold"
            type="number"
            value={formData.threshold}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                threshold: Number(e.target.value),
              }))
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select
            value={formData.severity}
            onValueChange={(value: AlertRule["severity"]) =>
              setFormData((prev) => ({ ...prev, severity: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cooldown">Cooldown (minutes)</Label>
          <Input
            id="cooldown"
            type="number"
            value={formData.cooldownMinutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                cooldownMinutes: Number(e.target.value),
              }))
            }
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={(enabled) =>
            setFormData((prev) => ({ ...prev, enabled }))
          }
        />
        <Label>Enable this rule</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialRule ? "Update Rule" : "Create Rule"}
        </Button>
      </DialogFooter>
    </form>
  );
};
