import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Save,
  ChevronRight,
  Home,
  Bell,
  Settings2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useTenant } from "@/hooks/useTenant";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

// Route mapping for breadcrumbs
const routeMap: Record<string, { title: string; icon?: React.ComponentType }> =
  {
    "/dashboard": { title: "Dashboard", icon: Home },
    "/dashboard/bookings": { title: "Bookings" },
    "/dashboard/tables": { title: "Tables" },
    "/dashboard/customers": { title: "Customers" },
    "/dashboard/widget-preview": { title: "Booking Widget" },
    "/dashboard/pos-integrations": { title: "POS Integrations" },
    "/dashboard/waitlist": { title: "Waitlist" },
    "/dashboard/staff": { title: "Staff" },
    "/dashboard/messages": { title: "Messages" },
    "/dashboard/analytics": { title: "Analytics" },
    "/dashboard/settings": { title: "Settings" },
  };

const BreadcrumbHeader: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { restaurantName } = useTenantBranding();
  const { tenant } = useTenant();
  const { isConnected } = useRealtimeBookings(tenant?.id);
  const { actualLayout, isMobile } = useResponsiveLayout();

  const currentRoute = routeMap[location.pathname];
  const isHomePage = location.pathname === "/dashboard";

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleQuickSave = () => {
    // Implement quick save functionality
    console.log("Quick save triggered");
  };

  return (
    <div
      className={`header-full-width bg-gradient-to-r from-surface via-surface-2 to-surface border-b border-surface-2 ${
        actualLayout === "sidebar" ? "px-6 py-6" : "px-4 py-4"
      }`}
    >
      <div
        className={`flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 ${isMobile ? "gap-2" : "gap-4"}`}
      >
        {/* Restaurant Info & Breadcrumb Section */}
        <div className="space-y-3">
          {/* Restaurant Name */}
          <h1 className="text-2xl font-bold text-brand">{restaurantName}</h1>

          {/* Enhanced Breadcrumb Navigation */}
          <div
            className={`flex items-center gap-2 ${isMobile ? "text-sm" : "text-body-sm"}`}
          >
            <Home
              className={`${isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} text-muted-foreground`}
            />
            <span className="text-muted-foreground">Dashboard</span>
            {!isHomePage && (
              <>
                <ChevronRight
                  className={`${isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} text-muted-foreground`}
                />
                <span
                  className={`text-brand font-semibold border-b-2 border-brand pb-0.5 ${isMobile ? "truncate max-w-[100px]" : ""}`}
                >
                  {currentRoute?.title || "Page"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status & Capacity Indicator */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  isConnected
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm font-medium">
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-foreground">87%</div>
                <div className="text-xs text-muted-foreground">Capacity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center ${isMobile ? "gap-2" : "gap-3"}`}>
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 px-3 bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}

          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickSave}
              className="h-9 px-3 bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Quick Save
            </Button>
          )}

          {/* Mobile Refresh Button */}
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 w-9 p-0 bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Notification Bell */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 relative bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-destructive border-0"></Badge>
          </Button>

          {/* Settings Button */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
