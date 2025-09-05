import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Edit,
  Trash2,
  User,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  UserCheck,
  Coffee,
} from "lucide-react";
import {
  Employee,
  Shift,
  TimeClockEntry,
  StaffRole,
  ShiftStatus,
  CreateEmployeeRequest,
} from "@/types/restaurant";

// Mock data for employees
const mockEmployees: Employee[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    employee_number: "EMP001",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@restaurant.com",
    phone: "(555) 123-4567",
    role: "chef",
    hourly_rate: 2800, // $28.00
    hire_date: "2024-01-15",
    status: "active",
    emergency_contact_name: "Jane Doe",
    emergency_contact_phone: "(555) 987-6543",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    employee_number: "EMP002",
    first_name: "Sarah",
    last_name: "Wilson",
    email: "sarah.wilson@restaurant.com",
    phone: "(555) 234-5678",
    role: "server",
    hourly_rate: 1500, // $15.00
    hire_date: "2024-02-01",
    status: "active",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    employee_number: "EMP003",
    first_name: "Mike",
    last_name: "Johnson",
    email: "mike.johnson@restaurant.com",
    phone: "(555) 345-6789",
    role: "manager",
    hourly_rate: 3500, // $35.00
    hire_date: "2023-12-01",
    status: "active",
    created_at: "2023-12-01T00:00:00Z",
    updated_at: "2023-12-01T00:00:00Z",
  },
];

// Mock data for shifts
const mockShifts: Shift[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    employee_id: "1",
    scheduled_start: "2024-09-04T09:00:00Z",
    scheduled_end: "2024-09-04T17:00:00Z",
    actual_start: "2024-09-04T08:55:00Z",
    status: "checked_in",
    hourly_rate: 2800,
    created_at: "2024-09-03T00:00:00Z",
    updated_at: "2024-09-04T08:55:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    employee_id: "2",
    scheduled_start: "2024-09-04T11:00:00Z",
    scheduled_end: "2024-09-04T19:00:00Z",
    actual_start: "2024-09-04T11:05:00Z",
    actual_end: "2024-09-04T19:15:00Z",
    status: "checked_out",
    hourly_rate: 1500,
    created_at: "2024-09-03T00:00:00Z",
    updated_at: "2024-09-04T19:15:00Z",
  },
];

const roleOptions: StaffRole[] = [
  "manager", "chef", "sous_chef", "line_cook", "server", "bartender", "host", "busser", "dishwasher"
];

const roleColors = {
  manager: "bg-purple-100 text-purple-800",
  chef: "bg-red-100 text-red-800",
  sous_chef: "bg-orange-100 text-orange-800",
  line_cook: "bg-yellow-100 text-yellow-800",
  server: "bg-blue-100 text-blue-800",
  bartender: "bg-green-100 text-green-800",
  host: "bg-pink-100 text-pink-800",
  busser: "bg-gray-100 text-gray-800",
  dishwasher: "bg-indigo-100 text-indigo-800",
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  on_break: "bg-yellow-100 text-yellow-800",
  checked_out: "bg-gray-100 text-gray-800",
  no_show: "bg-red-100 text-red-800",
};

const StaffManagement: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState<Partial<CreateEmployeeRequest>>({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "server",
    hourly_rate: 0,
    hire_date: new Date().toISOString().split('T')[0],
  });

  // Filter shifts for selected date
  const todayShifts = useMemo(() => {
    return shifts.filter(shift => 
      shift.scheduled_start.startsWith(selectedDate)
    ).map(shift => ({
      ...shift,
      employee: employees.find(emp => emp.id === shift.employee_id)
    }));
  }, [shifts, employees, selectedDate]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const activeEmployees = employees.filter(emp => emp.status === "active").length;
    const totalShifts = todayShifts.length;
    const checkedInShifts = todayShifts.filter(shift => shift.status === "checked_in").length;
    const completedShifts = todayShifts.filter(shift => shift.status === "checked_out").length;
    const avgHourlyRate = employees.length > 0 ? 
      employees.reduce((sum, emp) => sum + (emp.hourly_rate || 0), 0) / employees.length : 0;

    return {
      activeEmployees,
      totalShifts,
      checkedInShifts,
      completedShifts,
      avgHourlyRate,
    };
  }, [employees, todayShifts]);

  const handleCreateEmployee = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!employeeForm.first_name || !employeeForm.last_name || !employeeForm.email || !employeeForm.employee_number) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate employee number
      if (employees.some(emp => emp.employee_number === employeeForm.employee_number)) {
        toast({
          title: "Validation Error",
          description: "Employee number already exists",
          variant: "destructive",
        });
        return;
      }

      // Create new employee
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        tenant_id: tenant?.id || "",
        employee_number: employeeForm.employee_number!,
        first_name: employeeForm.first_name!,
        last_name: employeeForm.last_name!,
        email: employeeForm.email!,
        phone: employeeForm.phone || "",
        role: employeeForm.role!,
        hourly_rate: employeeForm.hourly_rate ? Math.round(employeeForm.hourly_rate * 100) : undefined,
        hire_date: employeeForm.hire_date!,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setEmployees(prev => [...prev, newEmployee]);
      setShowEmployeeDialog(false);
      resetEmployeeForm();
      
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    
    try {
      setIsLoading(true);
      
      const updatedEmployee: Employee = {
        ...editingEmployee,
        first_name: employeeForm.first_name!,
        last_name: employeeForm.last_name!,
        email: employeeForm.email!,
        phone: employeeForm.phone || "",
        role: employeeForm.role!,
        hourly_rate: employeeForm.hourly_rate ? Math.round(employeeForm.hourly_rate * 100) : undefined,
        updated_at: new Date().toISOString(),
      };

      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id ? updatedEmployee : emp
      ));
      
      setShowEmployeeDialog(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  const handleShiftStatusChange = async (shiftId: string, newStatus: ShiftStatus) => {
    try {
      setShifts(prev => prev.map(shift => 
        shift.id === shiftId 
          ? { 
              ...shift, 
              status: newStatus,
              ...(newStatus === "checked_in" && !shift.actual_start ? { actual_start: new Date().toISOString() } : {}),
              ...(newStatus === "checked_out" ? { actual_end: new Date().toISOString() } : {}),
              updated_at: new Date().toISOString()
            }
          : shift
      ));
      
      toast({
        title: "Success",
        description: `Shift status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shift status",
        variant: "destructive",
      });
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      employee_number: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "server",
      hourly_rate: 0,
      hire_date: new Date().toISOString().split('T')[0],
    });
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      employee_number: employee.employee_number,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      hourly_rate: employee.hourly_rate ? employee.hourly_rate / 100 : 0,
      hire_date: employee.hire_date,
    });
    setShowEmployeeDialog(true);
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage employee records, schedules, and time tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
          <Button onClick={() => setShowEmployeeDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold">{analytics.activeEmployees}</p>
              </div>
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Shifts</p>
                <p className="text-2xl font-bold">{analytics.totalShifts}</p>
              </div>
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold text-green-600">{analytics.checkedInShifts}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{analytics.completedShifts}</p>
              </div>
              <UserCheck className="w-6 h-6 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rate</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.avgHourlyRate)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="shifts">Today's Shifts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          {/* Employees List */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(employee => (
                  <Card key={employee.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar>
                          <AvatarFallback>
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {employee.employee_number}
                          </p>
                          <Badge className={`mt-1 ${roleColors[employee.role]}`}>
                            {employee.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.hourly_rate && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatCurrency(employee.hourly_rate)}/hr</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Hired: {new Date(employee.hire_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                          {employee.status}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {employee.first_name} {employee.last_name}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          {/* Today's Shifts */}
          <Card>
            <CardHeader>
              <CardTitle>
                Shifts for {new Date(selectedDate).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayShifts.map(shift => (
                  <Card key={shift.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {shift.employee?.first_name[0]}{shift.employee?.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">
                              {shift.employee?.first_name} {shift.employee?.last_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {shift.employee?.role.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatTime(shift.scheduled_start)} - {formatTime(shift.scheduled_end)}
                            </p>
                            {shift.actual_start && (
                              <p className="text-xs text-muted-foreground">
                                Actual: {formatTime(shift.actual_start)} 
                                {shift.actual_end && ` - ${formatTime(shift.actual_end)}`}
                              </p>
                            )}
                          </div>

                          <Badge className={statusColors[shift.status]}>
                            {shift.status.replace('_', ' ')}
                          </Badge>

                          <div className="flex gap-1">
                            {shift.status === "scheduled" && (
                              <Button
                                size="sm"
                                onClick={() => handleShiftStatusChange(shift.id, "checked_in")}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Check In
                              </Button>
                            )}
                            
                            {shift.status === "checked_in" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShiftStatusChange(shift.id, "on_break")}
                                >
                                  <Coffee className="w-4 h-4 mr-1" />
                                  Break
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleShiftStatusChange(shift.id, "checked_out")}
                                >
                                  <PauseCircle className="w-4 h-4 mr-1" />
                                  Check Out
                                </Button>
                              </>
                            )}
                            
                            {shift.status === "on_break" && (
                              <Button
                                size="sm"
                                onClick={() => handleShiftStatusChange(shift.id, "checked_in")}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Return
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {todayShifts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No shifts scheduled for this date
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Schedule Management</h3>
              <p className="text-muted-foreground">
                Advanced scheduling features coming soon. Create and manage employee schedules, 
                handle shift swaps, and optimize labor costs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee ? "Update employee information" : "Create a new employee record"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number *</Label>
                <Input
                  id="employee_number"
                  value={employeeForm.employee_number}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, employee_number: e.target.value }))}
                  placeholder="EMP001"
                  disabled={!!editingEmployee}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={employeeForm.role}
                  onValueChange={(value) => setEmployeeForm(prev => ({ ...prev, role: value as StaffRole }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={employeeForm.first_name}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={employeeForm.last_name}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@restaurant.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={employeeForm.hourly_rate}
                  onChange={(e) => setEmployeeForm(prev => ({ 
                    ...prev, 
                    hourly_rate: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="15.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date *</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={employeeForm.hire_date}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, hire_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingEmployee ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
