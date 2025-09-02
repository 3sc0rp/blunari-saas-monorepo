import { useState, useEffect } from "react";
// Remove AdminLayout import as it's not being used and may cause layout conflicts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  Activity,
  Users,
} from "lucide-react";
import { InviteEmployeeDialog } from "@/components/employees/InviteEmployeeDialog";
import { EmployeeDetailsDialog } from "@/components/employees/EmployeeDetailsDialog";
import { BulkActionsDialog } from "@/components/employees/BulkActionsDialog";

interface Employee {
  id: string;
  employee_id: string;
  role: string;
  status: string;
  hire_date: string | null;
  last_login: string | null;
  last_activity: string | null;
  user_id: string;
  department_id: string | null;
  permissions: any;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  departments: {
    name: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Fix the query to properly join with profiles table
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          profiles!inner(*),
          departments(name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees((data || []) as unknown as Employee[]);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.profiles?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.profiles?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.profiles?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || employee.department_id === departmentFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      case "PENDING":
        return "outline";
      case "SUSPENDED":
        return "destructive";
      default:
        return "secondary";
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
      case "VIEWER":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    setSelectedEmployees((prev) =>
      checked ? [...prev, employeeId] : prev.filter((id) => id !== employeeId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmployees(checked ? filteredEmployees.map((e) => e.id) : []);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage staff, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEmployees.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkActions(true)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Bulk Actions ({selectedEmployees.length})
            </Button>
          )}
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Invite Employee
          </Button>
        </div>
      </div>

      {/* ... keep existing code (stats cards, filters, table, dialogs) */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter((e) => e.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter((e) => e.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPPORT">Support</SelectItem>
                <SelectItem value="OPS">Operations</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedEmployees.length === filteredEmployees.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) =>
                        handleSelectEmployee(employee.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {employee.profiles?.first_name?.[0] ||
                          employee.profiles?.email?.[0] ||
                          "U"}
                      </div>
                      <div>
                        <div className="font-medium">
                          {employee.profiles?.first_name || ""}{" "}
                          {employee.profiles?.last_name || ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.profiles?.email || "No email"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {employee.employee_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(employee.role)}>
                      {employee.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.departments?.name || "No Department"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(employee.status)}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.last_activity
                      ? new Date(employee.last_activity).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {employee.hire_date
                      ? new Date(employee.hire_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteEmployeeDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        departments={departments}
        onInviteSent={fetchEmployees}
      />

      <BulkActionsDialog
        open={showBulkActions}
        onOpenChange={setShowBulkActions}
        selectedEmployees={selectedEmployees}
        employees={employees}
        departments={departments}
        onActionsComplete={() => {
          fetchEmployees();
          setSelectedEmployees([]);
        }}
      />

      {selectedEmployee && (
        <EmployeeDetailsDialog
          employee={selectedEmployee}
          departments={departments}
          open={!!selectedEmployee}
          onOpenChange={(open) => !open && setSelectedEmployee(null)}
          onEmployeeUpdated={fetchEmployees}
        />
      )}
    </div>
  );
};
