import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  Play,
  Building,
  User,
  Lock
} from 'lucide-react';
import { TenantImpersonationRequest } from '@/types/impersonation';
import { useToast } from '@/hooks/use-toast';

interface StartImpersonationDialogProps {
  children: React.ReactNode;
  onStart?: (request: TenantImpersonationRequest) => void;
}

const mockTenants = [
  { id: 'tenant-1', name: 'Bella Vista Restaurant', owner: 'Maria Rodriguez' },
  { id: 'tenant-2', name: 'Ocean Breeze Café', owner: 'James Wilson' },
  { id: 'tenant-3', name: 'Golden Dragon Asian Cuisine', owner: 'Li Wei' },
  { id: 'tenant-4', name: 'Metro Diner', owner: 'Sarah Johnson' },
  { id: 'tenant-5', name: 'Sunrise Bistro', owner: 'Carlos Martinez' },
];

const permissionOptions = [
  { id: 'view_bookings', label: 'View Bookings', description: 'Access booking data and reservations' },
  { id: 'manage_bookings', label: 'Manage Bookings', description: 'Create, update, and cancel bookings' },
  { id: 'view_customers', label: 'View Customers', description: 'Access customer information' },
  { id: 'view_analytics', label: 'View Analytics', description: 'Access dashboard and reports' },
  { id: 'manage_settings', label: 'Manage Settings', description: 'Update tenant configuration' },
  { id: 'view_financial', label: 'View Financial Data', description: 'Access billing and revenue data' },
];

export function StartImpersonationDialog({ children, onStart }: StartImpersonationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    reason: '',
    duration: 60,
    permissions: [] as string[],
    ticketNumber: '',
    urgencyLevel: 'medium' as const,
  });
  const { toast } = useToast();

  const handleStart = async () => {
    if (!formData.tenantId || !formData.reason) {
      toast({
        title: "Missing Information",
        description: "Please select a tenant and provide a reason.",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      onStart?.(formData);
      
      toast({
        title: "Impersonation Started",
        description: "You can now access the tenant account with restricted permissions.",
      });
      
      setOpen(false);
      setFormData({
        tenantId: '',
        reason: '',
        duration: 60,
        permissions: [],
        ticketNumber: '',
        urgencyLevel: 'medium',
      });
    } catch (error) {
      toast({
        title: "Failed to Start",
        description: "Unable to start impersonation session.",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const selectedTenant = mockTenants.find(t => t.id === formData.tenantId);
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Start Impersonation Session
          </DialogTitle>
          <DialogDescription>
            Create a secure, time-limited session to access a tenant account for support purposes.
            All actions will be logged and audited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Security Warning */}
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-800 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                Security Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>• All actions during this session will be logged and audited</li>
                <li>• Session will automatically expire after the specified duration</li>
                <li>• Only use for legitimate support and troubleshooting purposes</li>
                <li>• Notify the tenant owner when accessing sensitive data</li>
              </ul>
            </CardContent>
          </Card>

          {/* Tenant Selection */}
          <div className="space-y-2">
            <Label htmlFor="tenant">Target Tenant *</Label>
            <Select value={formData.tenantId} onValueChange={(value) => setFormData(prev => ({ ...prev, tenantId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant to impersonate" />
              </SelectTrigger>
              <SelectContent>
                {mockTenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">Owner: {tenant.owner}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Session Duration (minutes) *</Label>
              <Select 
                value={formData.duration.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select 
                value={formData.urgencyLevel} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgencyLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className={getUrgencyColor('low')}>Low</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className={getUrgencyColor('medium')}>Medium</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className={getUrgencyColor('high')}>High</span>
                  </SelectItem>
                  <SelectItem value="critical">
                    <span className={getUrgencyColor('critical')}>Critical</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Impersonation *</Label>
            <Textarea
              id="reason"
              placeholder="Describe why you need to access this tenant account..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Ticket Number */}
          <div className="space-y-2">
            <Label htmlFor="ticket">Support Ticket Number</Label>
            <Input
              id="ticket"
              placeholder="TICKET-2024-001"
              value={formData.ticketNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, ticketNumber: e.target.value }))}
            />
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Requested Permissions</Label>
            <div className="grid grid-cols-1 gap-2">
              {permissionOptions.map((permission) => (
                <div
                  key={permission.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.permissions.includes(permission.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => togglePermission(permission.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{permission.label}</div>
                      <div className="text-xs text-muted-foreground">{permission.description}</div>
                    </div>
                    {formData.permissions.includes(permission.id) && (
                      <Badge variant="secondary">Selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Summary */}
          {selectedTenant && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Session Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{selectedTenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formData.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Permissions:</span>
                  <span className="font-medium">{formData.permissions.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency:</span>
                  <span className={`font-medium ${getUrgencyColor(formData.urgencyLevel)}`}>
                    {formData.urgencyLevel}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isStarting}>
            <Play className="h-4 w-4 mr-2" />
            {isStarting ? 'Starting...' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}