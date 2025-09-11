import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Save,
  ChevronRight,
  Home,
  Bell,
  Settings2,
  Focus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useTenant } from "@/hooks/useTenant";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useUIMode } from "@/lib/ui-mode";
import { useModeTransition } from "@/contexts/ModeTransitionContext";

// Route mapping for breadcrumbs
const routeMap: Record<string, { title: string; icon?: React.ComponentType<{ className?: string }> }> =
  {
    "/dashboard": { title: "Dashboard", icon: Home },
    "/command-center": { title: "Command Center" },
    "/dashboard/command-center": { title: "Command Center" },
    "/dashboard/home": { title: "Dashboard Home" },
    "/dashboard/bookings": { title: "Bookings" },
    "/dashboard/advanced-reservations": { title: "Advanced Reservations" },
    "/dashboard/waitlist": { title: "Waitlist" },
    "/dashboard/waitlist-management": { title: "Waitlist Management" },
    "/dashboard/tables": { title: "Tables" },
    "/dashboard/customer-profiles": { title: "Customer Profiles" },
    "/dashboard/review-feedback": { title: "Reviews & Feedback" },
    "/dashboard/catering": { title: "Catering" },
    "/dashboard/customers": { title: "Customers" },
    "/dashboard/staff": { title: "Staff" },
    "/dashboard/messages": { title: "Messages" },
    "/dashboard/menu-management": { title: "Menu Management" },
    "/dashboard/kitchen-display": { title: "Kitchen Display" },
    "/dashboard/staff-management": { title: "Staff Management" },
    "/dashboard/inventory-management": { title: "Inventory Management" },
    "/dashboard/analytics": { title: "Analytics" },
    "/dashboard/advanced-analytics": { title: "Advanced Analytics" },
    "/dashboard/financial-reporting": { title: "Financial Reports" },
    "/dashboard/performance-optimization": { title: "Performance Optimization" },
    "/dashboard/competitive-intelligence": { title: "Competitive Intelligence" },
    "/dashboard/ai-business-insights": { title: "AI Business Insights" },
    "/dashboard/widget-management": { title: "Widget Management" },
    "/dashboard/widget-preview": { title: "Booking Widget" },
    "/dashboard/settings": { title: "Settings" },
  };

const BreadcrumbHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurantName } = useTenantBranding();
  const { tenant } = useTenant();
  const { isConnected } = useRealtimeBookings(tenant?.id);
  const { actualLayout, isMobile } = useResponsiveLayout();
  const { setMode } = useUIMode();
  const { triggerModeTransition } = useModeTransition();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentRoute = routeMap[location.pathname];
  const isHomePage = location.pathname === "/dashboard";
  const isCommandCenter = location.pathname === "/command-center";

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleQuickSave = () => {
    // Implement quick save functionality
    console.log("Quick save triggered");
  };

  const handleFocusMode = async () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    try {
      if (isCommandCenter) {
        // From Command Center (operations) to Dashboard (management)
        navigate('/dashboard');
        await triggerModeTransition("operations", "management");
        await setMode("management");
      } else {
        // From any dashboard page to Command Center (operations)
        navigate('/command-center');
        await triggerModeTransition("management", "operations");
        await setMode("operations");
      }
    } finally {
      setIsTransitioning(false);
    }
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

        {/* Enhanced Focus Mode Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={isTransitioning}
            onClick={handleFocusMode}
            className={`
              relative overflow-hidden group
              bg-gradient-to-r from-brand/10 to-brand/5 
              border-brand/20 text-brand 
              hover:from-brand/20 hover:to-brand/10 
              hover:border-brand/30 hover:text-brand
              transition-all duration-300
              backdrop-blur-sm shadow-sm
              ${isTransitioning ? 'cursor-wait opacity-75' : 'hover:shadow-brand/20 hover:shadow-lg'}
            `}
          >
            {/* Subtle animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <Focus className={`w-4 h-4 mr-2 transition-transform duration-300 ${isTransitioning ? 'animate-pulse' : 'group-hover:scale-110'}`} />
            <span className="relative font-medium">
              {isTransitioning ? 'Switching...' : (isCommandCenter ? 'Management' : 'Focus Mode')}
            </span>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-lg bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
          </Button>
        </div>

        {/* Enhanced Status & Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Professional Status Dashboard */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-surface-2/30 to-surface-2/20 backdrop-blur-sm border border-surface-2/40 rounded-xl shadow-elev-1">
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
            <div className="w-6 h-6 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center shadow-elev-2">
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
