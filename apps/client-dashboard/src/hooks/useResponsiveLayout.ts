import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "@/contexts/NavigationContext";

interface WindowSize {
  width: number;
  height: number;
}

// Centralized breakpoint constants to match Tailwind config
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
  ultraWide: 1920,
} as const;

/**
 * Professional responsive layout hook with world-class responsive utilities
 * Fixed SSR hydration, type safety, and performance issues
 */
export const useResponsiveLayout = () => {
  const { actualLayout, preference } = useNavigation();
  
  // Fix SSR hydration jump - start with null and measure after mount
  const [windowSize, setWindowSize] = useState<WindowSize | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Gate until client-side measurement
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    // Fix type mismatch - use proper browser timer type
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    const updateScreenSize = () => {
      // Cancel any pending updates
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      
      // Use RAF for smooth resize during drag + debounced settle
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }, 150);
      });
    };

    // Initial measurement
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Fix Safari compatibility for matchMedia listeners
    const mediaQuery = window.matchMedia?.(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
    const handleMediaChange = () => {
      updateScreenSize();
    };

    // Add listeners with proper Safari fallback
    const addListener = (mq: MediaQueryList, handler: () => void) => {
      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
      } else if (mq.addListener) {
        // Fallback for older Safari
        mq.addListener(handler);
      }
    };

    const removeListener = (mq: MediaQueryList, handler: () => void) => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else if (mq.removeListener) {
        // Fallback for older Safari
        mq.removeListener(handler);
      }
    };

    // Remove passive flag - ignored for resize events
    window.addEventListener("resize", updateScreenSize);
    if (mediaQuery) {
      addListener(mediaQuery, handleMediaChange);
    }

    return () => {
      window.removeEventListener("resize", updateScreenSize);
      if (mediaQuery) {
        removeListener(mediaQuery, handleMediaChange);
      }
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Return early loading state to prevent hydration mismatch
  if (!isClient || !windowSize) {
    return {
      // Safe defaults for SSR/initial render
      actualLayout,
      preference,
      isMobile: false,
      isTablet: false,
      isDesktop: true, // Default to desktop to prevent layout jumps
      isLargeDesktop: false,
      isUltraWide: false,
      windowSize: { width: 1200, height: 800 },
      getMainPadding: () => "pb-6",
      getLayoutClasses: () => ({
        main: "flex-1 overflow-y-auto bg-background pb-6",
        sidebar: "",
        bottomNav: "",
        container: "px-6 py-6 w-full space-y-6",
        grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        content: "space-y-6",
        padding: "p-6",
        spacing: "space-y-6",
      }),
      hasSidebar: actualLayout === "sidebar",
      hasBottomNav: actualLayout === "bottom",
      getOptimalColumns: () => 3,
      getViewportClass: () => "viewport-desktop",
      shouldUseCompactMode: false,
      shouldShowSidebar: true,
      shouldUseHorizontalLayout: false,
      containerMaxWidth: "max-w-6xl",
      gridGap: "gap-6",
      contentPadding: "p-6",
    };
  }

  // Enhanced responsive breakpoints with centralized constants
  const isMobile = windowSize.width < BREAKPOINTS.tablet;
  const isTablet = windowSize.width >= BREAKPOINTS.tablet && windowSize.width < BREAKPOINTS.desktop;
  const isDesktop = windowSize.width >= BREAKPOINTS.desktop;
  const isLargeDesktop = windowSize.width >= BREAKPOINTS.largeDesktop;
  const isUltraWide = windowSize.width >= BREAKPOINTS.ultraWide;

  // Calculate responsive padding based on layout
  const getMainPadding = useCallback(() => {
    if (actualLayout === "bottom") {
      return "pb-safe-mobile"; // Extra bottom padding for bottom nav
    }
    return "pb-6"; // Normal bottom padding for sidebar layout
  }, [actualLayout]);

  // Fix getOptimalColumns to prevent zero/invalid results
  const getOptimalColumns = useCallback((itemCount: number, minItemWidth: number = 300) => {
    // Guard against invalid minItemWidth
    const safeMinWidth = Math.max(minItemWidth, 100);
    const availableWidth = windowSize.width - (isMobile ? 32 : 48); // Account for padding
    const maxColumns = Math.floor(availableWidth / safeMinWidth);
    // Clamp to at least 1 column and max itemCount
    return Math.max(1, Math.min(maxColumns, itemCount));
  }, [windowSize.width, isMobile]);

  // Memoize layout classes to prevent re-render cascade
  const layoutClasses = useMemo(() => {
    const baseClasses = {
      main: `flex-1 overflow-y-auto bg-background ${getMainPadding()}`,
      sidebar: actualLayout === "sidebar" ? "lg:pl-0" : "",
      bottomNav: actualLayout === "bottom" ? "lg:pb-0" : "",
    };

    if (isMobile) {
      return {
        ...baseClasses,
        container: "px-4 py-4 w-full space-y-4 max-w-full",
        grid: "grid-cols-1 gap-4",
        content: "space-y-4",
        padding: "p-4",
        spacing: "space-y-4",
      };
    }

    if (isTablet) {
      return {
        ...baseClasses,
        container: "px-6 py-6 w-full space-y-6 max-w-4xl mx-auto",
        grid: "grid-cols-1 md:grid-cols-2 gap-6",
        content: "space-y-6",
        padding: "p-6",
        spacing: "space-y-6",
      };
    }

    if (isLargeDesktop) {
      return {
        ...baseClasses,
        container: "px-8 py-8 w-full space-y-8 max-w-7xl mx-auto",
        grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8",
        content: "space-y-8",
        padding: "p-8",
        spacing: "space-y-8",
      };
    }

    // Default desktop - balanced for most use cases
    return {
      ...baseClasses,
      container: "px-6 py-6 w-full space-y-6 max-w-6xl mx-auto",
      grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      content: "space-y-6",
      padding: "p-6",
      spacing: "space-y-6",
    };
  }, [actualLayout, isMobile, isTablet, isLargeDesktop, getMainPadding]);

  // Memoize viewport utilities
  const viewportUtils = useMemo(() => ({
    getViewportClass: () => {
      if (isUltraWide) return "viewport-ultra-wide";
      if (isLargeDesktop) return "viewport-large-desktop";
      if (isDesktop) return "viewport-desktop";
      if (isTablet) return "viewport-tablet";
      return "viewport-mobile";
    },
    
    // Fix flag mismatch - base on both conditions
    shouldShowSidebar: isDesktop && actualLayout === "sidebar",
    shouldUseCompactMode: isMobile || isTablet,
    shouldUseHorizontalLayout: isUltraWide,
    
    // Cap ultra-wide to prevent over-stretching
    containerMaxWidth: isUltraWide ? "max-w-8xl" : isLargeDesktop ? "max-w-7xl" : isDesktop ? "max-w-6xl" : "max-w-4xl",
    gridGap: isLargeDesktop ? "gap-8" : isDesktop ? "gap-6" : "gap-4",
    contentPadding: isLargeDesktop ? "p-8" : isDesktop ? "p-6" : "p-4",
  }), [isUltraWide, isLargeDesktop, isDesktop, isTablet, isMobile, actualLayout]);

  return {
    // Legacy compatibility
    actualLayout,
    preference,
    isMobile,
    isTablet,
    isDesktop,
    getMainPadding,
    getLayoutClasses: () => layoutClasses,
    hasSidebar: actualLayout === "sidebar",
    hasBottomNav: actualLayout === "bottom",
    
    // Enhanced responsive features
    windowSize,
    isLargeDesktop,
    isUltraWide,
    getOptimalColumns,
    
    // Spread viewport utilities
    ...viewportUtils,
  };
};
