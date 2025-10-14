import React, { createContext, useContext, useEffect, useState } from "react";
import { safeStorage } from '@/utils/safeStorage';

type Theme = "light" | "dark" | "deep-sea";
type Contrast = "normal" | "high";

interface ThemeContextType {
  theme: Theme;
  contrast: Contrast;
  setTheme: (theme: Theme) => void;
  setContrast: (contrast: Contrast) => void;
  toggleTheme: () => void;
  toggleContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>("light");
  const [contrast, setContrastState] = useState<Contrast>("normal");

  // Load preferences from localStorage
  useEffect(() => {
  const savedTheme = safeStorage.get("theme") as Theme;
  const savedContrast = safeStorage.get("contrast") as Contrast;

    if (savedTheme && ["light", "dark", "deep-sea"].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setThemeState(prefersDark ? "dark" : "light");
    }

    if (savedContrast && ["normal", "high"].includes(savedContrast)) {
      setContrastState(savedContrast);
    } else {
      // Check system preference for high contrast
      const prefersHighContrast = window.matchMedia(
        "(prefers-contrast: high)",
      ).matches;
      setContrastState(prefersHighContrast ? "high" : "normal");
    }
  }, []);

  // Apply theme and contrast to document
  useEffect(() => {
    const root = document.documentElement;

    // Set data attributes for CSS targeting
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-contrast", contrast);

    // Also set class for compatibility with existing dark mode detection
      if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("deep-sea");
    } else if (theme === "deep-sea") {
      root.classList.add("deep-sea");
      root.classList.remove("dark");
    } else {
      root.classList.remove("dark", "deep-sea");
    }
  }, [theme, contrast]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  safeStorage.set("theme", newTheme);
  };

  const setContrast = (newContrast: Contrast) => {
    setContrastState(newContrast);
  safeStorage.set("contrast", newContrast);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "deep-sea"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const toggleContrast = () => {
    setContrast(contrast === "normal" ? "high" : "normal");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        contrast,
        setTheme,
        setContrast,
        toggleTheme,
        toggleContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

