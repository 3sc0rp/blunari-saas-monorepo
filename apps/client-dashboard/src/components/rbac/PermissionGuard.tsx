// Week 19-20: RBAC - Permission Guard Component
// Purpose: Conditional rendering based on permissions
// Author: AI Agent
// Date: October 20, 2025

import { ReactNode } from 'react'
import { useHasPermission, useCanPerform, useCurrentUserIsAdmin } from '@/hooks/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

interface PermissionGuardProps {
  tenantId: string
  children: ReactNode
  fallback?: ReactNode
  // Option 1: Check specific permission name
  permissionName?: string
  // Option 2: Check resource + action
  resourceType?: string
  action?: string
  // Additional options
  resourceId?: string
  context?: Record<string, any>
  // Show access denied message if permission fails
  showDenied?: boolean
}

/**
 * Permission Guard Component
 * 
 * Conditionally renders children based on user permissions.
 * 
 * Usage:
 * ```tsx
 * <PermissionGuard tenantId={tenantId} permissionName="bookings.create">
 *   <CreateBookingButton />
 * </PermissionGuard>
 * 
 * <PermissionGuard tenantId={tenantId} resourceType="bookings" action="delete">
 *   <DeleteButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  tenantId,
  children,
  fallback = null,
  permissionName,
  resourceType,
  action,
  resourceId,
  context,
  showDenied = false,
}: PermissionGuardProps) {
  let hasPermission = false

  if (permissionName) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hasPermission = useHasPermission(tenantId, permissionName, { resourceId, context })
  } else if (resourceType && action) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hasPermission = useCanPerform(tenantId, resourceType, action, { resourceId, context })
  } else {
    console.error('PermissionGuard: Either permissionName or (resourceType + action) is required')
    return <>{fallback}</>
  }

  if (!hasPermission) {
    if (showDenied) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature.
          </AlertDescription>
        </Alert>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Admin Guard Component
 * 
 * Only renders children if user has admin role (admin, manager, or super_admin).
 * 
 * Usage:
 * ```tsx
 * <AdminGuard tenantId={tenantId}>
 *   <AdminPanel />
 * </AdminGuard>
 * ```
 */
export function AdminGuard({
  tenantId,
  children,
  fallback = null,
  showDenied = false,
}: {
  tenantId: string
  children: ReactNode
  fallback?: ReactNode
  showDenied?: boolean
}) {
  const isAdmin = useCurrentUserIsAdmin(tenantId)

  if (!isAdmin) {
    if (showDenied) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You need administrator privileges to access this feature.
          </AlertDescription>
        </Alert>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Multi-Permission Guard Component
 * 
 * Check if user has ANY or ALL of the specified permissions.
 * 
 * Usage:
 * ```tsx
 * <MultiPermissionGuard 
 *   tenantId={tenantId} 
 *   permissions={['bookings.create', 'bookings.update']}
 *   requireAll={false}
 * >
 *   <BookingActions />
 * </MultiPermissionGuard>
 * ```
 */
export function MultiPermissionGuard({
  tenantId,
  permissions,
  requireAll = false,
  children,
  fallback = null,
  showDenied = false,
}: {
  tenantId: string
  permissions: string[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
  showDenied?: boolean
}) {
  // Check each permission
  const permissionResults = permissions.map((permissionName) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useHasPermission(tenantId, permissionName)
  })

  const hasPermission = requireAll
    ? permissionResults.every((result) => result)
    : permissionResults.some((result) => result)

  if (!hasPermission) {
    if (showDenied) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have the required permissions to access this feature.
          </AlertDescription>
        </Alert>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
