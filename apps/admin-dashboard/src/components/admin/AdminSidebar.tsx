import React, { memo, useMemo } from "react";
import { useTenantCount } from "@/hooks/useTenantCount";
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building,
  CreditCard,
  Activity,
  Shield,
  Utensils,
  ChefHat,
  Globe,
  Building2,
  BarChart3,
  User,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plug,
  Rocket,
  LifeBuoy,
} from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";

interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; size?: string | number }>;
  badge?: string | null;
  description?: string;
}

const mainNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
    badge: null,
    description: "Overview and key metrics",
  },
  {
    title: "Tenants",
    url: "/admin/tenants",
    icon: Building,
    badge: "4",
    description: "Manage restaurant tenants",
  },
  {
    title: "Employees",
    url: "/admin/employees",
    icon: Users,
    badge: null,
    description: "Team and permissions",
  },
  {
    title: "Billing",
    url: "/admin/billing",
    icon: CreditCard,
    badge: null,
    description: "Subscriptions and payments",
  },
];

const operationsNavigation: NavigationItem[] = [
  {
    title: "Operations",
    url: "/admin/operations",
    icon: Activity,
    badge: null,
    description: "Deployments and monitoring",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
    badge: null,
    description: "Reports and insights",
  },
  {
    title: "Observability",
    url: "/admin/observability",
    icon: Shield,
    badge: null,
    description: "Metrics and alerts",
  },
  {
    title: "System Health",
    url: "/admin/system-health",
    icon: Shield,
    badge: null,
    description: "Health checks and diagnostics",
  },
];

const platformNavigation: NavigationItem[] = [
  {
    title: "POS Systems",
    url: "/admin/pos-systems",
    icon: Utensils,
    badge: null,
    description: "Point of sale integrations",
  },
  {
    title: "Catering",
    url: "/admin/catering",
    icon: ChefHat,
    badge: null,
    description: "Catering orders and menu management",
  },
  {
    title: "Domains",
    url: "/admin/domains",
    icon: Globe,
    badge: null,
    description: "Domain management",
  },
  {
    title: "Agency Kit",
    url: "/admin/agency-kit",
    icon: Building2,
    badge: null,
    description: "Partner and agency tools",
  },
  {
    title: "Integrations",
    url: "/admin/integrations",
    icon: Plug,
    badge: null,
    description: "Connect external services",
  },
  {
    title: "Support",
    url: "/admin/support",
    icon: LifeBuoy,
    badge: null,
    description: "Customer support tickets",
  },
  {
    title: "Roadmap",
    url: "/admin/roadmap",
    icon: Rocket,
    badge: null,
    description: "Feature roadmap",
  },
];

const bottomNavigation: NavigationItem[] = [
  {
    title: "Profile",
    url: "/admin/profile",
    icon: User,
    badge: null,
    description: "User profile and preferences",
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
    badge: "3",
    description: "System notifications",
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    badge: null,
    description: "System configuration",
  },
];

interface NavigationSectionProps {
  title: string;
  items: NavigationItem[];
  isActive: (path: string) => boolean;
  getNavClassName: (path: string) => string;
  showTooltips: boolean;
}

const NavigationSection = memo<NavigationSectionProps>(
  ({ title, items, isActive, getNavClassName, showTooltips }) => {
    const { open } = useSidebar();

    return (
      <SidebarGroup>
        <SidebarGroupLabel className={!open ? "sr-only" : ""}>
          {title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    className={getNavClassName(item.url)}
                    title={showTooltips ? item.description : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {open && (
                      <>
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant={
                              isActive(item.url) ? "secondary" : "outline"
                            }
                            className="ml-auto text-xs font-medium"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  },
);

NavigationSection.displayName = "NavigationSection";

export const AdminSidebar = memo(() => {
  const { open } = useSidebar();
  const { sidebarOpen, toggleSidebar } = useDashboardStore();
  const location = useLocation();
  const { count: tenantCount, loading: tenantCountLoading } = useTenantCount();

  const isActive = useMemo(
    () => (path: string) => {
      if (path === "/admin/dashboard") {
        return (
          location.pathname === "/admin/dashboard" ||
          location.pathname === "/admin"
        );
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  const getNavClassName = useMemo(
    () => (path: string) => {
      const baseClasses =
        "w-full justify-start transition-all duration-200 hover:bg-accent/50";
      const activeClasses = "bg-accent text-accent-foreground font-medium";
      const inactiveClasses = "text-muted-foreground hover:text-foreground";

      return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`;
    },
    [isActive],
  );

  // Create dynamic navigation with real tenant count
  const dynamicMainNavigation = useMemo(() => {
    return mainNavigation.map((item) => {
      if (item.title === "Tenants") {
        return {
          ...item,
          badge: tenantCountLoading ? "..." : tenantCount.toString(),
        };
      }
      return item;
    });
  }, [tenantCount, tenantCountLoading]);

  return (
    <Sidebar
      className={`${!open ? "w-16" : "w-64"} border-r border-border/40 transition-all duration-300 bg-sidebar shadow-card`}
    >
      {/* Brand Header - Aligned with main header */}
      <div className="h-14 flex items-center px-4 border-b border-border/40 bg-gradient-glass">
        {open && (
          <div className="flex items-center gap-3">
            <img
              src="/logo_svg.svg"
              alt="Blunari"
              className="h-8 w-8 rounded-lg object-cover shadow-elegant"
              loading="lazy"
            />
            <div>
              <span className="text-sm font-semibold text-sidebar-foreground">
                Blunari
              </span>
              <p className="text-xs text-sidebar-foreground/70">Admin Portal</p>
            </div>
          </div>
        )}
        {!open && (
          <img
            src="/logo_svg.svg"
            alt="Blunari"
            className="h-8 w-8 rounded-lg object-cover shadow-elegant mx-auto"
            loading="lazy"
          />
        )}
      </div>

      <SidebarContent className="flex flex-col justify-between">
        {/* Main Navigation */}
        <div className="space-y-4 py-6">
          <NavigationSection
            title="Main"
            items={dynamicMainNavigation}
            isActive={isActive}
            getNavClassName={getNavClassName}
            showTooltips={!open}
          />

          <NavigationSection
            title="Operations"
            items={operationsNavigation}
            isActive={isActive}
            getNavClassName={getNavClassName}
            showTooltips={!open}
          />

          <NavigationSection
            title="Platform"
            items={platformNavigation}
            isActive={isActive}
            getNavClassName={getNavClassName}
            showTooltips={!open}
          />
        </div>

        {/* Bottom Navigation */}
        <SidebarFooter className="border-t border-border/40 bg-gradient-glass p-2">
          <NavigationSection
            title="Account"
            items={bottomNavigation}
            isActive={isActive}
            getNavClassName={getNavClassName}
            showTooltips={!open}
          />
          {open && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Shield className="h-3 w-3" />
                <span>v2.1.0 • Secure</span>
              </div>
            </div>
          )}
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
});

AdminSidebar.displayName = "AdminSidebar";
