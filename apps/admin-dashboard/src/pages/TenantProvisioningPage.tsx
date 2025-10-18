import { TenantProvisioningWizard } from "@/components/admin/TenantProvisioningWizard";
import { useNavigate } from "react-router-dom";

export default function TenantProvisioningPage() {
  const navigate = useNavigate();
  const testBypass = (() => {
    if (typeof window === "undefined") return false;
    try {
      const host = window.location.hostname;
      const isLocalhost = host === "localhost" || host === "127.0.0.1";
      const inHref = window.location.href.includes("__bypass=1");
      const inStorage = window.localStorage.getItem("ADMIN_TEST_BYPASS") === "1";
      return isLocalhost && (inHref || inStorage);
    } catch {
      return false;
    }
  })();

  const handleProvisioningComplete = (result: any) => {
    // Navigate to tenant detail page after successful provisioning
    if (testBypass) {
      // In local smoke tests, stay on the success card to assert UI
      return;
    }
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
  <div className="min-h-screen bg-background" data-testid="prov-page">
      <TenantProvisioningWizard
        onComplete={handleProvisioningComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
