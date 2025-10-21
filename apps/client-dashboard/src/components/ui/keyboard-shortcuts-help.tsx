/**
 * KeyboardShortcutsHelp Component
 * 
 * Displays a modal panel showing available keyboard shortcuts.
 * Triggered by pressing "?" key.
 * 
 * Features:
 * - Clean, organized layout
 * - Dark mode support
 * - Accessible with proper ARIA labels
 * - Animated entrance/exit
 * - Click outside or Esc to close
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  /** Whether the help panel is visible */
  isOpen: boolean;
  
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Keyboard shortcut key badge component
 */
const KeyBadge: React.FC<{ shortKey: string }> = ({ shortKey }) => (
  <kbd className="px-2.5 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm min-w-[2.5rem] inline-flex items-center justify-center">
    {shortKey}
  </kbd>
);

/**
 * Keyboard shortcuts help panel
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEscape);
    
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Group shortcuts by category
  const shortcutsByCategory = KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Array<typeof KEYBOARD_SHORTCUTS[number]>>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <Card
              className="w-full max-w-md pointer-events-auto dark:bg-slate-800 dark:border-slate-700"
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-shortcuts-title"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                  <CardTitle id="keyboard-shortcuts-title" className="dark:text-white">
                    Keyboard Shortcuts
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 p-0"
                  aria-label="Close keyboard shortcuts help"
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground dark:text-slate-400 mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {shortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-0"
                        >
                          <span className="text-sm text-foreground dark:text-slate-200">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={keyIndex}>
                                <KeyBadge shortKey={key} />
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-muted-foreground dark:text-slate-400 mx-0.5">
                                    +
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Pro Tip */}
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border dark:border-orange-700 rounded-lg">
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    💡 <strong>Pro Tip:</strong> Press <KeyBadge shortKey="?" /> anytime to view this help panel
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
