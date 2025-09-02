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
    <div className="bg-gradient-to-r from-surface via-surface-2 to-surface w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between min-w-0 px-6 py-4 gap-4">
        {/* Breadcrumb & Page Info Section */}
        <div className="space-y-2 min-w-0 flex-shrink-0">
          {/* Enhanced Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Dashboard</span>
            {!isHomePage && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-brand font-semibold border-b-2 border-brand pb-0.5">
                  {currentRoute?.title || "Page"}
                </span>
              </>
            )}
          </div>
          
          {/* Page Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand">
              {currentRoute?.title || "Dashboard"}
            </h1>
            <div className="text-sm text-muted-foreground">
              {restaurantName}
            </div>
          </div>
        </div>

        {/* Status & Capacity Indicator */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="px-3 py-2 bg-card/50 border border-border/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded-full ${
                  isConnected
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-xs font-medium">
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
        <div className="flex items-center flex-shrink-0 gap-2">
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-3 bg-card/50 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
          )}

          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickSave}
              className="h-8 px-3 bg-card/50 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors backdrop-blur-sm"
            >
              <Save className="h-3.5 w-3.5 mr-2" />
              Quick Save
            </Button>
          )}

          {/* Mobile Refresh Button */}
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0 bg-card/50 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Notification Bell */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 relative bg-card/50 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors backdrop-blur-sm"
          >
            <Bell className="h-3.5 w-3.5" />
            <Badge className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 p-0 bg-destructive border-0"></Badge>
          </Button>

          {/* Settings Button */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-card/50 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors backdrop-blur-sm"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
