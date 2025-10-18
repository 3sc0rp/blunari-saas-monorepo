import { toast as sonnerToast } from "sonner";

// Debounce mechanism to prevent duplicate toasts
const recentToasts = new Set<string>();
const DEBOUNCE_TIME = 3000; // 3 seconds

function getToastKey(message: string, type: string): string {
  return `${type}:${message}`;
}

function debounceToast(key: string): boolean {
  if (recentToasts.has(key)) {
    return false; // Skip this toast
  }

  recentToasts.add(key);
  setTimeout(() => {
    recentToasts.delete(key);
  }, DEBOUNCE_TIME);

  return true; // Allow this toast
}

export interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    const key = getToastKey(message, "success");
    if (!debounceToast(key)) return;

    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast: "border border-success/20 bg-success/5",
        title: "text-success-foreground font-medium",
        description: "text-success-foreground/80",
        actionButton: "bg-success text-success-foreground hover:bg-success/90",
      },
    });
  },

  error: (message: string, options?: ToastOptions) => {
    const key = getToastKey(message, "error");
    if (!debounceToast(key)) return;

    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 6000, // Longer for errors
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast: "border border-destructive/20 bg-destructive/5",
        title: "text-destructive font-medium",
        description: "text-destructive/80",
        actionButton:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    const key = getToastKey(message, "warning");
    if (!debounceToast(key)) return;

    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast: "border border-warning/20 bg-warning/5",
        title: "text-warning-foreground font-medium",
        description: "text-warning-foreground/80",
        actionButton: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
    });
  },

  info: (message: string, options?: ToastOptions) => {
    const key = getToastKey(message, "info");
    if (!debounceToast(key)) return;

    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast: "border border-brand/20 bg-brand/5",
        title: "text-brand font-medium",
        description: "text-text-muted",
        actionButton: "bg-brand text-brand-foreground hover:bg-brand/90",
      },
    });
  },

  // Generic toast function with custom styling
  custom: (
    message: string,
    options?: ToastOptions & {
      variant?: "default" | "success" | "error" | "warning";
    },
  ) => {
    const variant = options?.variant || "default";
    const key = getToastKey(message, variant);
    if (!debounceToast(key)) return;

    return sonnerToast(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },
};

// Export the original toast from sonner for advanced use cases
export { toast as sonnerToast } from "sonner";
