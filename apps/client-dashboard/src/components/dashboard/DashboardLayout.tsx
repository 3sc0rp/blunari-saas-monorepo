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
    <div className="min-h-screen bg-surface">
      {/* Skip to main content for keyboard navigation */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Global Status Strip */}
      <GlobalStatusStrip />

      <SidebarProvider defaultOpen={shouldShowSidebar}>
        <div className="flex min-h-screen w-full">
          {/* Responsive Sidebar - only render when needed */}
          {shouldShowSidebar && <ResponsiveDashboardSidebar />}

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Integrated Header Strip - matches sidebar top */}
            <header
              role="banner"
              className="h-[88px] flex items-center border-b border-surface-2 bg-gradient-to-r from-surface via-surface-2 to-surface w-full min-w-0"
            >
              <div className="flex items-center w-full h-full">
                {shouldShowSidebar && (
                  <div className="flex items-center pl-4 lg:hidden">
                    <SidebarTrigger />
                  </div>
                )}
                <div className="flex-1 h-full flex items-center">
                  <BreadcrumbHeader />
                </div>
              </div>
            </header>

            <main
              id="main-content"
              role="main"
              className={getLayoutClasses().main}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                }}
                className={getLayoutClasses().container}
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>

        {/* Bottom Navigation for Mobile */}
        {shouldShowBottomNav && (
          <nav role="navigation" aria-label="Mobile navigation">
            <BottomNavigation />
          </nav>
        )}
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
