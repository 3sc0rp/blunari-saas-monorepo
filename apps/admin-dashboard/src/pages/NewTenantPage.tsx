import { Navigate } from "react-router-dom";

// Legacy page retained as a safe redirect to the new provisioning flow
export default function NewTenantPage() {
  return <Navigate to="/admin/tenants/provision" replace />;
}
