import React from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ResponsiveDashboardSidebar } from "./ResponsiveDashboardSidebar";
import BottomNavigation from "./BottomNavigation";
import BreadcrumbHeader from "./BreadcrumbHeader";
import GlobalStatusStrip from "./GlobalStatusStrip";
import { useNavigation } from "@/contexts/NavigationContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const DashboardLayout: React.FC = () => {
  const { actualLayout } = useNavigation();
  const { getLayoutClasses, isMobile, isDesktop, sidebarCollapsed, isSSR } = useResponsiveLayout();

  // Sidebar visibility logic:
  // - "sidebar": Always show sidebar (desktop and mobile)
  // - "auto": Show sidebar on desktop, bottom nav on mobile  
  // - "bottom": Always show bottom navigation
  const shouldShowSidebar = 
    actualLayout === "sidebar" || 
    (actualLayout === "auto" && isDesktop);
  const shouldShowBottomNav = 
    actualLayout === "bottom" || 
    (actualLayout === "auto" && isMobile) ||
    isMobile; // Fallback for mobile

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' ? 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  return (
    <div className={getLayoutClasses()}>
      {/* Accessibility: Skip to main content */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Global Status Strip */}
      <GlobalStatusStrip />

      <SidebarProvider defaultOpen={true}>
        <ResponsiveDashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-surface-2/30 bg-surface h-[64px] flex items-center px-4">
            <div className="flex items-center mr-4">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <BreadcrumbHeader />
            </div>
          </header>

          {/* Main Content */}
          <main
            id="main-content"
            role="main" 
            className="flex-1 p-6 overflow-auto"
            style={{ paddingBottom: shouldShowBottomNav ? '80px' : '0' }}
          >
            <motion.div
              initial={prefersReducedMotion || isSSR ? false : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion || isSSR ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion || isSSR ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>

        {/* Bottom Navigation for Mobile */}
        {shouldShowBottomNav && (
          <nav 
            role="navigation" 
            aria-label="Mobile navigation"
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          >
            <div className="pb-safe">
              <BottomNavigation />
            </div>
          </nav>
        )}
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
