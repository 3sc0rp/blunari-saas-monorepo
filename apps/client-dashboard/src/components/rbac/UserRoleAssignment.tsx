// Week 19-20: RBAC - User Role Assignment Component
// Purpose: Assign and manage user roles with scope and time restrictions
// Author: AI Agent
// Date: October 20, 2025

import { useState } from 'react'
import { Plus, X, Calendar, Users } from 'lucide-react'
import {
  useUserRoles,
  useRoles,
  useAssignRole,
  useRevokeRole,
  useBulkAssignRole,
  type UserRole,
} from '@/hooks/rbac'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UserRoleAssignmentProps {
  userId: string
  tenantId: string
  userName?: string
}

export function UserRoleAssignment({
  userId,
  tenantId,
  userName,
}: UserRoleAssignmentProps) {
  const { toast } = useToast()
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)

  // Queries
  const { data: userRoles, isLoading } = useUserRoles(userId, tenantId)
  const { data: roles } = useRoles(tenantId, true)

  // Mutations
  const assignRole = useAssignRole()
  const revokeRole = useRevokeRole()
  const bulkAssignRole = useBulkAssignRole()

  // Get roles that user doesn't have yet
  const availableRoles = roles?.filter(
    (role) => !userRoles?.some((ur) => ur.role_id === role.id)
  )

  const handleAssignRole = async (formData: any) => {
    try {
      await assignRole.mutateAsync({
        tenant_id: tenantId,
        user_id: userId,
        role_id: formData.role_id,
        scope_type: formData.scope_type || undefined,
        scope_id: formData.scope_id || undefined,
        valid_from: formData.valid_from || undefined,
        valid_until: formData.valid_until || undefined,
        notes: formData.notes || undefined,
      })

      toast({
        title: 'Role assigned',
        description: 'Role has been assigned successfully.',
      })
      setIsAssignDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign role',
        variant: 'destructive',
      })
    }
  }

  const handleRevokeRole = async (userRoleId: string) => {
    if (!confirm('Are you sure you want to revoke this role?')) return

    try {
      await revokeRole.mutateAsync(userRoleId)

      toast({
        title: 'Role revoked',
        description: 'Role has been revoked successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke role',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading user roles...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {userName ? `Roles for ${userName}` : 'User Roles'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage role assignments and permissions
          </p>
        </div>
        <Button onClick={() => setIsAssignDialogOpen(true)} disabled={!availableRoles?.length}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Role
        </Button>
      </div>

      {/* Current Roles */}
      {userRoles && userRoles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {userRoles.map((userRole) => {
            const role = roles?.find((r) => r.id === userRole.role_id)
            return (
              <Card key={userRole.role_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: role?.color || '#4CAF50' }}
                      >
                        {role?.icon || 'R'}
                      </div>
                      <div>
                        <CardTitle className="text-base">{userRole.role_display_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {userRole.role_type === 'system' && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                          {userRole.scope_type && (
                            <Badge variant="outline" className="text-xs">
                              {userRole.scope_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeRole(userRole.role_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(userRole.valid_from || userRole.valid_until) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {userRole.valid_from && (
                          <>From {new Date(userRole.valid_from).toLocaleDateString()}</>
                        )}
                        {userRole.valid_until && (
                          <> until {new Date(userRole.valid_until).toLocaleDateString()}</>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Level {userRole.hierarchy_level}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            No roles assigned yet. Assign a role to grant permissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Assign Role Dialog */}
      <AssignRoleDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        onSubmit={handleAssignRole}
        availableRoles={availableRoles || []}
      />
    </div>
  )
}

// Assign Role Dialog Component
function AssignRoleDialog({
  open,
  onOpenChange,
  onSubmit,
  availableRoles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  availableRoles: any[]
}) {
  const [formData, setFormData] = useState({
    role_id: '',
    scope_type: '',
    scope_id: '',
    valid_from: '',
    valid_until: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      role_id: '',
      scope_type: '',
      scope_id: '',
      valid_from: '',
      valid_until: '',
      notes: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>Assign a role to this user with optional restrictions</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role_id">Role *</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) => setFormData({ ...formData, role_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.display_name}
                    {role.role_type === 'system' && (
                      <Badge variant="secondary" className="ml-2">
                        System
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope_type">Scope Type (Optional)</Label>
              <Input
                id="scope_type"
                value={formData.scope_type}
                onChange={(e) => setFormData({ ...formData, scope_type: e.target.value })}
                placeholder="e.g., department"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope_id">Scope ID (Optional)</Label>
              <Input
                id="scope_id"
                value={formData.scope_id}
                onChange={(e) => setFormData({ ...formData, scope_id: e.target.value })}
                placeholder="Scope identifier"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From (Optional)</Label>
              <Input
                id="valid_from"
                type="datetime-local"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until (Optional)</Label>
              <Input
                id="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this role assignment..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign Role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Bulk Assignment Component
export function BulkRoleAssignment({
  tenantId,
  userIds,
  onComplete,
}: {
  tenantId: string
  userIds: string[]
  onComplete?: () => void
}) {
  const { toast } = useToast()
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const { data: roles } = useRoles(tenantId, true)
  const bulkAssignRole = useBulkAssignRole()

  const handleBulkAssign = async () => {
    if (!selectedRoleId) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive',
      })
      return
    }

    try {
      await bulkAssignRole.mutateAsync({
        tenant_id: tenantId,
        user_ids: userIds,
        role_id: selectedRoleId,
      })

      toast({
        title: 'Roles assigned',
        description: `Role assigned to ${userIds.length} user(s) successfully.`,
      })
      onComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign roles',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Role Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Assign role to {userIds.length} selected user(s)
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="bulk-role">Select Role</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.display_name}
                  {role.role_type === 'system' && (
                    <Badge variant="secondary" className="ml-2">
                      System
                    </Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleBulkAssign}
          disabled={!selectedRoleId || bulkAssignRole.isPending}
          className="w-full"
        >
          {bulkAssignRole.isPending ? 'Assigning...' : 'Assign to All Selected Users'}
        </Button>
      </CardContent>
    </Card>
  )
}
