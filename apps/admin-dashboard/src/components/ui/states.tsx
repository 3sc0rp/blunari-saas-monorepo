import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          {icon || <AlertCircle className="h-8 w-8 text-muted-foreground" />}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            className="animate-fade-in"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

interface LoadingStateProps {
  title?: string;
  description?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Loading...",
  description = "Please wait while we fetch your data",
  rows = 5,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
                <div className="w-20 h-8 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <Card className={`border-destructive/20 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="animate-fade-in"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
