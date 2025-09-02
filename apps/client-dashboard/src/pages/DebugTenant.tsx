import React from 'react';
import { TenantDebugger } from '@/components/TenantDebugger';
import { TenantHookTester } from '@/components/TenantHookTester';

const DebugTenantPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 space-y-8">
        <TenantHookTester />
        <TenantDebugger />
      </div>
    </div>
  );
};

export default DebugTenantPage;
