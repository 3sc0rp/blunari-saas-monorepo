// Week 21-22: Audit Logging - Activity Logger Utilities
// Purpose: Higher-order hooks for automatic activity logging
// Author: AI Agent
// Date: October 20, 2025

import { useEffect, useRef, useCallback } from 'react'
import { useLogActivity, type LogActivityInput, type AuditLogAction } from './useAuditLog'

// =====================================================
// TYPES
// =====================================================

export interface AutoLogOptions {
  resourceId?: string
  resourceName?: string
  metadata?: Record<string, any>
  tags?: string[]
  debounce?: number // milliseconds
  silent?: boolean // Don't show errors
}

export interface SecurityEventInput {
  event: 'login' | 'logout' | 'permission_denied' | 'session_expired' | 'password_change'
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, any>
}

export interface ComplianceEventInput {
  event: 'gdpr_access' | 'gdpr_delete' | 'gdpr_export' | 'data_retention' | 'consent_change'
  resource_type: string
  resource_id?: string
  user_id?: string
  metadata?: Record<string, any>
}

export interface ActionLoggerContext {
  component?: string
  page?: string
  feature?: string
  environment?: string
}

// =====================================================
// HOOK: Auto-Log Component Actions
// =====================================================

/**
 * Automatically log actions for a component
 * @param tenantId - Tenant ID
 * @param action - Action being performed
 * @param resourceType - Resource type
 * @param options - Auto-log options
 */
export function useAutoLog(
  tenantId: string,
  action: AuditLogAction,
  resourceType: string,
  options: AutoLogOptions = {}
) {
  const { mutate: logActivity } = useLogActivity(tenantId)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  const log = useCallback(
    (overrides?: Partial<LogActivityInput>) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      const performLog = () => {
        const input: LogActivityInput = {
          action,
          resource_type: resourceType,
          resource_id: options.resourceId,
          resource_name: options.resourceName,
          metadata: {
            ...options.metadata,
            ...overrides?.metadata,
          },
          tags: [...(options.tags || []), ...(overrides?.tags || [])],
          severity: overrides?.severity || 'info',
          status: overrides?.status || 'success',
          ...overrides,
        }

        logActivity(input)
      }

      // Apply debounce if specified
      if (options.debounce && options.debounce > 0) {
        debounceTimerRef.current = setTimeout(performLog, options.debounce)
      } else {
        performLog()
      }
    },
    [action, resourceType, options, logActivity]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return { log }
}

// =====================================================
// HOOK: Security Event Logger
// =====================================================

/**
 * Log security-related events
 * @param tenantId - Tenant ID
 */
export function useSecurityEvent(tenantId: string) {
  const { mutate: logActivity } = useLogActivity(tenantId)

  const logSecurityEvent = useCallback(
    (input: SecurityEventInput) => {
      const severityMap: Record<SecurityEventInput['event'], 'info' | 'warning' | 'error' | 'critical'> = {
        login: 'info',
        logout: 'info',
        permission_denied: 'warning',
        session_expired: 'warning',
        password_change: 'info',
      }

      const action = input.event as AuditLogAction

      const logInput: LogActivityInput = {
        action,
        resource_type: input.resource_type || 'auth',
        resource_id: input.resource_id,
        severity: severityMap[input.event] || 'info',
        status: 'success',
        metadata: {
          event_type: 'security',
          ...input.metadata,
        },
        tags: ['security', input.event],
      }

      logActivity(logInput)
    },
    [logActivity]
  )

  return { logSecurityEvent }
}

// =====================================================
// HOOK: Compliance Event Logger
// =====================================================

/**
 * Log GDPR/compliance events
 * @param tenantId - Tenant ID
 */
export function useComplianceEvent(tenantId: string) {
  const { mutate: logActivity } = useLogActivity(tenantId)

  const logComplianceEvent = useCallback(
    (input: ComplianceEventInput) => {
      const severityMap: Record<ComplianceEventInput['event'], 'info' | 'warning' | 'error' | 'critical'> = {
        gdpr_access: 'info',
        gdpr_delete: 'warning',
        gdpr_export: 'info',
        data_retention: 'info',
        consent_change: 'info',
      }

      const actionMap: Record<ComplianceEventInput['event'], AuditLogAction> = {
        gdpr_access: 'view',
        gdpr_delete: 'delete',
        gdpr_export: 'export',
        data_retention: 'archive',
        consent_change: 'update',
      }

      const logInput: LogActivityInput = {
        action: actionMap[input.event],
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        severity: severityMap[input.event],
        status: 'success',
        metadata: {
          event_type: 'compliance',
          compliance_event: input.event,
          user_id: input.user_id,
          ...input.metadata,
        },
        tags: ['compliance', 'gdpr', input.event],
      }

      logActivity(logInput)
    },
    [logActivity]
  )

  return { logComplianceEvent }
}

// =====================================================
// HOOK: Generic Action Logger with Context
// =====================================================

/**
 * Generic action logger with automatic context extraction
 * @param tenantId - Tenant ID
 * @param context - Optional context information
 */
export function useActionLogger(tenantId: string, context?: ActionLoggerContext) {
  const { mutate: logActivity } = useLogActivity(tenantId)

  const logAction = useCallback(
    (input: LogActivityInput) => {
      // Extract context from window location and component
      const enrichedMetadata = {
        ...context,
        pathname: window.location.pathname,
        timestamp: new Date().toISOString(),
        ...input.metadata,
      }

      const enrichedInput: LogActivityInput = {
        ...input,
        metadata: enrichedMetadata,
        tags: [...(context ? [context.component, context.feature, context.page].filter(Boolean) : []), ...(input.tags || [])],
      }

      logActivity(enrichedInput)
    },
    [logActivity, context]
  )

  return { logAction }
}

// =====================================================
// HOOK: CRUD Operation Logger
// =====================================================

/**
 * Convenience hook for logging CRUD operations
 * @param tenantId - Tenant ID
 * @param resourceType - Resource type
 */
export function useCRUDLogger(tenantId: string, resourceType: string) {
  const { logAction } = useActionLogger(tenantId, {
    feature: `${resourceType}-management`,
  })

  const logCreate = useCallback(
    (resourceId: string, resourceName?: string, newValues?: Record<string, any>) => {
      logAction({
        action: 'create',
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        new_values: newValues,
        severity: 'info',
        status: 'success',
        tags: ['crud', 'create'],
      })
    },
    [logAction, resourceType]
  )

  const logUpdate = useCallback(
    (
      resourceId: string,
      resourceName?: string,
      oldValues?: Record<string, any>,
      newValues?: Record<string, any>
    ) => {
      logAction({
        action: 'update',
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        old_values: oldValues,
        new_values: newValues,
        severity: 'info',
        status: 'success',
        tags: ['crud', 'update'],
      })
    },
    [logAction, resourceType]
  )

  const logDelete = useCallback(
    (resourceId: string, resourceName?: string, oldValues?: Record<string, any>) => {
      logAction({
        action: 'delete',
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        old_values: oldValues,
        severity: 'warning',
        status: 'success',
        tags: ['crud', 'delete'],
      })
    },
    [logAction, resourceType]
  )

  const logView = useCallback(
    (resourceId: string, resourceName?: string) => {
      logAction({
        action: 'view',
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        severity: 'info',
        status: 'success',
        tags: ['crud', 'view'],
      })
    },
    [logAction, resourceType]
  )

  return {
    logCreate,
    logUpdate,
    logDelete,
    logView,
  }
}

// =====================================================
// HOOK: Error Logger
// =====================================================

/**
 * Log errors and failures
 * @param tenantId - Tenant ID
 */
export function useErrorLogger(tenantId: string) {
  const { logAction } = useActionLogger(tenantId, {
    feature: 'error-handling',
  })

  const logError = useCallback(
    (
      action: AuditLogAction,
      resourceType: string,
      error: Error | string,
      metadata?: Record<string, any>
    ) => {
      const errorMessage = typeof error === 'string' ? error : error.message
      const errorStack = error instanceof Error ? error.stack : undefined

      logAction({
        action,
        resource_type: resourceType,
        severity: 'error',
        status: 'failure',
        error_message: errorMessage,
        metadata: {
          error_stack: errorStack,
          ...metadata,
        },
        tags: ['error', 'failure'],
      })
    },
    [logAction]
  )

  const logCriticalError = useCallback(
    (
      action: AuditLogAction,
      resourceType: string,
      error: Error | string,
      metadata?: Record<string, any>
    ) => {
      const errorMessage = typeof error === 'string' ? error : error.message
      const errorStack = error instanceof Error ? error.stack : undefined

      logAction({
        action,
        resource_type: resourceType,
        severity: 'critical',
        status: 'failure',
        error_message: errorMessage,
        metadata: {
          error_stack: errorStack,
          requires_investigation: true,
          ...metadata,
        },
        tags: ['error', 'critical', 'requires-attention'],
      })
    },
    [logAction]
  )

  return {
    logError,
    logCriticalError,
  }
}

// =====================================================
// HOOK: Page View Logger
// =====================================================

/**
 * Automatically log page views
 * @param tenantId - Tenant ID
 * @param pageName - Page name
 * @param metadata - Optional metadata
 */
export function usePageViewLogger(
  tenantId: string,
  pageName: string,
  metadata?: Record<string, any>
) {
  const { logAction } = useActionLogger(tenantId, {
    page: pageName,
  })

  useEffect(() => {
    logAction({
      action: 'view',
      resource_type: 'page',
      resource_name: pageName,
      severity: 'info',
      status: 'success',
      metadata: {
        page_name: pageName,
        referrer: document.referrer,
        ...metadata,
      },
      tags: ['page-view', pageName.toLowerCase().replace(/\s+/g, '-')],
    })
  }, [pageName]) // Log on mount or when page name changes

  return null
}

// =====================================================
// HOOK: Performance Logger
// =====================================================

/**
 * Log performance metrics
 * @param tenantId - Tenant ID
 */
export function usePerformanceLogger(tenantId: string) {
  const { logAction } = useActionLogger(tenantId, {
    feature: 'performance-monitoring',
  })

  const logPerformance = useCallback(
    (operationName: string, duration: number, metadata?: Record<string, any>) => {
      const severity = duration > 5000 ? 'warning' : duration > 10000 ? 'error' : 'info'

      logAction({
        action: 'view',
        resource_type: 'performance',
        resource_name: operationName,
        severity,
        status: 'success',
        metadata: {
          operation: operationName,
          duration_ms: duration,
          threshold_exceeded: duration > 5000,
          ...metadata,
        },
        tags: ['performance', operationName, duration > 5000 ? 'slow' : 'fast'],
      })
    },
    [logAction]
  )

  return { logPerformance }
}
