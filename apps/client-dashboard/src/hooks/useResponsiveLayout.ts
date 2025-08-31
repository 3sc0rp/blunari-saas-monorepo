import { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Hook to detect layout changes and provide responsive utilities
 * Works with NavigationContext to ensure layout changes are applied immediately
 */
export const useResponsiveLayout = () => {
  const { actualLayout, preference } = useNavigation();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Calculate responsive padding based on layout
  const getMainPadding = () => {
    if (actualLayout === 'bottom') {
      return 'pb-safe-mobile'; // Extra bottom padding for bottom nav
    }
    return 'pb-6'; // Normal bottom padding for sidebar layout
  };

  // Get layout-specific CSS classes
  const getLayoutClasses = () => {
    return {
      main: `flex-1 overflow-y-auto bg-surface-2/50 p-6 ${getMainPadding()}`,
      container: `max-w-7xl mx-auto page-padding motion-reduce:transform-none`,
      sidebar: actualLayout === 'sidebar' ? 'lg:pl-0' : '',
      bottomNav: actualLayout === 'bottom' ? 'lg:pb-0' : '',
    };
  };

  return {
    actualLayout,
    preference,
    isMobile,
    isTablet,
    isDesktop,
    getMainPadding,
    getLayoutClasses,
    hasSidebar: actualLayout === 'sidebar',
    hasBottomNav: actualLayout === 'bottom',
  };
};