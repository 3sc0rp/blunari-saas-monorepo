import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Monitor, Settings2, ArrowRight } from "lucide-react";
import { useUIMode } from "@/lib/ui-mode";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ModeSwitchProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "compact";
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ 
  className, 
  size = "md", 
  variant = "default" 
}) => {
  const { mode, setMode, ready } = useUIMode();
  const navigate = useNavigate();
  const location = useLocation();

  const isOperationsMode = mode === "operations";
  const isManagementMode = mode === "management";

  const handleToggle = async () => {
    const newMode = isOperationsMode ? "management" : "operations";
    await setMode(newMode);

    // Navigate based on mode
    if (newMode === "operations") {
      // Switch to Operations - navigate to Command Center
      navigate("/dashboard/command-center");
    } else {
      // Switch to Management - stay put and expand sidebar
      // The sidebar will automatically expand in management mode
      if (location.pathname === "/dashboard/command-center" || location.pathname === "/command-center") {
        navigate("/dashboard");
      }
    }
  };

  if (!ready) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="w-40 h-9 bg-surface-2 rounded-full"></div>
      </div>
    );
  }

  const sizeClasses = {
    xs: "px-1.5 py-1 text-xs",
    sm: "px-2 py-1.5 text-xs",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const compactMode = variant === "compact";

  if (compactMode) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              variant="ghost"
              size="sm"
              className={cn(
                "relative h-9 w-9 p-0 rounded-lg border-2 transition-all duration-300",
                isOperationsMode 
                  ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600" 
                  : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600",
                className
              )}
            >
              {isOperationsMode ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-center">
              <p className="font-semibold mb-1">
                Switch to {isOperationsMode ? "Management" : "Operations"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOperationsMode 
                  ? "Plan & analyze—dashboard, analytics, customers, staff, settings."
                  : "Run the shift—live tables, waitlist, seating, quick actions."
                }
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("relative inline-flex items-center overflow-hidden", className)} data-tour="mode-switch">
        <motion.div
          className={cn(
            "relative inline-flex items-center rounded-full border-2 overflow-hidden min-w-0",
            "bg-surface/80 backdrop-blur-sm transition-all duration-300",
            isOperationsMode 
              ? "border-blue-500/30 shadow-blue-500/10" 
              : "border-amber-500/30 shadow-amber-500/10",
            "shadow-lg hover:shadow-xl"
          )}
          layout
        >
          {/* Background slider */}
          <motion.div
            className={cn(
              "absolute top-1 h-[calc(100%-8px)] rounded-full transition-all duration-300",
              isOperationsMode
                ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25"
                : "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25",
              "shadow-lg"
            )}
            initial={false}
            animate={{
              left: isOperationsMode ? 4 : "50%",
              width: isOperationsMode ? "calc(50% - 4px)" : "calc(50% - 4px)",
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          />

          {/* Operations Button */}
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <button
                onClick={() => !isOperationsMode && handleToggle()}
                className={cn(
                  "relative z-10 inline-flex items-center justify-center rounded-full transition-all duration-300",
                  sizeClasses[size],
                  size === "xs" ? "min-w-[70px] font-medium" : size === "sm" ? "min-w-[90px] font-medium" : "min-w-[120px] font-medium",
                  isOperationsMode
                    ? "text-white shadow-lg"
                    : "text-text-muted hover:text-text hover:bg-surface-2/50"
                )}
                disabled={isOperationsMode}
              >
                <Monitor className={cn("mr-2", size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                Operations
                {isOperationsMode && (
                  <Badge className={cn("ml-2 bg-white/20 text-white px-1.5 py-0.5", size === "xs" || size === "sm" ? "text-xs" : "text-xs")}>
                    ACTIVE
                  </Badge>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-center">
                <p className="font-semibold mb-1 text-blue-600">Operations Mode</p>
                <p className="text-sm text-muted-foreground">
                  Run the shift—live tables, waitlist, seating, quick actions.
                </p>
                {isOperationsMode && (
                  <p className="text-xs text-blue-600 mt-1">Currently active</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Management Button */}
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <button
                onClick={() => isOperationsMode && handleToggle()}
                className={cn(
                  "relative z-10 inline-flex items-center justify-center rounded-full transition-all duration-300",
                  sizeClasses[size],
                  size === "xs" ? "min-w-[70px] font-medium" : size === "sm" ? "min-w-[90px] font-medium" : "min-w-[120px] font-medium",
                  isManagementMode
                    ? "text-white shadow-lg"
                    : "text-text-muted hover:text-text hover:bg-surface-2/50"
                )}
                disabled={isManagementMode}
              >
                <Settings2 className={cn("mr-2", size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                Management
                {isManagementMode && (
                  <Badge className={cn("ml-2 bg-white/20 text-white px-1.5 py-0.5", size === "xs" || size === "sm" ? "text-xs" : "text-xs")}>
                    ACTIVE
                  </Badge>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-center">
                <p className="font-semibold mb-1 text-amber-600">Management Mode</p>
                <p className="text-sm text-muted-foreground">
                  Plan & analyze—dashboard, analytics, customers, staff, settings.
                </p>
                {isManagementMode && (
                  <p className="text-xs text-amber-600 mt-1">Currently active</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </motion.div>

        {/* Mode indicator */}
        <motion.div 
          className="ml-3 flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isOperationsMode ? "bg-blue-500" : "bg-amber-500"
          )} />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {isOperationsMode ? "Live Operations" : "Management View"}
          </span>
        </motion.div>
      </div>
    </TooltipProvider>
  );
};
