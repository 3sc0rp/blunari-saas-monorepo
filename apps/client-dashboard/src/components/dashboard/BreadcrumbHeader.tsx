import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Home,
  Settings2,
  Focus,
  User,
  LogOut,
  UserCircle,
  Palette,
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
    "/dashboard/catering": { title: "Catering" },
    "/dashboard/customers": { title: "Customers" },
    "/dashboard/staff": { title: "Staff" },
    "/dashboard/messages": { title: "Messages" },

    "/dashboard/staff-management": { title: "Staff Management" },
    "/dashboard/inventory-management": { title: "Inventory Management" },
    "/dashboard/analytics": { title: "Analytics" },
    "/dashboard/ai-business-insights": { title: "AI Business Insights" },
    "/dashboard/widget-management": { title: "Widget Management" },
    "/dashboard/widget-preview": { title: "Booking Widget" },
    "/dashboard/settings": { title: "Settings" },
  };

const BreadcrumbHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    const names = displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
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
          {/* Enhanced User Profile Dropdown */}
          <div className="hidden lg:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-1.5 h-auto bg-gradient-to-r from-brand/10 to-brand/5 backdrop-blur-sm rounded-xl border border-brand/20 hover:from-brand/20 hover:to-brand/10 hover:border-brand/30 transition-all duration-300"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center shadow-elev-2">
                    <span className="text-xs font-bold text-brand-foreground">
                      {getUserInitials()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-text truncate max-w-20">
                    {getUserDisplayName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-surface/95 backdrop-blur-sm border-surface-2">
                <DropdownMenuLabel className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center shadow-elev-2">
                      <span className="text-sm font-bold text-brand-foreground">
                        {getUserInitials()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-surface-2/50" />
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <UserCircle className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <Settings2 className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <Palette className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Appearance</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-surface-2/50" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile User Profile Dropdown */}
          <div className="lg:hidden flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-surface-2/60 transition-all duration-200 hover:scale-105 rounded-lg"
                  title="User Menu"
                >
                  <div className="w-5 h-5 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-foreground">
                      {getUserInitials()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-surface/95 backdrop-blur-sm border-surface-2">
                <DropdownMenuLabel className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center shadow-elev-2">
                      <span className="text-sm font-bold text-brand-foreground">
                        {getUserInitials()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-surface-2/50" />
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <UserCircle className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <Settings2 className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer hover:bg-surface-2/50 focus:bg-surface-2/50"
                >
                  <Palette className="mr-3 h-4 w-4 text-text-muted" />
                  <span>Appearance</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-surface-2/50" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
