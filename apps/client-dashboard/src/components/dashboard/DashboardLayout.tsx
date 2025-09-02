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
import { useFullscreen } from "@/contexts/FullscreenContext";

const DashboardLayout: React.FC = () => {
  const { actualLayout } = useNavigation();
  const { getLayoutClasses, isMobile, isDesktop, sidebarCollapsed, isSSR } = useResponsiveLayout();
  const { isFullscreen } = useFullscreen();

  // Navigation visibility logic based on user preference:
  // - "sidebar": Always show sidebar on all devices
  // - "bottom": Always show bottom navigation on all devices
  // Note: actualLayout already handles auto mode internally in NavigationContext
  const shouldShowSidebar = actualLayout === "sidebar" && !isFullscreen;
  const shouldShowBottomNav = actualLayout === "bottom" && !isFullscreen;

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' ? 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  return (
    <div className={`${getLayoutClasses()} navigation-transition`} data-dashboard-layout>
      {/* Accessibility: Skip to main content */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Global Status Strip */}
      <GlobalStatusStrip />

      <SidebarProvider 
        defaultOpen={shouldShowSidebar}
        style={{
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties}
      >
        {shouldShowSidebar && <ResponsiveDashboardSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          {!isFullscreen && (
            <header className="sticky top-0 z-40 border-b border-surface-2/30 bg-surface h-[64px] flex items-center px-4">
              {shouldShowSidebar && (
                <div className="flex items-center mr-4">
                  <SidebarTrigger className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <BreadcrumbHeader />
              </div>
            </header>
          )}

          {/* Main Content */}
          <main
            id="main-content"
            role="main" 
            className={`flex-1 ${isFullscreen ? 'p-0' : 'p-6'} overflow-auto ${
              shouldShowBottomNav ? 'pb-20' : ''
            }`}
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

        {/* Bottom Navigation */}
        {shouldShowBottomNav && (
          <nav 
            role="navigation" 
            aria-label="Bottom navigation"
            className="fixed bottom-0 left-0 right-0 z-50"
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
