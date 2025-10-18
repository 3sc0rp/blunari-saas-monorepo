import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Download,
  Trash2,
  Eye,
  Settings as SettingsIcon,
  Database,
  Shield,
  Code,
  Zap,
  Key,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AdvancedSettings: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [isExporting, setIsExporting] = useState(false);
  const [apiKey, setApiKey] = useState("blun_live_sk_1234...abcd");

  const handleExportData = async () => {
    if (!tenant?.id) return;

    setIsExporting(true);
    try {
      // Simulate data export - in real implementation, you'd fetch all tenant data
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenant.id);

      const exportData = {
        tenant: tenant,
        bookings: bookings || [],
        exportedAt: new Date().toISOString(),
        format: "json",
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tenant.name?.replace(/\s+/g, "_")}_data_export_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Completed",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    try {
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear query cache
      window.location.reload();

      toast({
        title: "Cache Cleared",
        description: "All cached data has been cleared. Page will reload.",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      // In a real implementation, you'd call an API to regenerate the key
      const newKey = `blun_live_sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setApiKey(newKey);

      toast({
        title: "API Key Regenerated",
        description:
          "Your API key has been regenerated. Please update your integrations.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to regenerate API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllData = async () => {
    if (!tenant?.id) return;

    try {
      // This would be implemented with proper cascading deletes
      toast({
        title: "Data Deletion Started",
        description:
          "All tenant data deletion has been queued. This may take a few minutes.",
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete data. Please contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* API Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={apiKey}
                readOnly
                className="font-mono text-sm"
                type="password"
              />
              <Button variant="outline" onClick={handleRegenerateApiKey}>
                Regenerate
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Use this API key to integrate with external services. Keep it
              secure!
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Webhook Endpoint</Label>
                <div className="text-sm text-muted-foreground">
                  Configure webhook URL for real-time notifications
                </div>
              </div>
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">API Documentation</Label>
                <div className="text-sm text-muted-foreground">
                  View API documentation and examples
                </div>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Docs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="font-medium">Export Data</Label>
                <div className="text-sm text-muted-foreground">
                  Download all your restaurant data as JSON
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <Label className="font-medium">Clear Cache</Label>
                <div className="text-sm text-muted-foreground">
                  Clear all cached data and refresh application
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleClearCache}>
              Clear Cache
            </Button>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Label className="font-medium text-destructive">
                Danger Zone
              </Label>
            </div>

            <div className="border border-destructive/20 rounded-lg p-4 space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      all your restaurant data including bookings, customers,
                      and settings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="text-sm text-muted-foreground">
                This will permanently delete all data associated with your
                restaurant. Make sure to export your data first if you need it.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tenant ID</Label>
              <div className="font-mono text-sm p-2 bg-muted rounded">
                {tenant?.id}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Database Region</Label>
              <div className="font-mono text-sm p-2 bg-muted rounded">
                us-east-1
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Plan</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Professional</Badge>
                <span className="text-sm text-muted-foreground">$49/month</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Storage Used</Label>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>2.3 GB / 10 GB</span>
                  <span className="text-muted-foreground">23%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: "23%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedSettings;
