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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Shield,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface BackupJob {
  id: string;
  name: string;
  type: "database" | "files" | "full";
  status: "running" | "completed" | "failed" | "scheduled";
  size: string;
  duration: number;
  createdAt: string;
  nextRun?: string;
  retention: number;
}

interface BackupConfig {
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  retention: number;
  compression: boolean;
  encryption: boolean;
  storageLocation: "local" | "s3" | "gcs" | "azure";
}

export const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    frequency: "daily",
    retention: 30,
    compression: true,
    encryption: true,
    storageLocation: "s3",
  });
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState<string | null>(null);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockBackups: BackupJob[] = [
        {
          id: "1",
          name: "Daily Full Backup",
          type: "full",
          status: "completed",
          size: "2.4 GB",
          duration: 450,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          nextRun: new Date(Date.now() + 82800000).toISOString(),
          retention: 30,
        },
        {
          id: "2",
          name: "Database Backup",
          type: "database",
          status: "completed",
          size: "890 MB",
          duration: 120,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          nextRun: new Date(Date.now() + 21600000).toISOString(),
          retention: 30,
        },
        {
          id: "3",
          name: "Files Backup",
          type: "files",
          status: "running",
          size: "1.2 GB",
          duration: 0,
          createdAt: new Date().toISOString(),
          retention: 30,
        },
        {
          id: "4",
          name: "Weekly Archive",
          type: "full",
          status: "scheduled",
          size: "",
          duration: 0,
          createdAt: "",
          nextRun: new Date(Date.now() + 259200000).toISOString(),
          retention: 90,
        },
      ];

      setBackups(mockBackups);
    } catch (error) {
      toast.error("Failed to load backup data");
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async (type: "database" | "files" | "full") => {
    const backupId = Math.random().toString(36).substr(2, 9);
    setRunningBackup(backupId);

    try {
      // Mock backup process
      await new Promise((resolve) => setTimeout(resolve, 3000));
      toast.success(`${type} backup completed successfully`);
      loadBackupData();
    } catch (error) {
      toast.error(`${type} backup failed`);
    } finally {
      setRunningBackup(null);
    }
  };

  const restoreBackup = async (backupId: string) => {
    try {
      // Mock restore process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Backup restored successfully");
    } catch (error) {
      toast.error("Failed to restore backup");
    }
  };

  const deleteBackup = async (backupId: string) => {
    try {
      // Mock delete process
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Backup deleted successfully");
      loadBackupData();
    } catch (error) {
      toast.error("Failed to delete backup");
    }
  };

  const updateConfig = async (newConfig: Partial<BackupConfig>) => {
    try {
      setConfig((prev) => ({ ...prev, ...newConfig }));
      toast.success("Backup configuration updated");
    } catch (error) {
      toast.error("Failed to update configuration");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "database":
        return <Database className="h-4 w-4" />;
      case "files":
        return <HardDrive className="h-4 w-4" />;
      case "full":
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "running":
        return "secondary";
      case "scheduled":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "In progress...";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading backup data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backup & Recovery</h2>
          <p className="text-muted-foreground">
            Manage automated backups and data recovery
          </p>
        </div>
        <Button onClick={() => loadBackupData()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Backups</CardTitle>
              <CardDescription>
                Latest backup jobs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getTypeIcon(backup.type)}
                      <div>
                        <div className="font-medium">{backup.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {backup.type} • {backup.size || "In progress"} •{" "}
                          {formatDuration(backup.duration)}
                        </div>
                        {backup.nextRun && (
                          <div className="text-xs text-muted-foreground">
                            Next run:{" "}
                            {new Date(backup.nextRun).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Badge variant={getStatusColor(backup.status) as any}>
                        {getStatusIcon(backup.status)}
                        <span className="ml-1">{backup.status}</span>
                      </Badge>
                    </div>

                    <div className="flex space-x-2">
                      {backup.status === "completed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreBackup(backup.id)}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteBackup(backup.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Backup</CardTitle>
              <CardDescription>Trigger an immediate backup job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button
                  onClick={() => triggerBackup("database")}
                  disabled={!!runningBackup}
                  className="h-20 flex-col"
                >
                  <Database className="h-6 w-6 mb-2" />
                  Database Backup
                </Button>
                <Button
                  onClick={() => triggerBackup("files")}
                  disabled={!!runningBackup}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <HardDrive className="h-6 w-6 mb-2" />
                  Files Backup
                </Button>
                <Button
                  onClick={() => triggerBackup("full")}
                  disabled={!!runningBackup}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Shield className="h-6 w-6 mb-2" />
                  Full Backup
                </Button>
              </div>
              {runningBackup && (
                <Alert className="mt-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Backup in progress. This may take several minutes...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
              <CardDescription>
                Configure automated backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Enable Automated Backups
                </label>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => updateConfig({ enabled })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Backup Frequency</label>
                <Select
                  value={config.frequency}
                  onValueChange={(frequency: BackupConfig["frequency"]) =>
                    updateConfig({ frequency })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Storage Location</label>
                <Select
                  value={config.storageLocation}
                  onValueChange={(
                    storageLocation: BackupConfig["storageLocation"],
                  ) => updateConfig({ storageLocation })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Enable Compression
                </label>
                <Switch
                  checked={config.compression}
                  onCheckedChange={(compression) =>
                    updateConfig({ compression })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Encryption</label>
                <Switch
                  checked={config.encryption}
                  onCheckedChange={(encryption) => updateConfig({ encryption })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Used Storage</span>
                    <span className="font-medium">4.2 GB / 10 GB</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Database Backups</span>
                    <span>1.8 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Backups</span>
                    <span>2.1 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Archive Backups</span>
                    <span>0.3 GB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recovery Point Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-green-500">4 hours</div>
                <p className="text-sm text-muted-foreground">
                  Maximum data loss in case of failure
                </p>
                <Badge variant="outline" className="mt-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Within SLA
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
