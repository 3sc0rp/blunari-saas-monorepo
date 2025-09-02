import React from "react";
import { useTenant } from "@/hooks/useTenant";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAlertSystem } from "@/hooks/useAlertSystem";

const Dashboard: React.FC = () => {
  const { tenant, accessType, tenantSlug } = useTenant();
  const { metrics, performanceTrends, isLoading } = useDashboardMetrics(
    tenant?.id,
  );
  const { alerts, dismissAlert, clearAllAlerts } = useAlertSystem(tenant?.id);

  console.log("🏠 Dashboard: Rendering with tenant:", tenant?.name, "accessType:", accessType);

  // EMERGENCY DEBUG: Super simple layout to test
  return (
    <div style={{ 
      backgroundColor: 'red', 
      minHeight: '100vh', 
      padding: '20px',
      color: 'white',
      fontSize: '20px'
    }}>
      <h1>🚨 EMERGENCY DEBUG - DASHBOARD IS WORKING!</h1>
      <p>Tenant: {tenant?.name || "No tenant"}</p>
      <p>Access Type: {accessType || "No access type"}</p>
      <p>If you can see this, routing works but CSS layout is broken!</p>
      
      <div style={{ backgroundColor: 'blue', padding: '10px', margin: '10px 0' }}>
        This is a blue test box
      </div>
      
      <div style={{ backgroundColor: 'green', padding: '10px', margin: '10px 0' }}>
        This is a green test box  
      </div>
    </div>
  );
};

export default Dashboard;
