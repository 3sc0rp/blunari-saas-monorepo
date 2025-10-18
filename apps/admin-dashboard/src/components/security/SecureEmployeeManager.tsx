import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  AlertTriangle,
  Users,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  user_id: string;
  role: string;
  status: string;
  employee_id: string;
  department_id?: string;
}

interface SecureEmployeeManagerProps {
  employees: Employee[];
  currentUserRole: string;
  onUpdate: (employees: Employee[]) => void;
}

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SUPPORT: 3,
  OPS: 2,
  VIEWER: 1,
};

const VALID_ROLE_CHANGES = {
  SUPER_ADMIN: ["ADMIN", "SUPPORT", "OPS", "VIEWER"], // Super admin can assign any role except super admin
  ADMIN: ["SUPPORT", "OPS", "VIEWER"], // Admin can assign lower roles
  SUPPORT: [], // Support cannot change roles
  OPS: [], // Ops cannot change roles
  VIEWER: [], // Viewer cannot change roles
};

export function SecureEmployeeManager({
  employees,
  currentUserRole,
  onUpdate,
}: SecureEmployeeManagerProps) {
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [newRole, setNewRole] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const canChangeRole = (targetRole: string) => {
    const allowedRoles =
      VALID_ROLE_CHANGES[currentUserRole as keyof typeof VALID_ROLE_CHANGES] ||
      [];
    return allowedRoles.includes(targetRole);
  };

  const canManageEmployee = (employee: Employee) => {
    const currentUserLevel =
      ROLE_HIERARCHY[currentUserRole as keyof typeof ROLE_HIERARCHY] || 0;
    const targetUserLevel =
      ROLE_HIERARCHY[employee.role as keyof typeof ROLE_HIERARCHY] || 0;

    // Users can only manage employees with lower privilege levels
    return currentUserLevel > targetUserLevel;
  };

  const handleRoleChangeRequest = (employee: Employee) => {
    if (!canManageEmployee(employee)) {
      toast({
        title: "Access Denied",
        description:
          "You don't have permission to modify this employee's role.",
        variant: "destructive",
      });
      return;
    }

    setSelectedEmployee(employee);
    setNewRole("");
    setChangeReason("");
    setShowRoleChangeDialog(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedEmployee || !newRole || !changeReason.trim()) {
      toast({
        title: "Missing Information",
        description:
          "Please select a role and provide a reason for the change.",
        variant: "destructive",
      });
      return;
    }

    if (!canChangeRole(newRole)) {
      toast({
        title: "Unauthorized Role",
        description: "You don't have permission to assign this role.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Update employee role in database
      const { error } = await supabase
        .from("employees")
        .update({ role: newRole as any })
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      // Log the role change with detailed audit information
      await supabase.rpc("log_security_event", {
        p_event_type: "employee_role_changed",
        p_severity: "high",
        p_employee_id: selectedEmployee.id,
        p_event_data: {
          target_employee_id: selectedEmployee.id,
          old_role: selectedEmployee.role,
          new_role: newRole,
          reason: changeReason,
          changed_by_role: currentUserRole,
        },
      });

      // Update local state
      const updatedEmployees = employees.map((emp) =>
        emp.id === selectedEmployee.id ? { ...emp, role: newRole } : emp,
      );
      onUpdate(updatedEmployees);

      setShowRoleChangeDialog(false);
      setSelectedEmployee(null);

      toast({
        title: "Role Updated",
        description: `Employee role has been changed to ${newRole}. This action has been logged for audit purposes.`,
      });
    } catch (error) {
      console.error("Role change error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update employee role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (employee: Employee, newStatus: string) => {
    if (!canManageEmployee(employee)) {
      toast({
        title: "Access Denied",
        description:
          "You don't have permission to change this employee's status.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("employees")
        .update({ status: newStatus as any })
        .eq("id", employee.id);

      if (error) throw error;

      // Log the status change
      await supabase.rpc("log_security_event", {
        p_event_type: "employee_status_changed",
        p_severity: "medium",
        p_employee_id: employee.id,
        p_event_data: {
          target_employee_id: employee.id,
          old_status: employee.status,
          new_status: newStatus,
          changed_by_role: currentUserRole,
        },
      });

      const updatedEmployees = employees.map((emp) =>
        emp.id === employee.id ? { ...emp, status: newStatus } : emp,
      );
      onUpdate(updatedEmployees);

      toast({
        title: "Status Updated",
        description: `Employee status has been changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Status change error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update employee status.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "ADMIN":
        return "default";
      case "SUPPORT":
        return "secondary";
      case "OPS":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "SUSPENDED":
        return "destructive";
      case "PENDING":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Secure Employee Management
          </CardTitle>
          <CardDescription>
            Manage employee roles and permissions with audit logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Policy:</strong> All role and status changes are
              logged for audit purposes. You can only modify employees with
              lower privilege levels than your own.
            </AlertDescription>
          </Alert>

          {/* Current User Role Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Your Role:</span>
            <Badge variant={getRoleBadgeVariant(currentUserRole)}>
              {currentUserRole}
            </Badge>
          </div>

          {/* Employee List */}
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        Employee ID: {employee.employee_id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getRoleBadgeVariant(employee.role)}>
                          {employee.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(employee.status)}>
                          {employee.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageEmployee(employee) ? (
                      <>
                        <Select
                          value={employee.status}
                          onValueChange={(value) =>
                            handleStatusChange(employee, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChangeRequest(employee)}
                        >
                          Change Role
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Restricted Access</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog
        open={showRoleChangeDialog}
        onOpenChange={setShowRoleChangeDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Change Employee Role
            </DialogTitle>
            <DialogDescription>
              This action will change the employee's role and permissions.
              Please provide a reason for audit purposes.
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">
                  Employee: {selectedEmployee.employee_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Current Role:{" "}
                  <Badge variant={getRoleBadgeVariant(selectedEmployee.role)}>
                    {selectedEmployee.role}
                  </Badge>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newRole">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_ROLE_CHANGES[
                      currentUserRole as keyof typeof VALID_ROLE_CHANGES
                    ]?.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Change *</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a detailed reason for this role change..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  required
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This action will be logged for audit purposes and cannot be
                  undone without proper authorization.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleChangeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              disabled={!newRole || !changeReason.trim() || isProcessing}
            >
              {isProcessing ? "Updating..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
