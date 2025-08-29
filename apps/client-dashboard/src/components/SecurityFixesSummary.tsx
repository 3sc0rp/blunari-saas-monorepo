import React from 'react';
import { CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SecurityFixesSummary: React.FC = () => {
  const criticalFixes = [
    {
      title: "Removed Unrestricted Domain Access",
      description: "All dashboard access now requires authentication",
      severity: "Critical",
      status: "Fixed"
    },
    {
      title: "Role Escalation Prevention", 
      description: "Users cannot change their own roles or unauthorized role assignments",
      severity: "Critical",
      status: "Fixed"
    },
    {
      title: "Enhanced Tenant Isolation",
      description: "Strict validation of tenant access across all data operations",
      severity: "High",
      status: "Fixed"
    },
    {
      title: "Database Function Security",
      description: "All functions now have secure search_path configuration",
      severity: "High", 
      status: "Fixed"
    },
    {
      title: "Security Audit Logging",
      description: "Role changes and profile updates are now logged for monitoring",
      severity: "Medium",
      status: "Fixed"
    }
  ];

  const manualActions = [
    {
      title: "Enable Leaked Password Protection",
      description: "Must be configured in Supabase dashboard",
      severity: "Medium"
    },
    {
      title: "Reduce OTP Expiry Time",
      description: "Recommended to set to 600 seconds or less",
      severity: "Low"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'warning';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-success bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <Shield className="h-5 w-5" />
            Security Fixes Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {criticalFixes.map((fix, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{fix.title}</h4>
                    <Badge variant={getSeverityColor(fix.severity) as any} className="text-xs">
                      {fix.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{fix.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Manual Configuration Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {manualActions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{action.title}</h4>
                    <Badge variant={getSeverityColor(action.severity) as any} className="text-xs">
                      {action.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-background rounded-lg border">
            <p className="text-sm text-muted-foreground">
              These settings must be configured manually in your Supabase project dashboard under 
              <strong> Authentication → Settings</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityFixesSummary;