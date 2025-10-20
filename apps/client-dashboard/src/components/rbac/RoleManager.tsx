// Week 19-20: RBAC - Role Manager Component
// Purpose: CRUD interface for role management with hierarchy visualization
// Author: AI Agent
// Date: October 20, 2025

import { useState } from 'react'
import { Plus, Edit2, Trash2, Users, ChevronRight, AlertTriangle } from 'lucide-react'
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRole,
  type Role,
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

interface RoleManagerProps {
  tenantId: string
}

export function RoleManager({ tenantId }: RoleManagerProps) {
  const { toast } = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)

  // Queries
  const { data: roles, isLoading } = useRoles(tenantId, true)
  const { data: selectedRole } = useRole(selectedRoleId || undefined)

  // Mutations
  const createRole = useCreateRole()
  const updateRole = useUpdateRole(selectedRoleId || '')
  const deleteRole = useDeleteRole()

  // Organize roles by hierarchy
  const rolesByHierarchy = roles?.reduce((acc, role) => {
    const level = role.hierarchy_level
    if (!acc[level]) acc[level] = []
    acc[level].push(role)
    return acc
  }, {} as Record<number, Role[]>)

  const handleCreateRole = async (formData: any) => {
    try {
      await createRole.mutateAsync({
        tenant_id: tenantId,
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        parent_role_id: formData.parent_role_id || undefined,
        color: formData.color || '#4CAF50',
        icon: formData.icon || 'User',
        is_default: formData.is_default || false,
        max_users: formData.max_users ? parseInt(formData.max_users) : undefined,
      })

      toast({
        title: 'Role created',
        description: `${formData.display_name} has been created successfully.`,
      })
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create role',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateRole = async (formData: any) => {
    try {
      await updateRole.mutateAsync({
        display_name: formData.display_name,
        description: formData.description,
        parent_role_id: formData.parent_role_id || null,
        color: formData.color,
        icon: formData.icon,
        is_default: formData.is_default,
        max_users: formData.max_users ? parseInt(formData.max_users) : null,
      })

      toast({
        title: 'Role updated',
        description: 'Role has been updated successfully.',
      })
      setIsEditDialogOpen(false)
      setSelectedRoleId(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRoleId) return

    try {
      await deleteRole.mutateAsync(selectedRoleId)

      toast({
        title: 'Role deleted',
        description: 'Role has been deleted successfully.',
      })
      setIsDeleteDialogOpen(false)
      setSelectedRoleId(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete role',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading roles...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">
            Manage roles and permissions for your organization
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Role Hierarchy View */}
      <div className="space-y-4">
        {Object.keys(rolesByHierarchy || {})
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((level) => (
            <div key={level} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Level {level} {parseInt(level) === 0 && '(Top Level)'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rolesByHierarchy[parseInt(level)].map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={() => {
                      setSelectedRoleId(role.id)
                      setIsEditDialogOpen(true)
                    }}
                    onDelete={() => {
                      setSelectedRoleId(role.id)
                      setIsDeleteDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Create Role Dialog */}
      <RoleFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateRole}
        title="Create New Role"
        description="Create a new role with specific permissions"
        roles={roles?.filter((r) => r.tenant_id === tenantId) || []}
      />

      {/* Edit Role Dialog */}
      {selectedRole && (
        <RoleFormDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) setSelectedRoleId(null)
          }}
          onSubmit={handleUpdateRole}
          title="Edit Role"
          description="Update role details and permissions"
          roles={roles?.filter((r) => r.tenant_id === tenantId && r.id !== selectedRoleId) || []}
          initialData={selectedRole}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRole?.user_count && selectedRole.user_count > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This role has {selectedRole.user_count} active user(s). Please reassign them before deleting.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={deleteRole.isPending || (selectedRole?.user_count || 0) > 0}
            >
              {deleteRole.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Role Card Component
function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className={role.role_type === 'system' ? 'border-blue-200 bg-blue-50/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: role.color || '#4CAF50' }}
            >
              {role.icon || 'R'}
            </div>
            <div>
              <CardTitle className="text-base">{role.display_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {role.role_type === 'system' && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
                {role.is_default && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {role.role_type === 'custom' && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {role.description && (
          <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
        )}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{role.user_count || 0} users</span>
          </div>
          {role.parent_role_id && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
              <span className="text-xs">Inherits</span>
            </div>
          )}
        </div>
        {role.max_users && (
          <div className="mt-2 text-xs text-muted-foreground">
            Max users: {role.max_users}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Role Form Dialog Component
function RoleFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  roles,
  initialData,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  title: string
  description: string
  roles: Role[]
  initialData?: Role
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    display_name: initialData?.display_name || '',
    description: initialData?.description || '',
    parent_role_id: initialData?.parent_role_id || '',
    color: initialData?.color || '#4CAF50',
    icon: initialData?.icon || 'User',
    is_default: initialData?.is_default || false,
    max_users: initialData?.max_users?.toString() || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <div className="space-y-2">
              <Label htmlFor="name">Role Name (System ID)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., sales_manager"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, no spaces. Used as system identifier.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., Sales Manager"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the role's responsibilities..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parent_role_id">Parent Role (Optional)</Label>
              <Select
                value={formData.parent_role_id}
                onValueChange={(value) => setFormData({ ...formData, parent_role_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Inherit permissions from parent role
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_users">Max Users (Optional)</Label>
              <Input
                id="max_users"
                type="number"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                placeholder="Unlimited"
                min="1"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#4CAF50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="User"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_default" className="font-normal">
              Assign to new users by default
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
