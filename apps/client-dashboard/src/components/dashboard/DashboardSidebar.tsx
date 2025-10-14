import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenant } from "@/hooks/useTenant";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useAlertSystem } from "@/hooks/useAlertSystem";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ChefHat,
  BarChart3,
  Settings,
  TableProperties,
  Clock,
  MessageSquare,
  Menu,
  X,
  Code,
  Plug,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
    badge: "bookings",
  },
  { name: "Tables", href: "/dashboard/tables", icon: TableProperties },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Catering", href: "/dashboard/catering", icon: UtensilsCrossed },
  { name: "Booking Widget", href: "/dashboard/widget-preview", icon: Code },
  { name: "POS Integrations", href: "/dashboard/pos-integrations", icon: Plug },
  { name: "Waitlist", href: "/dashboard/waitlist", icon: Clock },
  { name: "Staff", href: "/dashboard/staff", icon: ChefHat },
  {
    name: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
    badge: "messages",
  },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const DashboardSidebar: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { tenant } = useTenant();
  const { logoUrl, restaurantName } = useTenantBranding();
  const { alerts } = useAlertSystem(tenant?.id);

  // Get badge counts from real data
      const getBadgeCount = (badgeType: string) => {
    switch (badgeType) {
      case "bookings":
        // TODO: Get from real bookings hook
      return 0; // Will be populated by real data
      case "messages":
        return alerts.length;
      default:
        return 0;
    }
  };

  const SidebarContent = ({ collapsed = false, mobile = false }) => (
    <div className="flex h-full flex-col">
      {/* Logo and tenant info */}
      <div
        className={`flex items-center border-b border-border ${
          collapsed ? "h-16 px-4 justify-center" : "h-16 px-6"
        }`}
      >
        {collapsed ? (
          <img
            src={logoUrl}
            alt={`${restaurantName} logo`}
            className="h-8 w-8 rounded-lg"
          />
        ) : (
          <>
            <img
              src={logoUrl}
              alt={`${restaurantName} logo`}
              className="h-8 w-auto"
            />
            <div className="ml-3 min-w-0 flex-1">
              <h2 className="text-body-sm font-semibold text-foreground truncate">
                {restaurantName}
              </h2>
              <Badge
                variant="secondary"
                className="text-xs"
                aria-label={`Restaurant status: ${tenant?.status || "Active"}`}
              >
                {tenant?.status || "Active"}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-6 space-y-1 ${collapsed ? "px-2" : "px-4"}`}>
        <TooltipProvider>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;

            const linkContent = (
              <div
                className={`
                group flex items-center transition-all duration-150 motion-reduce:transition-none
                ${
                  collapsed
                    ? "justify-center w-12 h-12 rounded-xl"
                    : "px-3 py-3 rounded-lg"
                }
                ${
                  isActive
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
              `}
              >
                <div className="relative">
                  <item.icon
                    className={collapsed ? "h-5 w-5" : "h-5 w-5"}
                    aria-hidden="true"
                  />
                  {badgeCount > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-destructive text-destructive-foreground flex items-center justify-center"
                      aria-label={`${badgeCount} ${item.badge === "messages" ? "unread messages" : "new items"}`}
                    >
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </Badge>
                  )}
                </div>
                {!collapsed && (
                  <span className="ml-3 text-body-sm font-medium">
                    {item.name}
                  </span>
                )}
              </div>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.href}
                      onClick={() => mobile && setSidebarOpen(false)}
                      aria-label={`Navigate to ${item.name}${badgeCount > 0 ? ` (${badgeCount} ${item.badge === "messages" ? "unread messages" : "new items"})` : ""}`}
                    >
                      {linkContent}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                  >
                    <span>{item.name}</span>
                    {badgeCount > 0 && (
                      <Badge className="h-4 w-4 p-0 text-xs">
                        {badgeCount}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => mobile && setSidebarOpen(false)}
                aria-label={`Navigate to ${item.name}${badgeCount > 0 ? ` (${badgeCount} ${item.badge === "messages" ? "unread messages" : "new items"})` : ""}`}
              >
                {linkContent}
              </NavLink>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Collapse Toggle & Footer */}
      <div className={`border-t border-border ${collapsed ? "p-2" : "p-4"}`}>
        {!mobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`mb-4 ${collapsed ? "w-12 h-8 p-0" : "w-full justify-start"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Collapse
              </>
            )}
          </Button>
        )}

        {!collapsed && (
          <div className="text-xs text-muted-foreground text-center">
            Powered by Blunari
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile sidebar overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Mobile sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
                duration: 0.15,
              }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border lg:hidden shadow-elev-3"
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 h-10 w-10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 84 : 280,
        }}
        transition={{
          duration: 0.15,
          ease: "easeInOut",
        }}
        className="bg-card border-r border-border flex-shrink-0 lg:block hidden shadow-elev-1 motion-reduce:transition-none"
        style={{ width: isCollapsed ? 84 : 280 }}
        aria-label="Main navigation sidebar"
      >
        <SidebarContent collapsed={isCollapsed} />
      </motion.aside>
    </>
  );
};

export default DashboardSidebar;

