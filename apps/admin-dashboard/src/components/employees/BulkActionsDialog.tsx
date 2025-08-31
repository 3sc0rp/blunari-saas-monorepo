import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Employee {
  id: string;
  employee_id: string;
  role: string;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface BulkActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: string[];
  employees: Employee[];
  departments: Department[];
  onActionsComplete: () => void;
}

export const BulkActionsDialog = ({
  open,
  onOpenChange,
  selectedEmployees,
  employees,
  departments,
  onActionsComplete
}: BulkActionsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const selectedEmployeeData = employees.filter(emp => 
    selectedEmployees.includes(emp.id)
  );

  const handleBulkAction = async () => {
    if (!action) {
      toast.error("Please select an action");
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line prefer-const
      let updates: Record<string, unknown> = {};
      
      switch (action) {
        case 'change_role':
          if (!newRole) {
            toast.error("Please select a role");
            return;
          }
          updates.role = newRole;
          break;
        case 'change_status':
          if (!newStatus) {
            toast.error("Please select a status");
            return;
          }
          updates.status = newStatus;
          break;
        case 'change_department':
          updates.department_id = newDepartment === 'no-department' ? null : newDepartment || null;
          break;
        case 'activate':
          updates.status = 'ACTIVE';
          break;
        case 'deactivate':
          updates.status = 'INACTIVE';
          break;
        case 'suspend':
          updates.status = 'SUSPENDED';
          break;
      }

      // Update all selected employees
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .in('id', selectedEmployees);

      if (error) throw error;

      // Log the bulk action
      await supabase.rpc('log_employee_activity', {
        p_action: `bulk_${action}`,
        p_resource_type: 'employees',
        p_resource_id: selectedEmployees.join(','),
        p_details: {
          action,
          updates,
          affected_count: selectedEmployees.length
        } as unknown as Json
      });

      toast.success(`Successfully updated ${selectedEmployees.length} employees`);
      onActionsComplete();
      onOpenChange(false);
      setAction("");
      setNewRole("");
      setNewStatus("");
      setNewDepartment("");
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error("Failed to perform bulk action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Actions ({selectedEmployees.length} employees)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Employees Preview */}
          <div className="space-y-2">
            <Label>Selected Employees</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
              {selectedEmployeeData.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between text-sm">
                  <span>
                    {employee.profiles.first_name} {employee.profiles.last_name}
                  </span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {employee.role}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {employee.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="change_role">Change Role</SelectItem>
                <SelectItem value="change_status">Change Status</SelectItem>
                <SelectItem value="change_department">Change Department</SelectItem>
                <SelectItem value="activate">Activate All</SelectItem>
                <SelectItem value="deactivate">Deactivate All</SelectItem>
                <SelectItem value="suspend">Suspend All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Fields */}
          {action === 'change_role' && (
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="OPS">Operations</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'change_status' && (
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'change_department' && (
            <div className="space-y-2">
              <Label htmlFor="new-department">Department</Label>
              <Select value={newDepartment} onValueChange={setNewDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-department">No Department</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Preview */}
          {action && (
            <div className="p-3 bg-muted rounded-md">
              <Label className="text-sm font-medium">Preview</Label>
              <p className="text-sm text-muted-foreground mt-1">
                This will update {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} with the selected changes.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAction} disabled={loading || !action}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};