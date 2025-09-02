import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ProvisioningWizard,
  type ProvisioningData,
} from "@/components/provisioning/ProvisioningWizard";
import { EmailOptionsDialog } from "@/components/provisioning/EmailOptionsDialog";
import { useTenantProvisioning } from "@/hooks/useTenantProvisioning";
import { useToast } from "@/hooks/use-toast";

export default function NewTenantPage() {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [provisioningData, setProvisioningData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { provisionTenant } = useTenantProvisioning();

  const handleProvisioningComplete = async (data: ProvisioningData) => {
    try {
      console.log("Starting tenant provisioning via background-ops API...", {
        restaurantName: data.restaurantName,
      });

      // Call the background-ops API for tenant provisioning
      const result = await provisionTenant(data);

      console.log("Provisioning completed:", result);

      if ((result as any)?.provisioningData) {
        // Store provisioning data and show email dialog
        setProvisioningData((result as any).provisioningData);
        setShowEmailDialog(true);
      } else {
        // Navigate back to tenants list
        navigate("/admin/tenants");
      }
    } catch (error) {
      console.error("Provisioning error:", error);
      // Error handling is done in the hook
    }
  };

  const handleCancel = () => {
    navigate("/admin/tenants");
  };

  const handleEmailDialogClose = () => {
    setShowEmailDialog(false);
    navigate("/admin/tenants");
  };

  return (
    <>
      <ProvisioningWizard
        onComplete={handleProvisioningComplete}
        onCancel={handleCancel}
      />

      {showEmailDialog && provisioningData && (
        <EmailOptionsDialog
          isOpen={showEmailDialog}
          onClose={handleEmailDialogClose}
          provisioningData={provisioningData}
        />
      )}
    </>
  );
}
