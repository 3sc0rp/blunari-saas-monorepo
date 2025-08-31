import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Activity, Shield, Settings, Save, Loader2 } from "lucide-react";

type EmployeeRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'OPS' | 'VIEWER';
type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

interface PermissionSet {
  can_manage_tenants?: boolean;
  can_view_analytics?: boolean;
  can_manage_users?: boolean;
  can_access_logs?: boolean;
  can_manage_billing?: boolean;
  [key: string]: boolean | undefined;
}

interface ActivityLogDetails {
  action_type?: string;
  resource_name?: string;
  ip_address?: string;
  user_agent?: string;
  changes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Employee {
  id: string;
  employee_id: string;
  role: string;
  status: string;
  hire_date: string;
  last_login: string;
  last_activity: string;
  user_id: string;
  department_id: string;
  permissions: PermissionSet;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
  departments: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
  details: ActivityLogDetails;
}

interface EmployeeDetailsDialogProps {
  employee: Employee;
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated: () => void;
}

export const EmployeeDetailsDialog = ({
  employee,
  departments,
  open,
  onOpenChange,
  onEmployeeUpdated
}: EmployeeDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [role, setRole] = useState<EmployeeRole>(employee.role as EmployeeRole);
  const [status, setStatus] = useState<EmployeeStatus>(employee.status as EmployeeStatus);
  const [departmentId, setDepartmentId] = useState(employee.department_id || "");
  const [hireDate, setHireDate] = useState(employee.hire_date || "");

  useEffect(() => {
    if (open) {
      fetchActivityLogs();
    }
  }, [open, employee.id]);

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs((data || []).map(log => ({
        ...log,
        details: log.details as ActivityLogDetails
      })));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          role,
          status,
          department_id: departmentId || null,
          hire_date: hireDate || null
        })
        .eq('id', employee.id);

      if (error) throw error;

      // Log the activity
      await supabase.rpc('log_employee_activity', {
        p_action: 'employee_updated',
        p_resource_type: 'employee',
        p_resource_id: employee.id,
        p_details: {
          changes: {
            role: { from: employee.role, to: role },
            status: { from: employee.status, to: status },
            department_id: { from: employee.department_id, to: departmentId }
          }
        }
      });

      toast.success("Employee updated successfully");
      onEmployeeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error("Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'INACTIVE': return 'secondary';
      case 'PENDING': return 'outline';
      case 'SUSPENDED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive';
      case 'ADMIN': return 'default';
      case 'SUPPORT': return 'secondary';
      case 'OPS': return 'outline';
      case 'VIEWER': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Employee Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <div className="text-sm text-muted-foreground">
                      {employee.profiles.first_name} {employee.profiles.last_name}
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="text-sm text-muted-foreground">
                      {employee.profiles.email}
                    </div>
                  </div>
                  <div>
                    <Label>Employee ID</Label>
                    <div className="text-sm text-muted-foreground">
                      {employee.employee_id}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="hire-date">Hire Date</Label>
                    <Input
                      id="hire-date"
                      type="date"
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Role & Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as EmployeeRole)}>
                      <SelectTrigger>
                        <SelectValue />
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

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as EmployeeStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Last Login</Label>
                    <div className="text-sm text-muted-foreground">
                      {employee.last_login 
                        ? new Date(employee.last_login).toLocaleString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Last Activity</Label>
                    <div className="text-sm text-muted-foreground">
                      {employee.last_activity 
                        ? new Date(employee.last_activity).toLocaleString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Current Role</Label>
                    <Badge variant={getRoleBadgeVariant(employee.role)} className="mt-1">
                      {employee.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={getStatusBadgeVariant(employee.status)} className="mt-1">
                      {employee.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          {log.resource_type && (
                            <Badge variant="outline">
                              {log.resource_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {log.details && (
                            <pre className="text-xs text-muted-foreground">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {role === 'SUPER_ADMIN' && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-destructive mb-2">Super Admin</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Full platform access</li>
                          <li>• Employee management</li>
                          <li>• Billing and subscriptions</li>
                          <li>• System configuration</li>
                        </ul>
                      </div>
                    )}
                    {['ADMIN', 'SUPER_ADMIN'].includes(role) && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Admin</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Tenant management</li>
                          <li>• Configuration access</li>
                          <li>• Most operations</li>
                          <li>• Report generation</li>
                        </ul>
                      </div>
                    )}
                    {['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(role) && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Support</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Customer support</li>
                          <li>• Tenant troubleshooting</li>
                          <li>• Limited admin access</li>
                          <li>• Activity monitoring</li>
                        </ul>
                      </div>
                    )}
                    {['OPS', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(role) && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Operations</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• System monitoring</li>
                          <li>• Performance metrics</li>
                          <li>• Health checks</li>
                          <li>• Basic analytics</li>
                        </ul>
                      </div>
                    )}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Viewer</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Read-only dashboard access</li>
                        <li>• View reports</li>
                        <li>• Basic tenant information</li>
                        <li>• Limited analytics</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};