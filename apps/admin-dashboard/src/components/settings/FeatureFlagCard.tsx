import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FeatureFlag } from "@/types/settings";
import { Settings, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlagCardProps {
  flag: FeatureFlag;
  onToggle: (flagId: string, enabled: boolean) => void;
  onEdit?: (flagId: string) => void;
}

export function FeatureFlagCard({
  flag,
  onToggle,
  onEdit,
}: FeatureFlagCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      onToggle(flag.id, !flag.enabled);
      toast({
        title: `Feature ${flag.enabled ? "Disabled" : "Enabled"}`,
        description: `${flag.name} has been ${flag.enabled ? "disabled" : "enabled"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle feature flag.",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const getCategoryColor = (category: FeatureFlag["category"]) => {
    switch (category) {
      case "booking":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "analytics":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "integrations":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "ui":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "experimental":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production":
        return "bg-green-500";
      case "staging":
        return "bg-yellow-500";
      case "development":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{flag.name}</CardTitle>
            <CardDescription className="text-sm">
              {flag.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={getCategoryColor(flag.category)}
              variant="outline"
            >
              {flag.category}
            </Badge>
            <Switch
              checked={flag.enabled}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-medium">Key:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">{flag.key}</code>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Rollout Progress
              </span>
              <span className="font-medium">{flag.rolloutPercentage}%</span>
            </div>
            <Progress value={flag.rolloutPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Environments:</span>
              <div className="flex gap-1 mt-1">
                {flag.environments.map((env) => (
                  <div key={env} className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${getEnvironmentColor(env)}`}
                    />
                    <span className="text-xs capitalize">{env}</span>
                  </div>
                ))}
              </div>
            </div>
            {flag.targetTenants && flag.targetTenants.length > 0 && (
              <div>
                <span className="text-muted-foreground">Target Tenants:</span>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">
                    {flag.targetTenants.length} specific
                  </span>
                </div>
              </div>
            )}
          </div>

          {flag.dependsOn && flag.dependsOn.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Dependencies:</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Requires: {flag.dependsOn.join(", ")}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(flag.id)}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(flag.key);
              toast({
                title: "Copied!",
                description: "Feature flag key copied to clipboard.",
              });
            }}
          >
            Copy Key
          </Button>
        </div>
      </CardContent>

      {!flag.enabled && (
        <div className="absolute inset-0 bg-background/50 rounded-lg pointer-events-none" />
      )}
    </Card>
  );
}
