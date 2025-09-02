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
import { useIsMobile } from "@/hooks/use-mobile";

const DashboardLayout: React.FC = () => {
  const { actualLayout } = useNavigation();
  const { getLayoutClasses } = useResponsiveLayout();
  const isMobile = useIsMobile();

  // Use sidebar for desktop, bottom navigation for mobile
  const shouldShowSidebar = !isMobile;
  const shouldShowBottomNav = isMobile || actualLayout === "bottom";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Accessibility: Skip to main content */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Global Status Strip */}
      <GlobalStatusStrip />

      <SidebarProvider defaultOpen={shouldShowSidebar}>
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
            {/* Sidebar Spacer for Layout Consistency */}
            {shouldShowSidebar && (
              <div className="flex-shrink-0 w-[280px] hidden lg:block" />
            )}
            
            {/* Enhanced Main Content */}
            <main
              id="main-content"
              role="main"
              className={`flex-1 relative min-h-screen ${getLayoutClasses().main}`}
            >
              {/* Content Container with Professional Animation */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className={`relative z-10 w-full ${getLayoutClasses().container}`}
                style={{ minHeight: "100vh" }}
              >
                {/* Debug: Layout content indicator */}
                <div className="p-2 bg-yellow-100 text-yellow-900 rounded border mb-2">
                  <span className="text-sm font-bold">Layout Debug: Content should render below</span>
                </div>
                <div className="w-full">
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
