import React from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TenantSecurityFixes: React.FC = () => {
  const fixes = [
    {
      title: "Restricted Public Tenant Access",
      description: "Removed public access to sensitive business data (phone, email, address)",
      severity: "Critical",
      status: "Fixed",
      before: "All tenant data publicly accessible",
      after: "Only basic info (name, slug, timezone) available publicly"
    },
    {
      title: "Secure Public View Created", 
      description: "Created tenant_public_info view with minimal data exposure",
      severity: "High",
      status: "Fixed",
      before: "Direct access to tenants table",
      after: "Secure view with filtered fields only"
    },
    {
      title: "Enhanced RLS Policies",
      description: "Implemented strict Row Level Security for tenant modifications",
      severity: "High",
      status: "Fixed",
      before: "Overly permissive policies allowed unauthorized access",
      after: "Role-based access control with proper validation"
    },
    {
      title: "Competitor Data Protection",
      description: "Prevented unauthorized access to business intelligence data",
      severity: "Critical", 
      status: "Fixed",
      before: "Restaurant addresses, contacts exposed to competitors",
      after: "Sensitive business data protected behind authentication"
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
    <Card className="border-success bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <Shield className="h-5 w-5" />
          Tenant Data Security - RESOLVED
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Issue Resolved:</strong> Restaurant business information is now protected from competitor access.
            Public booking widgets can still function with minimal required data.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {fixes.map((fix, index) => (
            <div key={index} className="p-3 bg-background rounded-lg border">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{fix.title}</h4>
                    <Badge variant={getSeverityColor(fix.severity) as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-xs">
                      {fix.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{fix.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-start gap-1">
                      <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        <strong>Before:</strong> {fix.before}
                      </span>
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        <strong>After:</strong> {fix.after}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>What's Protected Now:</strong> Restaurant contact details, addresses, business hours,
            and other sensitive operational data are only accessible to authenticated restaurant owners and staff.
            Public booking widgets continue to work with minimal necessary data (name, slug, timezone).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TenantSecurityFixes;