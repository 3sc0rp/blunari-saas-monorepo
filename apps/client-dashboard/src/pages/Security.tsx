import React from 'react';
import SecurityDashboard from '@/components/SecurityDashboard';

const Security = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security Overview</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage your application's security settings and status.
        </p>
      </div>
      
      <SecurityDashboard />
    </div>
  );
};

export default Security;