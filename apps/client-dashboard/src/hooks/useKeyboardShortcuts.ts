/**
 * useKeyboardShortcuts Hook
 * 
 * Provides keyboard navigation for the catering widget flow.
 * Enhances accessibility and power user experience.
 * 
 * Shortcuts:
 * - Alt+N: Next step
 * - Alt+B: Back/Previous step
 * - Escape: Close widget (if in iframe) or return to packages
 * - ?: Show keyboard shortcuts help panel
 */

import { useEffect, useCallback } from "react";
import { CateringStep } from "@/components/catering/CateringContext";

interface KeyboardShortcutsConfig {
  /** Current step in the flow */
  currentStep: CateringStep;
  
  /** Navigate to a specific step */
  setCurrentStep: (step: CateringStep) => void;
  
  /** Callback when help shortcut (?) is triggered */
  onShowHelp?: () => void;
  
  /** Callback when close shortcut (Esc) is triggered */
  onClose?: () => void;
  
  /** Disable shortcuts (e.g., when form inputs are focused) */
  disabled?: boolean;
  
  /** Custom next step handler (e.g., with validation) */
  onNext?: () => boolean | Promise<boolean>;
  
  /** Custom back handler */
  onBack?: () => boolean | Promise<boolean>;
}

const STEP_ORDER: CateringStep[] = ["packages", "customize", "details", "confirmation"];

/**
 * Custom hook for keyboard shortcuts in catering widget
 */
export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const {
    currentStep,
    setCurrentStep,
    onShowHelp,
    onClose,
    disabled = false,
    onNext,
    onBack,
  } = config;

  /**
   * Navigate to next step
   */
  const handleNext = useCallback(async () => {
    if (disabled) return;
    
    // Call custom handler if provided
    if (onNext) {
      const canProceed = await onNext();
      if (!canProceed) return;
    }
    
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentStep, setCurrentStep, onNext, disabled]);

  /**
   * Navigate to previous step
   */
  const handleBack = useCallback(async () => {
    if (disabled) return;
    
    // Call custom handler if provided
    if (onBack) {
      const canProceed = await onBack();
      if (!canProceed) return;
    }
    
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentStep, setCurrentStep, onBack, disabled]);

  /**
   * Handle close/escape action
   */
  const handleClose = useCallback(() => {
    if (disabled) return;
    
    if (onClose) {
      onClose();
    } else {
      // Default: return to packages step
      setCurrentStep("packages");
    }
  }, [onClose, setCurrentStep, disabled]);

  /**
   * Handle help shortcut
   */
  const handleHelp = useCallback(() => {
    if (disabled) return;
    
    if (onShowHelp) {
      onShowHelp();
    }
  }, [onShowHelp, disabled]);

  /**
   * Keyboard event handler
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
    const target = e.target as HTMLElement;
    const isInput = 
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;
    
    // Allow Escape even in inputs (to unfocus)
    if (e.key === "Escape") {
      if (isInput) {
        // Blur the input first
        target.blur();
      } else {
        e.preventDefault();
        handleClose();
      }
      return;
    }
    
    // Don't handle other shortcuts when in input fields
    if (isInput) return;
    
    // Handle shortcuts
    if (e.altKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      handleNext();
    } else if (e.altKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      handleBack();
    } else if (e.key === "?") {
      e.preventDefault();
      handleHelp();
    }
  }, [handleNext, handleBack, handleClose, handleHelp]);

  /**
   * Attach/detach keyboard event listeners
   */
  useEffect(() => {
    if (disabled) return;
    
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, disabled]);

  return {
    handleNext,
    handleBack,
    handleClose,
    handleHelp,
  };
};

/**
 * Keyboard shortcuts reference data
 */
export const KEYBOARD_SHORTCUTS = [
  {
    keys: ["Alt", "N"],
    description: "Next step",
    category: "Navigation",
  },
  {
    keys: ["Alt", "B"],
    description: "Previous step / Back",
    category: "Navigation",
  },
  {
    keys: ["Esc"],
    description: "Return to packages / Close",
    category: "Navigation",
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
    category: "Help",
  },
] as const;
