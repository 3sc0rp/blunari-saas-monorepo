// Week 19-20: RBAC - Permission Matrix Component
// Purpose: Visual grid for assigning permissions to roles
// Author: AI Agent
// Date: October 20, 2025

import { useState, useMemo } from 'react'
import { Check, X, ChevronDown, ChevronRight, Shield, AlertTriangle } from 'lucide-react'
import {
  useRoles,
  usePermissions,
  usePermissionGroups,
  useRole,
  useAssignRolePermissions,
  type Role,
  type Permission,
} from '@/hooks/rbac'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PermissionMatrixProps {
  tenantId: string
}

export function PermissionMatrix({ tenantId }: PermissionMatrixProps) {
  const { toast } = useToast()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Queries
  const { data: roles } = useRoles(tenantId, true)
  const { data: permissionsData } = usePermissions(tenantId)
  const { data: permissionGroups } = usePermissionGroups()
  const { data: selectedRole } = useRole(selectedRoleId || undefined)

  // Mutation
  const assignPermissions = useAssignRolePermissions(selectedRoleId || '')

  // Filter to custom roles only for editing
  const editableRoles = roles?.filter((r) => r.role_type === 'custom') || []

  // Group permissions by permission_group_id
  const groupedPermissions = useMemo(() => {
    if (!permissionsData?.permissions) return {}

    return permissionsData.permissions.reduce((acc, permission) => {
      const groupId = permission.permission_group_id || 'ungrouped'
      if (!acc[groupId]) acc[groupId] = []
      acc[groupId].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }, [permissionsData])

  // Get selected role's permission IDs
  const rolePermissionIds = useMemo(() => {
    if (!selectedRole?.permissions) return new Set<string>()
    return new Set(
      selectedRole.permissions
        .filter((p) => !p.is_inherited)
        .map((p) => p.permission_id)
    )
  }, [selectedRole])

  // Get inherited permission IDs
  const inheritedPermissionIds = useMemo(() => {
    if (!selectedRole?.permissions) return new Set<string>()
    return new Set(
      selectedRole.permissions
        .filter((p) => p.is_inherited)
        .map((p) => p.permission_id)
    )
  }, [selectedRole])

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const togglePermission = (permissionId: string) => {
    if (!selectedRoleId) return

    const newPermissions = new Set(rolePermissionIds)
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId)
    } else {
      newPermissions.add(permissionId)
    }

    handleSavePermissions(Array.from(newPermissions))
  }

  const handleSavePermissions = async (permissionIds: string[]) => {
    if (!selectedRoleId) return

    try {
      await assignPermissions.mutateAsync(permissionIds)
      toast({
        title: 'Permissions updated',
        description: 'Role permissions have been updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update permissions',
        variant: 'destructive',
      })
    }
  }

  const selectAllInGroup = (groupPermissions: Permission[]) => {
    if (!selectedRoleId) return

    const groupPermissionIds = groupPermissions.map((p) => p.id)
    const newPermissions = new Set(rolePermissionIds)
    groupPermissionIds.forEach((id) => newPermissions.add(id))

    handleSavePermissions(Array.from(newPermissions))
  }

  const deselectAllInGroup = (groupPermissions: Permission[]) => {
    if (!selectedRoleId) return

    const groupPermissionIds = new Set(groupPermissions.map((p) => p.id))
    const newPermissions = new Set(
      Array.from(rolePermissionIds).filter((id) => !groupPermissionIds.has(id))
    )

    handleSavePermissions(Array.from(newPermissions))
  }

  if (!editableRoles.length) {
    return (
      <Alert>
        <AlertDescription>
          No custom roles found. Create a role first to assign permissions.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Permission Matrix</h2>
        <p className="text-muted-foreground">
          Assign permissions to roles. System roles cannot be modified.
        </p>
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {editableRoles.map((role) => (
              <Button
                key={role.id}
                variant={selectedRoleId === role.id ? 'default' : 'outline'}
                className="justify-start h-auto p-4"
                onClick={() => setSelectedRoleId(role.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: role.color || '#4CAF50' }}
                  >
                    {role.icon || 'R'}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium truncate">{role.display_name}</div>
                    {role.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {role.description}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Grid */}
      {selectedRoleId ? (
        <div className="space-y-4">
          {/* Role Info */}
          {selectedRole && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Editing permissions for <strong>{selectedRole.display_name}</strong>
                {selectedRole.parent_role_id && (
                  <>
                    {' '}
                    (inherits from parent role)
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Groups */}
          {permissionGroups?.map((group) => {
            const groupPermissions = groupedPermissions[group.id] || []
            if (groupPermissions.length === 0) return null

            const isExpanded = expandedGroups.has(group.id)
            const selectedCount = groupPermissions.filter((p) =>
              rolePermissionIds.has(p.id)
            ).length
            const inheritedCount = groupPermissions.filter((p) =>
              inheritedPermissionIds.has(p.id)
            ).length

            return (
              <Card key={group.id}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto font-semibold">
                          {isExpanded ? (
                            <ChevronDown className="mr-2 h-4 w-4" />
                          ) : (
                            <ChevronRight className="mr-2 h-4 w-4" />
                          )}
                          {group.name}
                          <Badge variant="secondary" className="ml-2">
                            {selectedCount}/{groupPermissions.length}
                          </Badge>
                          {inheritedCount > 0 && (
                            <Badge variant="outline" className="ml-1">
                              +{inheritedCount} inherited
                            </Badge>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllInGroup(groupPermissions)}
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deselectAllInGroup(groupPermissions)}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-2">
                        {groupPermissions.map((permission) => {
                          const isSelected = rolePermissionIds.has(permission.id)
                          const isInherited = inheritedPermissionIds.has(permission.id)

                          return (
                            <div
                              key={permission.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                isSelected
                                  ? 'bg-primary/5 border-primary/20'
                                  : isInherited
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePermission(permission.id)}
                                disabled={assignPermissions.isPending}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{permission.display_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {permission.action}
                                  </Badge>
                                  {permission.scope !== 'tenant' && (
                                    <Badge variant="secondary" className="text-xs">
                                      {permission.scope}
                                    </Badge>
                                  )}
                                  {permission.is_dangerous && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Dangerous
                                    </Badge>
                                  )}
                                  {isInherited && (
                                    <Badge variant="outline" className="text-xs bg-blue-50">
                                      Inherited
                                    </Badge>
                                  )}
                                </div>
                                {permission.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <code className="px-1 py-0.5 bg-muted rounded">
                                    {permission.name}
                                  </code>
                                  <span>•</span>
                                  <span>Resource: {permission.resource}</span>
                                </div>
                              </div>
                              {isSelected ? (
                                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                              ) : isInherited ? (
                                <Check className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}

          {/* Ungrouped Permissions */}
          {groupedPermissions['ungrouped'] && (
            <Card>
              <CardHeader>
                <CardTitle>Other Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupedPermissions['ungrouped'].map((permission) => {
                    const isSelected = rolePermissionIds.has(permission.id)
                    const isInherited = inheritedPermissionIds.has(permission.id)

                    return (
                      <div
                        key={permission.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          isSelected
                            ? 'bg-primary/5 border-primary/20'
                            : isInherited
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePermission(permission.id)}
                          disabled={assignPermissions.isPending}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{permission.display_name}</span>
                            {isInherited && (
                              <Badge variant="outline" className="text-xs">
                                Inherited
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                        {isSelected || isInherited ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Alert>
          <AlertDescription>Select a role above to manage its permissions.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
