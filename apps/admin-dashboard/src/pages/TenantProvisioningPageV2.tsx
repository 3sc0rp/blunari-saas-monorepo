import { TenantProvisioningFormV2 } from "@/components/admin/TenantProvisioningFormV2";

/**
 * Professional Tenant Provisioning Page V2
 * 
 * This is the new, improved provisioning system that replaces the old wizard.
 * 
 * Key improvements:
 * - Single-page form (no wizard steps)
 * - Real-time validation with instant feedback
 * - Automatic slug generation and suggestions
 * - Clear error messages with recovery guidance
 * - Professional UX/UI
 * - Complete audit trail
 * - Guaranteed data consistency
 */
export default function TenantProvisioningPageV2() {
  return (
    <div className="min-h-screen bg-background p-6">
      <TenantProvisioningFormV2 />
    </div>
  );
}
