import { TenantProvisioningWizard } from "@/components/admin/TenantProvisioningWizard";
import { useNavigate } from "react-router-dom";

export default function TenantProvisioningPage() {
  const navigate = useNavigate();

  const handleProvisioningComplete = (result: any) => {
    // Navigate to tenant detail page after successful provisioning
    if (result.tenantId) {
      navigate(`/admin/tenants/${result.tenantId}`);
    } else {
      navigate("/admin/tenants");
    }
  };

  const handleCancel = () => {
    navigate("/admin/tenants");
  };

  return (
    <div className="min-h-screen bg-background">
      <TenantProvisioningWizard
        onComplete={handleProvisioningComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
