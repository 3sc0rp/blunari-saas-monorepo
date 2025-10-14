import React, { createContext, useContext, useEffect, useState } from "react";

type NavigationPreference = "sidebar" | "bottom" | "auto";

export interface NavigationContextType {
  preference: NavigationPreference;
  setPreference: (preference: NavigationPreference) => void;
  actualLayout: "sidebar" | "bottom"; // What's actually shown based on preference + screen size
}

export const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preference, setPreferenceState] =
    useState<NavigationPreference>("sidebar");
  const [actualLayout, setActualLayout] = useState<"sidebar" | "bottom">(
    "sidebar", // Default to sidebar on desktop
  );

  // Load preference from localStorage
  useEffect(() => {
    // Ensure we're on the client side before accessing localStorage
      if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem("navigation-preference");
    if (saved && ["sidebar", "bottom", "auto"].includes(saved)) {
      setPreferenceState(saved as NavigationPreference);
    } else {
      // Set default to sidebar for desktop-first experience
      setPreferenceState("sidebar");
      localStorage.setItem("navigation-preference", "sidebar");
    }
  }, []);

  // Save preference to localStorage
      const setPreference = (newPreference: NavigationPreference) => {
    setPreferenceState(newPreference);
    if (typeof window !== 'undefined') {
      localStorage.setItem("navigation-preference", newPreference);
    }
  };

  // Determine actual layout based on preference and screen size
  useEffect(() => {
    const updateActualLayout = () => {
      // Ensure we're on the client side before accessing window
      if (preference === "sidebar") {
        setActualLayout("sidebar");
      } else if (preference === "bottom") {
        setActualLayout("bottom");
      } else if (preference === "auto") {
        // Auto mode - responsive based on screen size (1024px breakpoint)
        setActualLayout(window.innerWidth >= 1024 ? "sidebar" : "bottom");
      }
    };

    // Initial update
    updateActualLayout();

    // Always listen for resize events in auto mode, and also when preference changes
      const handleResize = () => {
      if (preference === "auto") {
        updateActualLayout();
      }
    };

    window.addEventListener("resize", handleResize);

    // Also trigger update when preference changes
    updateActualLayout();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [preference]);

  return (
    <NavigationContext.Provider
      value={{ preference, setPreference, actualLayout }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};


