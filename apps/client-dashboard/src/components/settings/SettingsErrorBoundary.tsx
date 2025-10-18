import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class SettingsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Settings Error Boundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });

    // In a real app, you'd log this to your error reporting service
    // logErrorToService(error, errorInfo);
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReportBug = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const mailtoLink = `mailto:support@blunari.com?subject=Settings Error Report&body=${encodeURIComponent(
      `I encountered an error in the Settings page:\n\n${JSON.stringify(errorReport, null, 2)}`,
    )}`;

    window.open(mailtoLink);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Settings Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Something went wrong while loading the settings page. This error
                has been logged automatically.
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">
                    Development Mode
                  </Badge>
                  <div className="rounded border p-3 text-xs font-mono">
                    <div className="font-semibold text-destructive mb-2">
                      Error:
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap">
                      {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <>
                        <div className="font-semibold text-destructive mt-3 mb-2">
                          Stack:
                        </div>
                        <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                          {this.state.error.stack.slice(0, 500)}...
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRefresh} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Settings
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={this.handleGoHome}>
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>

                  <Button variant="outline" onClick={this.handleReportBug}>
                    <Bug className="h-4 w-4 mr-2" />
                    Report Bug
                  </Button>
                </div>
              </div>

              <div className="text-xs text-center text-muted-foreground">
                Error ID: {Date.now().toString(36)}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SettingsErrorBoundary;
