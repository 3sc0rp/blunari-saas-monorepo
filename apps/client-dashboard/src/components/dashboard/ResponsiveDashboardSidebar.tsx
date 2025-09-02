import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  TableProperties,
  UserCheck,
  CreditCard,
  Building,
  ChefHat,
  Cog,
  Eye,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";

const navigationItems = [
  {
    section: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Operations",
    items: [
      { title: "Bookings", url: "/dashboard/bookings", icon: Calendar },
      { title: "Tables", url: "/dashboard/tables", icon: TableProperties },
      { title: "Waitlist", url: "/dashboard/waitlist", icon: UserCheck },
      { title: "Catering", url: "/dashboard/catering", icon: ChefHat },
    ],
  },
  {
    section: "Management",
    items: [
      { title: "Customers", url: "/dashboard/customers", icon: Users },
      { title: "Staff", url: "/dashboard/staff", icon: Building },
      { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  {
    section: "Tools",
    items: [
      {
        title: "Widget Management",
        url: "/dashboard/widget-management",
        icon: Cog,
      },
    ],
  },
  {
    section: "Admin",
    items: [
      { title: "Settings", url: "/dashboard/settings", icon: Settings },
      {
        title: "POS Integration",
        url: "/dashboard/pos-integrations",
        icon: CreditCard,
      },
    ],
  },
];

export function ResponsiveDashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { tenant } = useTenant();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const baseClasses =
      "w-full justify-start transition-all duration-300 hover:bg-surface-2/70 backdrop-blur-sm rounded-lg group";
    return isActive(path)
      ? `${baseClasses} bg-gradient-to-r from-brand/15 to-brand/10 text-brand border border-brand/20 font-medium shadow-brand`
      : `${baseClasses} text-text-muted hover:text-text hover:border-surface-2/50 border border-transparent`;
  };

  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r-0 bg-gradient-to-b from-surface via-surface to-surface-2/30 backdrop-blur-xl w-[280px]">
      <SidebarContent className="relative">
        {/* Seamless Integrated Header Strip - Enhanced with Glass Effect */}
        <div className="h-[64px] p-4 flex items-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-2/10 to-transparent" />
          <div className="flex items-center gap-3 w-full relative z-10">
            <div className="w-8 h-8 bg-gradient-to-br from-brand via-brand/90 to-brand/70 rounded-xl flex items-center justify-center flex-shrink-0 shadow-elevation-medium ring-1 ring-brand/20">
              <Building className="w-4 h-4 text-brand-foreground" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-text truncate text-sm leading-tight">
                  {tenant?.name || "Restaurant"}
                </h2>
                <p className="text-xs text-text-muted truncate opacity-75 leading-tight">
                  Management Portal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Professional Navigation Sections */}
        <div className="flex-1 px-4 py-2 space-y-8 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-text/5 to-transparent" />
          </div>
          
          {navigationItems.map((section, sectionIndex) => (
            <div key={section.section} className="relative">
              {!collapsed && (
                <div className="px-3 pb-3">
                  <h3 className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
                    {section.section}
                  </h3>
                  <div className="h-px bg-gradient-to-r from-surface-2/50 to-transparent mt-2" />
                </div>
              )}
              
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={getNavClassName(item.url)}
                            title={collapsed ? item.title : undefined}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            {!collapsed && (
                              <span className="ml-3 flex-1 text-sm">
                                {item.title}
                              </span>
                            )}
                            {!collapsed && item.title === "Messages" && (
                              <Badge className="ml-auto h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground text-xs font-medium shadow-elevation-low animate-pulse">
                                3
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}
        </div>

        {/* Enhanced Professional Footer */}
        <div className="p-4 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-2/50 to-transparent" />
          {!collapsed ? (
            <div className="bg-surface-2/30 backdrop-blur-sm rounded-xl p-3 border border-surface-2/50">
              <div className="text-xs text-text-subtle space-y-1">
                <p className="font-semibold text-text">Blunari Dashboard</p>
                <p className="opacity-75">v2.1.0 • Professional</p>
                <div className="flex items-center gap-1 pt-1">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  <span className="text-success text-xs">Online</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-surface-2/50 to-surface-2/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-surface-2/30">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
