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

  // Show sidebar on desktop by default, unless explicitly set to bottom
  const shouldShowSidebar = isDesktop && actualLayout !== "bottom";
  const shouldShowBottomNav = isMobile || actualLayout === "bottom";

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

      <SidebarProvider defaultOpen={shouldShowSidebar && !sidebarCollapsed}>
        {/* Professional Layout Container */}
        <div className="relative min-h-screen">
          {/* Unified Header Strip with Glass Effect */}
          <div className="sticky top-0 z-40 border-b border-surface-2/30 bg-surface">
            <div className="flex w-full">
              {/* Responsive Sidebar - Enhanced Integration */}
              {shouldShowSidebar && (
                <div className="flex-shrink-0">
                  <ResponsiveDashboardSidebar />
                </div>
              )}

              <div className="flex-1 flex flex-col min-w-0">
                {/* Seamless Header Strip */}
                <header
                  role="banner"
                  className="h-[64px] flex items-center w-full min-w-0"
                >
                  <div className="flex items-center w-full h-full">
                    {shouldShowSidebar && (
                      <div className="flex items-center pl-3 lg:hidden">
                        <SidebarTrigger className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex-1 h-full flex items-center">
                      <BreadcrumbHeader />
                    </div>
                  </div>
                </header>
              </div>
            </div>
          </div>

          {/* Main Content Area with Professional Layout */}
          <div className="flex min-h-[calc(100vh-64px)]">
            {/* Enhanced Main Content - Fixed positioning issues */}
            <main
              id="main-content"
              role="main" 
              className="flex-1 relative w-full overflow-x-hidden"
              style={{
                minHeight: 'calc(100vh - 64px)',
                // Remove fixed margin, let CSS classes handle responsive spacing
                paddingBottom: shouldShowBottomNav ? '80px' : '0',
              }}
            >
              {/* Content Container with proper spacing and no content hiding */}
              <motion.div
                initial={prefersReducedMotion || isSSR ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion || isSSR ? false : { opacity: 1, y: 0 }}
                transition={prefersReducedMotion || isSSR ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
                className="w-full h-full"
                style={{ 
                  padding: 'var(--content-padding, 1.5rem)',
                  minHeight: 'calc(100vh - 64px)',
                }}
              >
                {/* Ensure content is never hidden */}
                <div className="w-full max-w-none relative">
                  <Outlet />
                </div>
              </motion.div>
            </main>
          </div>
        </div>

        {/* Enhanced Bottom Navigation for Mobile */}
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
