import { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

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
}

// Breakpoint constants
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export const useResponsiveLayout = (): ResponsiveLayout => {
  // Get navigation context using the proper hook
  const navigation = useNavigation();
  
  // Always call all hooks at the top level
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    updateScreenSize();

    // Add event listener with proper cleanup
    window.addEventListener('resize', updateScreenSize);
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  // Calculate breakpoints based on actual screen size
  const isMobile = isClient ? screenSize.width < MOBILE_BREAKPOINT : false;
  const isTablet = isClient ? screenSize.width >= MOBILE_BREAKPOINT && screenSize.width < TABLET_BREAKPOINT : false;
  const isDesktop = isClient ? screenSize.width >= TABLET_BREAKPOINT : true; // Default to desktop for SSR

  // Update sidebar state based on navigation context and screen size
  useEffect(() => {
    if (navigation?.actualLayout === 'sidebar' && !isMobile) {
      setSidebarCollapsed(false);
    } else {
      setSidebarCollapsed(true);
    }
  }, [navigation?.actualLayout, isMobile]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const getLayoutClasses = () => {
    const baseClasses = ["min-h-screen", "bg-background"];
    if (isMobile) {
      baseClasses.push("mobile-layout");
    }
    if (isDesktop && !sidebarCollapsed) {
      baseClasses.push("sidebar-open");
    }
    return baseClasses.join(" ");
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    sidebarCollapsed,
    toggleSidebar,
    actualLayout: navigation?.actualLayout || "bottom",
    getLayoutClasses,
    screenSize,
  };
};