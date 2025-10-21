/**
 * ThemeToggle Component
 * 
 * Provides a compact toggle button for switching between light and dark themes.
 * Persists user preference to localStorage.
 * 
 * Features:
 * - Visual moon/sun icons
 * - Smooth transitions
 * - Accessible with ARIA labels
 * - 44px minimum touch target (WCAG 2.1 AA)
 * - Keyboard navigation support
 */

import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  /** Size variant - 'sm' for compact, 'lg' for larger touch targets */
  size?: "sm" | "lg";
  
  /** Show label text alongside icon */
  showLabel?: boolean;
  
  /** Custom className for positioning */
  className?: string;
}

/**
 * Theme toggle button with smooth icon transitions
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = "lg",
  showLabel = false,
  className = "",
}) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleTheme}
      className={`relative ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center gap-2"
      >
        {isDark ? (
          <Moon className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Sun className="w-5 h-5" aria-hidden="true" />
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {isDark ? "Dark" : "Light"}
          </span>
        )}
      </motion.div>
    </Button>
  );
};

/**
 * Compact inline theme toggle for embedding in forms/widgets
 */
export const CompactThemeToggle: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`
        inline-flex items-center justify-center
        w-11 h-11 rounded-full
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        initial={false}
        animate={{ scale: isDark ? 1 : 0.8, rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-gray-300" aria-hidden="true" />
        ) : (
          <Sun className="w-5 h-5 text-gray-600" aria-hidden="true" />
        )}
      </motion.div>
    </button>
  );
};
