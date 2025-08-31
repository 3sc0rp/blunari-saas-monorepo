import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SecurityFixesSummary from '@/components/SecurityFixesSummary';
import SecurityConfigWarning from '@/components/SecurityConfigWarning';

const SecurityDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
        <p className="text-muted-foreground">
          Review and monitor security configurations and fixes
        </p>
      </div>
      
      <SecurityFixesSummary />
      <SecurityConfigWarning />
    </div>
  );
};

export default SecurityDashboard;