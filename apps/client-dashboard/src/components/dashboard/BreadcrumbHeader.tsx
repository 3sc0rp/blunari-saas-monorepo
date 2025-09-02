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
    <div className="w-full h-full">
      <div className="flex items-center justify-between min-w-0 px-4 h-full gap-3">
        {/* Compact Breadcrumb & Page Info */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-sm">
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Dashboard</span>
            {!isHomePage && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-brand font-medium">
                  {currentRoute?.title || "Page"}
                </span>
              </>
            )}
          </div>
          
          {/* Compact Restaurant Info */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="opacity-50">•</span>
            <span className="truncate max-w-32">{restaurantName}</span>
          </div>
        </div>

        {/* Compact Status & Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Indicator - more compact */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-card/30 border border-border/30 rounded-md backdrop-blur-sm">
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                isConnected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs font-medium">
                {isConnected ? "Live" : "Off"}
              </span>
            </div>
            <div className="text-xs text-center">
              <div className="font-semibold text-foreground leading-tight">87%</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Cap</div>
            </div>
          </div>

          {/* Compact Action Buttons */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-7 w-7 p-0 hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Mobile Refresh Button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-7 w-7 p-0 hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Notification Bell - compact */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 relative hover:bg-accent/50 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            <Badge className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 p-0 bg-destructive border-0"></Badge>
          </Button>

          {/* Settings & Quick Save - compact */}
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickSave}
                className="h-7 w-7 p-0 hover:bg-accent/50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-accent/50 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
