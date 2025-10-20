// Week 19-20: RBAC - Role Selector Component
// Purpose: Reusable dropdown for role selection
// Author: AI Agent
// Date: October 20, 2025

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useRoles } from '@/hooks/rbac'
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react'

interface RoleSelectorProps {
  tenantId: string
  value: string | undefined
  onValueChange: (value: string) => void
  placeholder?: string
  filterSystem?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Role Selector Component
 * 
 * Dropdown for selecting roles with visual hierarchy indicators.
 * 
 * Usage:
 * ```tsx
 * <RoleSelector
 *   tenantId={tenantId}
 *   value={selectedRole}
 *   onValueChange={setSelectedRole}
 *   filterSystem={true}
 *   placeholder="Select a role..."
 * />
 * ```
 */
export function RoleSelector({
  tenantId,
  value,
  onValueChange,
  placeholder = 'Select role...',
  filterSystem = false,
  disabled = false,
  className,
}: RoleSelectorProps) {
  const { data: roles, isLoading } = useRoles(tenantId)

  // Filter roles if needed
  const filteredRoles = filterSystem
    ? roles?.filter((role) => role.role_type === 'custom')
    : roles

  // Sort by hierarchy level
  const sortedRoles = filteredRoles?.sort((a, b) => {
    return a.hierarchy_level - b.hierarchy_level
  })

  const getRoleIcon = (roleType: string, hierarchyLevel: number) => {
    if (roleType === 'system') {
      return <ShieldCheck className="h-4 w-4 text-blue-500" />
    }
    if (hierarchyLevel === 0) {
      return <ShieldAlert className="h-4 w-4 text-red-500" />
    }
    return <Shield className="h-4 w-4 text-gray-500" />
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading roles..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sortedRoles?.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            <div className="flex items-center gap-2">
              {getRoleIcon(role.role_type, role.hierarchy_level)}
              <span>{role.display_name}</span>
              {role.role_type === 'system' && (
                <Badge variant="secondary" className="ml-2">
                  System
                </Badge>
              )}
              {role.is_default && (
                <Badge variant="outline" className="ml-2">
                  Default
                </Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Level {role.hierarchy_level}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
