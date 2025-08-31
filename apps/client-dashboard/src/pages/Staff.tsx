import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Mail, Phone, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface StaffMember {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: 'ADMIN' | 'SUPPORT' | 'OPS' | 'VIEWER' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
  employee_id: string;
  user_id: string;
  created_at: string;
  invitation_sent?: boolean;
  invited_at?: string;
}

const Staff: React.FC = () => {
  const { tenant } = useTenant();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_id: '',
    role: 'VIEWER' as const
  });
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchStaffMembers();
    }
  }, [tenant?.id]);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          status,
          employee_id,
          user_id,
          created_at,
          invitation_sent,
          invited_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Generate a unique employee_id
      const employee_id = `EMP-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone || null,
            role: formData.role,
            status: 'PENDING',
            employee_id: employee_id,
            user_id: '00000000-0000-0000-0000-000000000000', // Placeholder user_id
            invitation_sent: false
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setStaffMembers(prev => [data, ...prev]);
      setShowAddDialog(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        employee_id: '',
        role: 'VIEWER'
      });
      toast.success('Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error('Failed to add staff member');
    }
  };

  const handleSendInvitation = async (employeeId: string, email: string) => {
    try {
      setSendingInvitation(employeeId);
      
      const { error } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          employeeId,
          email
        }
      });

      if (error) {
        throw error;
      }

      // Update the UI to show invitation was sent
      setStaffMembers(prev => 
        prev.map(staff => 
          staff.employee_id === employeeId 
            ? { ...staff, invitation_sent: true, invited_at: new Date().toISOString() }
            : staff
        )
      );

      toast.success('Invitation sent successfully');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(`Failed to send invitation: ${error.message}`);
    } finally {
      setSendingInvitation(null);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStaffMembers(prev => prev.filter(staff => staff.id !== id));
      toast.success('Staff member removed');
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      SUPER_ADMIN: 'bg-destructive/10 text-destructive',
      ADMIN: 'bg-destructive/10 text-destructive',
      SUPPORT: 'bg-warning/10 text-warning',
      OPS: 'bg-success/10 text-success',
      VIEWER: 'bg-secondary/10 text-secondary'
    };
    return colors[role as keyof typeof colors] || 'bg-secondary/10 text-secondary';
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return 'SM';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-64 bg-surface-2 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-40 bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface-2 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-h1 font-bold text-text">Staff Management</h1>
          <p className="text-text-muted">Manage restaurant staff and roles</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
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
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Staff Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {staffMembers.length === 0 ? (
        <EmptyState
          variant="no-staff"
          action={{
            label: "Add Staff Member",
            onClick: () => setShowAddDialog(true),
            icon: UserPlus
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4"
        >
          {staffMembers.map((staff, index) => (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="bg-surface border-surface-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-brand/10 text-brand font-semibold">
                        {getInitials(staff.first_name, staff.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-h4 font-semibold text-text truncate">
                          {staff.first_name && staff.last_name 
                            ? `${staff.first_name} ${staff.last_name}`
                            : staff.email || staff.employee_id}
                        </h3>
                        <Badge className={getRoleColor(staff.role)}>
                          {staff.role}
                        </Badge>
                        <Badge variant={staff.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {staff.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-body-sm text-text-muted">
                        {staff.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                        )}
                        {staff.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs">
                          <span>ID: {staff.employee_id}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-text-subtle mt-1">
                        Added {new Date(staff.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-40">
                        {staff.status === 'PENDING' && !staff.invitation_sent && staff.email && (
                          <DropdownMenuItem 
                            onClick={() => handleSendInvitation(staff.employee_id, staff.email || '')}
                            disabled={sendingInvitation === staff.employee_id}
                          >
                            {sendingInvitation === staff.employee_id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            {sendingInvitation === staff.employee_id ? 'Sending...' : 'Send Invitation'}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteStaff(staff.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Staff;