import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Wifi,
  Server,
  Shield,
  FileX,
  RefreshCw,
  Bug,
  Clock,
  CreditCard,
  Database,
  Key,
  Globe,
} from "lucide-react";

interface ErrorStateProps {
  variant:
    | "network-error"
    | "server-error"
    | "permission-denied"
    | "not-found"
    | "timeout"
    | "payment-error"
    | "database-error"
    | "auth-error"
    | "api-error"
    | "general-error";
  title?: string;
  description?: string;
  error?: string | Error;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  showDetails?: boolean;
  retryable?: boolean;
}

const errorStateConfig = {
  "network-error": {
    icon: Wifi,
    title: "Connection problem",
    description: "Please check your internet connection and try again.",
    severity: "warning" as const,
  },
  "server-error": {
    icon: Server,
    title: "Server error",
    description: "Something went wrong on our end. Our team has been notified.",
    severity: "destructive" as const,
  },
  "permission-denied": {
    icon: Shield,
    title: "Access denied",
    description: "You don't have permission to access this feature.",
    severity: "warning" as const,
  },
  "not-found": {
    icon: FileX,
    title: "Not found",
    description: "The page or resource you're looking for doesn't exist.",
    severity: "warning" as const,
  },
  timeout: {
    icon: Clock,
    title: "Request timeout",
    description: "The request took too long to complete. Please try again.",
    severity: "warning" as const,
  },
  "payment-error": {
    icon: CreditCard,
    title: "Payment failed",
    description:
      "There was an issue processing your payment. Please try again.",
    severity: "destructive" as const,
  },
  "database-error": {
    icon: Database,
    title: "Data error",
    description: "Unable to load data. Please refresh the page.",
    severity: "destructive" as const,
  },
  "auth-error": {
    icon: Key,
    title: "Authentication error",
    description: "Please sign in again to continue.",
    severity: "warning" as const,
  },
  "api-error": {
    icon: Globe,
    title: "Service unavailable",
    description:
      "External service is currently unavailable. Please try again later.",
    severity: "warning" as const,
  },
  "general-error": {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    severity: "destructive" as const,
  },
};

const ErrorState: React.FC<ErrorStateProps> = ({
  variant,
  title,
  description,
  error,
  action,
  secondaryAction,
  showDetails = false,
  retryable = true,
}) => {
  const config = errorStateConfig[variant];
  const IconComponent = config.icon;
  const errorMessage = error instanceof Error ? error.message : error;

  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  const getColorClasses = () => {
    switch (config.severity) {
      case "warning":
        return {
          card: "border-warning/20 bg-warning/5",
          iconBg: "bg-warning/10",
          icon: "text-warning",
        };
      case "destructive":
        return {
          card: "border-destructive/20 bg-destructive/5",
          iconBg: "bg-destructive/10",
          icon: "text-destructive",
        };
      default:
        return {
          card: "border-border/50 bg-surface/50",
          iconBg: "bg-surface-2",
          icon: "text-text-muted",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="space-y-4">
      <Card className={`${colors.card} border-2`}>
        <CardContent className="flex flex-col items-center justify-center text-center py-16 px-8">
          <div className="mb-8">
            <div
              className={`w-20 h-20 mx-auto ${colors.iconBg} rounded-full flex items-center justify-center mb-6 ring-1 ring-border/10`}
            >
              <IconComponent className={`h-10 w-10 ${colors.icon}`} />
            </div>
          </div>

          <div className="max-w-md space-y-3 mb-8">
            <h3 className="text-h3 font-semibold text-text">{finalTitle}</h3>
            <p className="text-body-sm text-text-muted leading-relaxed">
              {finalDescription}
            </p>
          </div>

          {(action || secondaryAction || retryable) && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {secondaryAction && (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="transition-brand"
                >
                  {secondaryAction.label}
                </Button>
              )}

              {action && (
                <Button
                  onClick={action.onClick}
                  className="transition-brand shadow-elev-1"
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              )}

              {!action && retryable && (
                <Button
                  onClick={() => window.location.reload()}
                  className="transition-brand shadow-elev-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details */}
      {showDetails && errorMessage && (
        <Alert
          variant={config.severity === "warning" ? "default" : "destructive"}
        >
          <Bug className="h-4 w-4" />
          <AlertTitle>Technical Details</AlertTitle>
          <AlertDescription className="text-code font-mono mt-2 text-xs bg-surface-2 p-3 rounded border">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ErrorState;
