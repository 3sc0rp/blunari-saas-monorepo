import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Bug, RefreshCw } from "lucide-react";

export const JobsDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const { toast } = useToast();

  const handleDebug = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jobs-api", {
        body: { action: "debug" },
      });

      if (error) throw error;

      setDebugData(data);
      toast({
        title: "Debug Complete",
        description: `Found ${data.jobsInDatabase} jobs in database`,
      });
    } catch (error) {
      console.error("Debug error:", error);
      toast({
        title: "Debug Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jobs-api", {
        body: { action: "cleanup" },
      });

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: data.message,
      });

      // Refresh debug data
      handleDebug();
    } catch (error) {
      console.error("Cleanup error:", error);
      toast({
        title: "Cleanup Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Jobs Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleDebug} disabled={loading} variant="outline">
            <Bug className="h-4 w-4 mr-2" />
            Debug Database
          </Button>

          <Button
            onClick={handleCleanup}
            disabled={loading}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Corrupted Jobs
          </Button>
        </div>

        {debugData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Jobs in Database</p>
                <Badge variant="secondary">{debugData.jobsInDatabase}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Background Ops URL</p>
                <Badge
                  variant={
                    debugData.backgroundOpsUrl ? "default" : "destructive"
                  }
                >
                  {debugData.backgroundOpsUrl || "Missing"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Recent Jobs</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {debugData.jobs?.map((job: any, index: number) => (
                  <div
                    key={job.id || index}
                    className="p-2 border rounded text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        {job.job_type || "Unknown"}
                      </span>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "failed"
                              ? "destructive"
                              : job.status === "running"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Created: {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
