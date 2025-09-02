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
      "w-full justify-start transition-all duration-200 hover:bg-surface-2";
    return isActive(path)
      ? `${baseClasses} bg-brand/10 text-brand border-r-2 border-brand font-medium`
      : `${baseClasses} text-text-muted hover:text-text`;
  };

  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r-0 bg-surface">
      <SidebarContent>
        {/* Seamless Integrated Header Strip - part of unified container */}
        <div className="h-[64px] p-3 flex items-center">
          <div className="flex items-center gap-2.5 w-full">
            <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand/80 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
              <Building className="w-3.5 h-3.5 text-brand-foreground" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-text truncate text-sm leading-tight">
                  {tenant?.name || "Restaurant"}
                </h2>
                <p className="text-xs text-text-muted truncate opacity-70 leading-tight">Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Sections - seamless integration */}
        <div className="flex-1 px-3 py-4 space-y-6 border-r border-surface-2/50">
          {navigationItems.map((section) => (
            <SidebarGroup key={section.section}>
              {!collapsed && (
                <SidebarGroupLabel className="px-3 text-xs font-medium text-text-subtle uppercase tracking-wider">
                  {section.section}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={getNavClassName(item.url)}
                          title={collapsed ? item.title : undefined}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && (
                            <span className="ml-3 flex-1">{item.title}</span>
                          )}
                          {!collapsed && item.title === "Messages" && (
                            <Badge className="ml-auto h-5 w-5 p-0 bg-destructive text-destructive-foreground text-xs">
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
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-r border-surface-2/50">
          {!collapsed ? (
            <div className="text-xs text-text-subtle">
              <p className="font-medium">Blunari Dashboard</p>
              <p>v2.1.0</p>
            </div>
          ) : (
            <div className="w-6 h-6 bg-brand/10 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
