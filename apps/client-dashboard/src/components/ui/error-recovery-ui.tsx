/**
 * ErrorRecoveryUI Component
 * 
 * User-friendly error display with retry functionality and offline detection
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  WifiOff,
  RefreshCcw,
  Server,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ErrorDetails, ErrorCode } from '@/utils/error-handler';

// ============================================================================
// Types
// ============================================================================

export interface ErrorRecoveryUIProps {
  /** Error details to display */
  error: ErrorDetails | null;
  
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  
  /** Current retry attempt number */
  retryAttempt?: number;
  
  /** Delay until next retry (in ms) */
  retryDelay?: number | null;
  
  /** Whether user is offline */
  isOffline?: boolean;
  
  /** Callback when user clicks retry */
  onRetry?: () => void;
  
  /** Callback when user dismisses error */
  onDismiss?: () => void;
  
  /** Show dismiss button */
  showDismiss?: boolean;
  
  /** Compact mode (smaller display) */
  compact?: boolean;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const ERROR_ICONS: Record<ErrorCode, React.ComponentType<{ className?: string }>> = {
  [ErrorCode.NETWORK_ERROR]: WifiOff,
  [ErrorCode.OFFLINE]: WifiOff,
  [ErrorCode.TIMEOUT]: Server,
  [ErrorCode.SERVER_ERROR]: Server,
  [ErrorCode.SERVICE_UNAVAILABLE]: Server,
  [ErrorCode.RATE_LIMIT]: ShieldAlert,
  [ErrorCode.VALIDATION_ERROR]: AlertCircle,
  [ErrorCode.UNAUTHORIZED]: ShieldAlert,
  [ErrorCode.FORBIDDEN]: ShieldAlert,
  [ErrorCode.NOT_FOUND]: AlertCircle,
  [ErrorCode.INVALID_DATA]: AlertCircle,
  [ErrorCode.MISSING_DATA]: AlertCircle,
  [ErrorCode.UNKNOWN_ERROR]: AlertCircle,
};

// ============================================================================
// Component
// ============================================================================

export const ErrorRecoveryUI: React.FC<ErrorRecoveryUIProps> = ({
  error,
  isRetrying = false,
  retryAttempt = 0,
  retryDelay = null,
  isOffline = false,
  onRetry,
  onDismiss,
  showDismiss = true,
  compact = false,
}) => {
  // Don't render if no error
  if (!error) {
    return null;
  }

  const Icon = ERROR_ICONS[error.code];
  const showRetryButton = error.retryable && onRetry && !isRetrying;
  const showOfflineIndicator = isOffline || error.code === ErrorCode.OFFLINE;

  return (
    <Alert 
      variant="destructive" 
      className={compact ? 'py-3' : 'py-4'}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 space-y-2">
          {/* Error Title */}
          <div className="flex items-center justify-between gap-2">
            <AlertTitle className="mb-0 flex items-center gap-2">
              {showOfflineIndicator ? 'You\'re Offline' : 'Unable to Complete Request'}
              
              {isRetrying && (
                <Badge variant="outline" className="ml-2 gap-1">
                  <RefreshCcw className="w-3 h-3 animate-spin" />
                  Retrying...
                </Badge>
              )}
            </AlertTitle>
            
            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Error Message */}
          <AlertDescription>
            <p className={compact ? 'text-sm' : ''}>
              {error.userMessage}
            </p>
            
            {/* Retry Status */}
            {isRetrying && retryAttempt > 0 && (
              <p className="text-sm mt-2 opacity-90">
                Attempt {retryAttempt}
                {retryDelay && ` - retrying in ${Math.ceil(retryDelay / 1000)}s...`}
              </p>
            )}
            
            {/* Offline Help */}
            {showOfflineIndicator && (
              <p className="text-sm mt-2 opacity-90">
                Check your internet connection and try again when you're back online.
              </p>
            )}
          </AlertDescription>

          {/* Action Buttons */}
          {(showRetryButton || error.code === ErrorCode.RATE_LIMIT) && (
            <div className="flex gap-2 mt-3">
              {showRetryButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying || isOffline}
                  className="gap-2 bg-white hover:bg-gray-50"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Try Again
                </Button>
              )}
              
              {error.code === ErrorCode.RATE_LIMIT && (
                <p className="text-sm self-center opacity-90">
                  Please wait a moment before trying again
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

// ============================================================================
// Display Name
// ============================================================================

ErrorRecoveryUI.displayName = 'ErrorRecoveryUI';

// ============================================================================
// Export
// ============================================================================

export default ErrorRecoveryUI;
