import { useState, useEffect, useCallback } from "react";
import { useNavigation } from "@/contexts/NavigationContext";

interface WindowSize {
  width: number;
  height: number;
}

/**
 * Professional responsive layout hook with world-class responsive utilities
 * Works with NavigationContext to ensure layout changes are applied immediately
 */
export const useResponsiveLayout = () => {
  const { actualLayout, preference } = useNavigation();
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;

    const updateScreenSize = () => {
      // Debounce resize events for better performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleMediaChange = () => {
      updateScreenSize();
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize, { passive: true });
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("resize", updateScreenSize);
      mediaQuery.removeEventListener("change", handleMediaChange);
      clearTimeout(timeoutId);
    };
  }, []);

  // Enhanced responsive breakpoints
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;
  const isLargeDesktop = windowSize.width >= 1440;
  const isUltraWide = windowSize.width >= 1920;

  // Calculate responsive padding based on layout
  const getMainPadding = useCallback(() => {
    if (actualLayout === "bottom") {
      return "pb-safe-mobile"; // Extra bottom padding for bottom nav
    }
    return "pb-6"; // Normal bottom padding for sidebar layout
  }, [actualLayout]);

  // Professional layout-specific CSS classes
  const getLayoutClasses = useCallback(() => {
    const baseClasses = {
      main: `flex-1 overflow-y-auto bg-gradient-to-br from-surface via-surface to-surface-2/30 ${getMainPadding()}`,
      sidebar: actualLayout === "sidebar" ? "lg:pl-0" : "",
      bottomNav: actualLayout === "bottom" ? "lg:pb-0" : "",
    };

    if (isMobile) {
      return {
        ...baseClasses,
        container: "px-4 py-4 max-w-full space-y-4",
        grid: "grid-cols-1 gap-4",
        content: "space-y-4",
        padding: "p-4",
        spacing: "space-y-4",
      };
    }

    if (isTablet) {
      return {
        ...baseClasses,
        container: "px-6 py-6 max-w-6xl mx-auto space-y-6 page-padding motion-reduce:transform-none",
        grid: "grid-cols-1 md:grid-cols-2 gap-6",
        content: "space-y-6",
        padding: "p-6",
        spacing: "space-y-6",
      };
    }

    if (isLargeDesktop) {
      return {
        ...baseClasses,
        container: "px-8 py-8 max-w-8xl mx-auto space-y-8 page-padding motion-reduce:transform-none",
        grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8",
        content: "space-y-8",
        padding: "p-8",
        spacing: "space-y-8",
      };
    }

    // Default desktop
    return {
      ...baseClasses,
      container: "px-6 py-6 max-w-7xl mx-auto space-y-6 page-padding motion-reduce:transform-none",
      grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      content: "space-y-6",
      padding: "p-6",
      spacing: "space-y-6",
    };
  }, [actualLayout, isMobile, isTablet, isLargeDesktop, getMainPadding]);

  // Professional responsive utilities
  const getOptimalColumns = useCallback((itemCount: number, minItemWidth: number = 300) => {
    const availableWidth = windowSize.width - (isMobile ? 32 : 48); // Account for padding
    const maxColumns = Math.floor(availableWidth / minItemWidth);
    return Math.min(maxColumns, itemCount);
  }, [windowSize.width, isMobile]);

  const getViewportClass = useCallback(() => {
    if (isUltraWide) return "viewport-ultra-wide";
    if (isLargeDesktop) return "viewport-large-desktop";
    if (isDesktop) return "viewport-desktop";
    if (isTablet) return "viewport-tablet";
    return "viewport-mobile";
  }, [isUltraWide, isLargeDesktop, isDesktop, isTablet]);

  const shouldUseCompactMode = isMobile || isTablet;
  const shouldShowSidebar = isDesktop;
  const shouldUseHorizontalLayout = isUltraWide;

  return {
    // Legacy compatibility
    actualLayout,
    preference,
    isMobile,
    isTablet,
    isDesktop,
    getMainPadding,
    getLayoutClasses,
    hasSidebar: actualLayout === "sidebar",
    hasBottomNav: actualLayout === "bottom",
    
    // Enhanced responsive features
    windowSize,
    isLargeDesktop,
    isUltraWide,
    getOptimalColumns,
    getViewportClass,
    shouldUseCompactMode,
    shouldShowSidebar,
    shouldUseHorizontalLayout,
    
    // Professional responsive utilities
    containerMaxWidth: isUltraWide ? "max-w-8xl" : isLargeDesktop ? "max-w-7xl" : isDesktop ? "max-w-6xl" : "max-w-4xl",
    gridGap: isLargeDesktop ? "gap-8" : isDesktop ? "gap-6" : "gap-4",
    contentPadding: isLargeDesktop ? "p-8" : isDesktop ? "p-6" : "p-4",
  };
};
