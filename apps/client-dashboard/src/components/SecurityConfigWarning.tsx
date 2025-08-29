import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SecurityConfigWarning: React.FC = () => {
  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Security Configuration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your Supabase project has security warnings that need to be addressed:
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <div className="p-3 bg-background rounded-lg border">
            <h4 className="font-medium text-sm mb-2">1. Enable Leaked Password Protection</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Go to Authentication → Settings → Password Protection in your Supabase dashboard and enable "Check for leaked passwords".
            </p>
            <p className="text-xs text-muted-foreground">
              This prevents users from using passwords that have been compromised in data breaches.
            </p>
          </div>
          
          <div className="p-3 bg-background rounded-lg border">
            <h4 className="font-medium text-sm mb-2">2. Reduce OTP Expiry Time</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Go to Authentication → Settings → Auth in your Supabase dashboard and set "OTP expiry" to 600 seconds (10 minutes) or less.
            </p>
            <p className="text-xs text-muted-foreground">
              This reduces the window for potential OTP attacks.
            </p>
          </div>
        </div>
        
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Note:</strong> These settings require manual configuration in your Supabase project dashboard.
            They cannot be changed via SQL migrations.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SecurityConfigWarning;