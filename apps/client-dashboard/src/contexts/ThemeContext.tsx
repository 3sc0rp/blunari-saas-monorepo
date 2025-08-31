import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Contrast = 'normal' | 'high';

interface ThemeContextType {
  theme: Theme;
  contrast: Contrast;
  setTheme: (theme: Theme) => void;
  setContrast: (contrast: Contrast) => void;
  toggleTheme: () => void;
  toggleContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [contrast, setContrastState] = useState<Contrast>('normal');

  // Load preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedContrast = localStorage.getItem('contrast') as Contrast;
    
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }

    if (savedContrast && ['normal', 'high'].includes(savedContrast)) {
      setContrastState(savedContrast);
    } else {
      // Check system preference for high contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      setContrastState(prefersHighContrast ? 'high' : 'normal');
    }
  }, []);

  // Apply theme and contrast to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Set data attributes for CSS targeting
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-contrast', contrast);
    
    // Also set class for compatibility with existing dark mode detection
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, contrast]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setContrast = (newContrast: Contrast) => {
    setContrastState(newContrast);
    localStorage.setItem('contrast', newContrast);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleContrast = () => {
    setContrast(contrast === 'normal' ? 'high' : 'normal');
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
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};