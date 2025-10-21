/**
 * SyncStatusIndicator Component
 * 
 * Displays the current sync status of server auto-save.
 * Shows saving, saved, error, and conflict states with appropriate icons.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Check, AlertCircle, RefreshCw } from "lucide-react";
import { SyncStatus } from "@/hooks/useServerAutoSave";
import { cn } from "@/lib/utils";

interface SyncStatusIndicatorProps {
  /** Current sync status */
  status: SyncStatus;
  
  /** Last successful sync time */
  lastSyncTime: Date | null;
  
  /** Compact mode (icon only) */
  compact?: boolean;
  
  /** Custom className */
  className?: string;
}

/**
 * Format time ago string
 */
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Sync status indicator component
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  lastSyncTime,
  compact = false,
  className = "",
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: RefreshCw,
          text: "Saving...",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          animate: true,
        };
      case "saved":
        return {
          icon: Check,
          text: lastSyncTime ? `Saved ${formatTimeAgo(lastSyncTime)}` : "Saved",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
          animate: false,
        };
      case "error":
        return {
          icon: CloudOff,
          text: "Save failed (using local backup)",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          animate: false,
        };
      case "conflict":
        return {
          icon: AlertCircle,
          text: "Sync conflict detected",
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-900/20",
          animate: false,
        };
      default:
        return {
          icon: Cloud,
          text: "Auto-save active",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-800",
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Don't show indicator for idle state in compact mode
  if (compact && status === "idle") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
          config.bgColor,
          config.color,
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={config.text}
      >
        <motion.div
          animate={config.animate ? { rotate: 360 } : {}}
          transition={config.animate ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </motion.div>
        {!compact && <span>{config.text}</span>}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Footer sync status (always visible, minimal)
 */
export const FooterSyncStatus: React.FC<{
  status: SyncStatus;
  lastSyncTime: Date | null;
}> = ({ status, lastSyncTime }) => {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-slate-500">
        <Cloud className="w-3 h-3" aria-hidden="true" />
        <span>Auto-save enabled</span>
      </div>
    );
  }

  return <SyncStatusIndicator status={status} lastSyncTime={lastSyncTime} compact />;
};
