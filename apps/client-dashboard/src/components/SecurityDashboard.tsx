import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SecurityConfigWarning from '@/components/SecurityConfigWarning';
import SecurityFixesSummary from '@/components/SecurityFixesSummary';
import TenantSecurityFixes from '@/components/TenantSecurityFixes';

const SecurityDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-success bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-sm">Authentication</p>
                <p className="text-xs text-muted-foreground">Enabled & Secure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-sm">Row Level Security</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-sm">Manual Configuration</p>
                <p className="text-xs text-muted-foreground">Required</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TenantSecurityFixes />
      <SecurityFixesSummary />
      <SecurityConfigWarning />
    </div>
  );
};

export default SecurityDashboard;