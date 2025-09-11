import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Monitor, Settings2, ArrowRight, Zap } from "lucide-react";
import { useUIMode } from "@/lib/ui-mode";
import { useModeTransition } from "@/contexts/ModeTransitionContext";
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
  const { triggerModeTransition } = useModeTransition();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isOperationsMode = mode === "operations";
  const isManagementMode = mode === "management";

  const handleToggle = async () => {
    if (isTransitioning) return; // Prevent multiple clicks during transition
    
    setIsTransitioning(true);
    const newMode = isOperationsMode ? "management" : "operations";
    const currentMode = isOperationsMode ? "operations" : "management";
    
    try {
      // Trigger the enhanced global transition
      await triggerModeTransition(currentMode, newMode);
      
      // Update the mode
      await setMode(newMode);

      // Navigate based on mode
      if (newMode === "operations") {
        // Switch to Operations - navigate to Command Center
        navigate("/command-center");
      } else {
        // Switch to Management - navigate to dashboard
        if (location.pathname === "/command-center") {
          navigate("/dashboard");
        }
      }
    } finally {
      // Reset transition state
      setIsTransitioning(false);
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
            <motion.div
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: isTransitioning ? 1.1 : 1,
                boxShadow: isTransitioning 
                  ? (isOperationsMode 
                      ? "0 0 20px rgba(59, 130, 246, 0.5)" 
                      : "0 0 20px rgba(245, 158, 11, 0.5)")
                  : "0 4px 12px rgba(0, 0, 0, 0.15)"
              }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleToggle}
                variant="ghost"
                size="sm"
                disabled={isTransitioning}
                className={cn(
                  "relative h-9 w-9 p-0 rounded-lg border-2 transition-all duration-500",
                  isOperationsMode 
                    ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600" 
                    : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600",
                  isTransitioning && "cursor-wait",
                  className
                )}
              >
                <motion.div
                  animate={{
                    rotate: isTransitioning ? 360 : 0,
                    scale: isTransitioning ? [1, 1.2, 1] : 1
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {isOperationsMode ? (
                    <Monitor className="h-4 w-4" />
                  ) : (
                    <Settings2 className="h-4 w-4" />
                  )}
                </motion.div>
                
                {/* Compact mode transition effect */}
                <AnimatePresence>
                  {isTransitioning && (
                    <motion.div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 2]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className={cn(
                        "w-full h-full rounded-lg border-2",
                        isOperationsMode 
                          ? "border-blue-400/50" 
                          : "border-amber-400/50"
                      )} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
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
            "bg-surface/80 backdrop-blur-sm transition-all duration-500",
            isOperationsMode 
              ? "border-blue-500/30 shadow-blue-500/10" 
              : "border-amber-500/30 shadow-amber-500/10",
            "shadow-lg hover:shadow-xl",
            isTransitioning && "scale-105"
          )}
          layout
          animate={{
            scale: isTransitioning ? 1.02 : 1,
            boxShadow: isTransitioning 
              ? (isOperationsMode 
                  ? "0 0 30px rgba(59, 130, 246, 0.3)" 
                  : "0 0 30px rgba(245, 158, 11, 0.3)")
              : "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
          }}
          transition={{ 
            type: "spring", 
            damping: 20, 
            stiffness: 300,
            duration: 0.4
          }}
        >
          {/* Enhanced Background slider with transition effects */}
          <motion.div
            className={cn(
              "absolute top-1 h-[calc(100%-8px)] rounded-full transition-all duration-500",
              isOperationsMode
                ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25"
                : "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25",
              "shadow-lg"
            )}
            initial={false}
            animate={{
              left: isOperationsMode ? 4 : "50%",
              width: isOperationsMode ? "calc(50% - 4px)" : "calc(50% - 4px)",
              scale: isTransitioning ? 1.05 : 1,
            }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              scale: { duration: 0.2 }
            }}
          />

          {/* Transition sparkle effect */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className={cn(
                    "absolute top-1/2 left-1/2 w-4 h-4 rounded-full",
                    isOperationsMode ? "bg-blue-300" : "bg-amber-300"
                  )}
                  initial={{ scale: 0, x: "-50%", y: "-50%" }}
                  animate={{ 
                    scale: [0, 1.5, 0],
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ rotate: 0, opacity: 0 }}
                  animate={{ 
                    rotate: 360,
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Zap className={cn(
                    "w-4 h-4",
                    isOperationsMode ? "text-blue-300" : "text-amber-300"
                  )} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Operations Button */}
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => !isOperationsMode && handleToggle()}
                className={cn(
                  "relative z-10 inline-flex items-center justify-center rounded-full transition-all duration-500",
                  sizeClasses[size],
                  size === "xs" ? "min-w-[70px] font-medium" : size === "sm" ? "min-w-[90px] font-medium" : "min-w-[120px] font-medium",
                  isOperationsMode
                    ? "text-white shadow-lg"
                    : "text-text-muted hover:text-text hover:bg-surface-2/50",
                  isTransitioning && "cursor-wait"
                )}
                disabled={isOperationsMode || isTransitioning}
                whileTap={!isOperationsMode && !isTransitioning ? { scale: 0.95 } : {}}
                animate={{
                  scale: isTransitioning && !isOperationsMode ? [1, 1.1, 1] : 1,
                  filter: isTransitioning ? "brightness(1.2)" : "brightness(1)"
                }}
                transition={{ 
                  scale: { duration: 0.3 },
                  filter: { duration: 0.2 }
                }}
              >
                <motion.div
                  animate={{
                    rotate: isTransitioning && !isOperationsMode ? [0, 180, 360] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Monitor className={cn("mr-2", size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                </motion.div>
                <motion.span
                  animate={{
                    opacity: isTransitioning ? 0.7 : 1
                  }}
                >
                  Operations
                </motion.span>
                <AnimatePresence mode="wait">
                  {isOperationsMode && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    >
                      <Badge className={cn("ml-2 bg-white/20 text-white px-1.5 py-0.5", size === "xs" || size === "sm" ? "text-xs" : "text-xs")}>
                        ACTIVE
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
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
              <motion.button
                onClick={() => isOperationsMode && handleToggle()}
                className={cn(
                  "relative z-10 inline-flex items-center justify-center rounded-full transition-all duration-500",
                  sizeClasses[size],
                  size === "xs" ? "min-w-[70px] font-medium" : size === "sm" ? "min-w-[90px] font-medium" : "min-w-[120px] font-medium",
                  isManagementMode
                    ? "text-white shadow-lg"
                    : "text-text-muted hover:text-text hover:bg-surface-2/50",
                  isTransitioning && "cursor-wait"
                )}
                disabled={isManagementMode || isTransitioning}
                whileTap={!isManagementMode && !isTransitioning ? { scale: 0.95 } : {}}
                animate={{
                  scale: isTransitioning && !isManagementMode ? [1, 1.1, 1] : 1,
                  filter: isTransitioning ? "brightness(1.2)" : "brightness(1)"
                }}
                transition={{ 
                  scale: { duration: 0.3 },
                  filter: { duration: 0.2 }
                }}
              >
                <motion.div
                  animate={{
                    rotate: isTransitioning && !isManagementMode ? [0, 180, 360] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Settings2 className={cn("mr-2", size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                </motion.div>
                <motion.span
                  animate={{
                    opacity: isTransitioning ? 0.7 : 1
                  }}
                >
                  Management
                </motion.span>
                <AnimatePresence mode="wait">
                  {isManagementMode && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    >
                      <Badge className={cn("ml-2 bg-white/20 text-white px-1.5 py-0.5", size === "xs" || size === "sm" ? "text-xs" : "text-xs")}>
                        ACTIVE
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
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

        {/* Enhanced mode indicator with transition effects */}
        <motion.div 
          className="ml-3 flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            scale: isTransitioning ? 1.1 : 1
          }}
          transition={{ 
            delay: 0.2,
            scale: { duration: 0.3 }
          }}
        >
          <motion.div 
            className={cn(
              "w-2 h-2 rounded-full",
              isOperationsMode ? "bg-blue-500" : "bg-amber-500"
            )}
            animate={{
              scale: isTransitioning ? [1, 1.5, 1] : [1, 1.2, 1],
              opacity: isTransitioning ? [1, 0.5, 1] : [1, 0.8, 1]
            }}
            transition={{
              duration: isTransitioning ? 0.5 : 2,
              repeat: isTransitioning ? 1 : Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.span 
            className="text-xs text-muted-foreground hidden sm:inline"
            animate={{
              opacity: isTransitioning ? 0.5 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={isOperationsMode ? "operations" : "management"}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOperationsMode ? "Live Operations" : "Management View"}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </motion.div>
      </div>
    </TooltipProvider>
  );
};
