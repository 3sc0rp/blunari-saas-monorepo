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
const routeMap: Record<string, { title: string; icon?: React.ComponentType<{ className?: string }> }> =
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
    <div className="w-full h-full relative">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-2/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between min-w-0 px-6 h-full gap-4 relative z-10">
        {/* Enhanced Breadcrumb & Page Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Professional Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2/40 backdrop-blur-sm rounded-lg border border-surface-2/30">
              <Home className="h-4 w-4 text-text-muted" />
              <span className="text-text-muted font-medium">Dashboard</span>
              {!isHomePage && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-text-subtle mx-1" />
                  <div className="flex items-center gap-2">
                    {currentRoute?.icon && (
                      <currentRoute.icon className="h-3.5 w-3.5 text-brand" />
                    )}
                    <span className="text-brand font-semibold">
                      {currentRoute?.title || "Page"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </nav>
          
          {/* Enhanced Restaurant Context */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-surface-2/20 backdrop-blur-sm rounded-lg border border-surface-2/20">
            <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
            <span className="text-sm text-text-muted font-medium truncate max-w-40">
              {restaurantName || tenant?.name || "Restaurant"}
            </span>
          </div>
        </div>

        {/* Enhanced Status & Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Professional Status Dashboard */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-surface-2/30 to-surface-2/20 backdrop-blur-sm border border-surface-2/40 rounded-xl shadow-elevation-low">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-300 ${
                isConnected
                  ? "bg-success/15 text-success border border-success/20"
                  : "bg-destructive/15 text-destructive border border-destructive/20"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  isConnected 
                    ? "bg-success animate-pulse shadow-glow-success" 
                    : "bg-destructive animate-pulse shadow-glow-destructive"
                }`}
              />
              <span className="text-xs font-semibold">
                {isConnected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            
            {/* Capacity Indicator */}
            <div className="text-center px-2">
              <div className="text-sm font-bold text-text leading-none">87%</div>
              <div className="text-xs text-text-subtle leading-none mt-0.5">Capacity</div>
            </div>
          </div>

          {/* Professional Action Buttons */}
          <div className="flex items-center gap-1 bg-surface-2/20 backdrop-blur-sm rounded-xl p-1 border border-surface-2/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0 hover:bg-surface-2/60 transition-all duration-200 hover:scale-105 rounded-lg"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative hover:bg-surface-2/60 transition-all duration-200 hover:scale-105 rounded-lg"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-destructive border-2 border-surface text-xs animate-pulse" />
            </Button>

            {!isMobile && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickSave}
                  className="h-8 w-8 p-0 hover:bg-surface-2/60 transition-all duration-200 hover:scale-105 rounded-lg"
                  title="Quick Save"
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-surface-2/60 transition-all duration-200 hover:scale-105 rounded-lg"
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* User Avatar - Premium Touch */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand/10 to-brand/5 backdrop-blur-sm rounded-xl border border-brand/20">
            <div className="w-6 h-6 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center shadow-elevation-medium">
              <span className="text-xs font-bold text-brand-foreground">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-xs font-medium text-text truncate max-w-20">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
