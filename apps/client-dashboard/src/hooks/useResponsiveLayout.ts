import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { NavigationContext, NavigationContextType } from '@/contexts/NavigationContext';

export interface ResponsiveLayout {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  actualLayout: "sidebar" | "bottom";
  getLayoutClasses: () => string;
  screenSize: {
    width: number;
    height: number;
  };
  isSSR: boolean; // Add flag to detect server-side rendering
}

// Breakpoint constants - made configurable for better maintainability
const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

// Debounce utility to prevent excessive resize events
const debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const useResponsiveLayout = (): ResponsiveLayout => {
  // Use context directly to avoid throwing errors when provider is missing
  const navigation: NavigationContextType | undefined = useContext(NavigationContext);
  
  // State with better initial values to prevent hydration mismatch
  const [screenSize, setScreenSize] = useState<{ width: number; height: number }>({ width: 1024, height: 768 }); // Default to desktop-like dimensions
  const [isClient, setIsClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default to collapsed for better UX
  const [isSSR, setIsSSR] = useState(true);

  // Memoized breakpoint calculations to prevent unnecessary re-computations
  const breakpointValues = useMemo(() => {
    // During SSR or before client hydration, default to desktop to prevent layout shift
    if (!isClient || isSSR) {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      };
    }

    const isMobile = screenSize.width < BREAKPOINTS.MOBILE;
    const isTablet = screenSize.width >= BREAKPOINTS.MOBILE && screenSize.width < BREAKPOINTS.TABLET;
    const isDesktop = screenSize.width >= BREAKPOINTS.TABLET;

    return { isMobile, isTablet, isDesktop };
  }, [screenSize.width, isClient, isSSR]);

  // Debounced resize handler to improve performance
  const debouncedUpdateScreenSize = useMemo(
    () => debounce(() => {
      if (typeof window !== 'undefined') {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    }, 100), // 100ms debounce
    []
  );

  // Handle client-side hydration and window events
  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return;
    }

    // Set client flag and initial screen size
    setIsClient(true);
    setIsSSR(false);
    
    // Set initial size immediately
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Add resize event listener with debouncing
    window.addEventListener('resize', debouncedUpdateScreenSize, { passive: true });
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenSize);
    };
  }, [debouncedUpdateScreenSize]);

  // Update sidebar state based on navigation context and screen size with proper dependencies
  useEffect(() => {
    // Don't update during SSR
    if (isSSR) return;

    const { isMobile } = breakpointValues;
    const actualLayout = navigation?.actualLayout || 'bottom';

    if (actualLayout === 'sidebar' && !isMobile) {
      setSidebarCollapsed(false);
    } else {
      setSidebarCollapsed(true);
    }
  }, [navigation?.actualLayout, breakpointValues, isSSR]);

  // Memoized toggle function to prevent unnecessary re-renders
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Optimized layout class generation with proper memoization
  const getLayoutClasses = useCallback(() => {
    const classes = ['min-h-screen', 'bg-background', 'transition-all', 'duration-300'];
    
    const { isMobile, isDesktop } = breakpointValues;
    
    // Add responsive classes
    if (isMobile) {
      classes.push('mobile-layout');
    } else if (isDesktop) {
      classes.push('desktop-layout');
    }
    
    // Add sidebar state classes
    if (isDesktop && !sidebarCollapsed) {
      classes.push('sidebar-open');
    } else {
      classes.push('sidebar-closed');
    }

    // Add SSR safety class
    if (isSSR) {
      classes.push('ssr-safe');
    }
    
    return classes.join(' ');
  }, [breakpointValues, sidebarCollapsed, isSSR]);

  // Return memoized values to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    isMobile: breakpointValues.isMobile,
    isTablet: breakpointValues.isTablet,
    isDesktop: breakpointValues.isDesktop,
    sidebarCollapsed,
    toggleSidebar,
    actualLayout: navigation?.actualLayout || "bottom",
    getLayoutClasses,
    screenSize,
    isSSR,
  }), [
    breakpointValues,
    sidebarCollapsed,
    toggleSidebar,
    navigation?.actualLayout,
    getLayoutClasses,
    screenSize,
    isSSR,
  ]);
};