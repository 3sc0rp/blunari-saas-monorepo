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

      {shouldShowSidebar ? (
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen w-full">
            {/* Responsive Sidebar */}
            <ResponsiveDashboardSidebar />

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Header with Sidebar Toggle */}
              <header
                role="banner"
                className="flex items-center gap-4 p-4 border-b border-surface-2 bg-surface w-full min-w-0"
              >
                <SidebarTrigger className="lg:hidden" />
                <div className="flex-1">
                  <BreadcrumbHeader />
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
        </SidebarProvider>
      ) : (
        <div className="flex min-h-screen flex-col">
          {/* Mobile Header */}
          <header role="banner" className="w-full">
            <BreadcrumbHeader />
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

          {/* Bottom Navigation for Mobile */}
          {shouldShowBottomNav && (
            <nav role="navigation" aria-label="Mobile navigation">
              <BottomNavigation />
            </nav>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
