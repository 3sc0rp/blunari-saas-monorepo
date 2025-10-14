import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  Code,
  Plug,
  Plus,
  ChevronUp,
  Sparkles,
} from "lucide-react";

// Primary navigation items - Most frequently used
      const primaryNavigation = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    color: "from-blue-500 to-blue-600",
    description: "Overview & insights"
  },
  { 
    name: "Bookings", 
    href: "/dashboard/bookings", 
    icon: Calendar,
    color: "from-emerald-500 to-emerald-600",
    description: "Reservations"
  },
  { 
    name: "Tables", 
    href: "/dashboard/tables", 
    icon: TableProperties,
    color: "from-amber-500 to-amber-600",
    description: "Table management"
  },
  { 
    name: "Customers", 
    href: "/dashboard/customers", 
    icon: Users,
    color: "from-purple-500 to-purple-600",
    description: "Customer database"
  },
];

// Secondary navigation - Quick access tools
      const quickActions = [
  { 
    name: "Catering", 
    href: "/dashboard/catering", 
    icon: ChefHat,
    badge: "New",
    description: "Catering orders"
  },
  { 
    name: "Analytics", 
    href: "/dashboard/analytics", 
    icon: BarChart3,
    description: "Reports & metrics"
  },
  { 
    name: "Messages", 
    href: "/dashboard/messages", 
    icon: MessageSquare,
    badge: "3",
    description: "Customer messages"
  },
  { 
    name: "Settings", 
    href: "/dashboard/settings", 
    icon: Settings,
    description: "App settings"
  },
];

// Utility tools - Less frequently used
      const utilityNavigation = [
  { name: "Waitlist", href: "/dashboard/waitlist", icon: Clock },
  { name: "Staff", href: "/dashboard/staff", icon: Users },
  { name: "Widget", href: "/dashboard/widget-preview", icon: Code },
  { name: "POS", href: "/dashboard/pos-integrations", icon: Plug },
];

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll (mobile UX pattern)
  useEffect(() => {
    const controlNavBar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavBar, { passive: true });
      return () => window.removeEventListener('scroll', controlNavBar);
    }
  }, [lastScrollY]);

  const isActivePath = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Background Blur Overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsExpanded(false)}
            style={{ bottom: '80px' }} // Don't cover the nav bar
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ 
          y: isVisible ? 0 : 100, 
          opacity: isVisible ? 1 : 0 
        }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 200,
          duration: 0.3
        }}
        className="fixed bottom-0 left-0 right-0 z-50"
        role="navigation"
        aria-label="Bottom navigation"
      >
        {/* Expanded Quick Actions Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300,
                duration: 0.4
              }}
              className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-t-3xl shadow-2xl mb-1 mx-2"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <h3 className="font-semibold text-foreground">Quick Actions</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((item, index) => {
                    const isActive = isActivePath(item.href);
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <NavLink
                          to={item.href}
                          onClick={() => setIsExpanded(false)}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-xl transition-all duration-200 group relative overflow-hidden",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20"
                              : "bg-surface-2/50 hover:bg-surface-2/80 text-foreground hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <div className={cn(
                              "p-2 rounded-lg transition-all duration-200",
                              isActive 
                                ? "bg-white/20" 
                                : "bg-primary/10 group-hover:bg-primary/15"
                            )}>
                              <item.icon className="h-5 w-5" />
                            </div>
                            {item.badge && (
                              <Badge 
                                variant={isActive ? "secondary" : "default"}
                                className="h-5 text-xs"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            <p className={cn(
                              "text-xs mt-0.5",
                              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}>
                              {item.description}
                            </p>
                          </div>
                        </NavLink>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Utility Tools - Compact Row */}
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Tools
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {utilityNavigation.map((item) => {
                      const isActive = isActivePath(item.href);
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsExpanded(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-surface-2/30 hover:bg-surface-2/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Navigation Bar */}
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-2xl mx-2 mb-2 rounded-2xl">
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-2xl" />
            
            {/* Navigation Items */}
            <div className="relative grid grid-cols-5 p-2">
              {/* Primary Navigation - 4 items */}
              {primaryNavigation.map((item, index) => {
                const isActive = isActivePath(item.href);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    <NavLink
                      to={item.href}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 group relative",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        isActive
                          ? "text-primary scale-105"
                          : "text-muted-foreground hover:text-foreground hover:scale-105"
                      )}
                    >
                      {/* Active Background */}
                      {isActive && (
                        <motion.div
                          layoutId="activeBackground"
                          className={cn(
                            "absolute inset-0 bg-gradient-to-br rounded-xl opacity-20",
                            item.color
                          )}
                          initial={false}
                          transition={{ 
                            type: "spring", 
                            damping: 20, 
                            stiffness: 300 
                          }}
                        />
                      )}
                      
                      {/* Icon Container */}
                      <div className={cn(
                        "relative p-2 rounded-lg transition-all duration-300",
                        isActive 
                          ? "bg-primary/15 shadow-lg" 
                          : "group-hover:bg-surface-2/50"
                      )}>
                        <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                        
                        {/* Active Indicator */}
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                          />
                        )}
                      </div>
                      
                      {/* Label */}
                      <span className={cn(
                        "text-xs font-medium mt-1 transition-all duration-300 text-center leading-tight",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {item.name}
                      </span>
                    </NavLink>
                  </motion.div>
                );
              })}

              {/* Expand Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.4,
                  type: "spring",
                  damping: 20,
                  stiffness: 300
                }}
              >
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center rounded-xl transition-all duration-300 group relative",
                    "bg-transparent hover:bg-primary/10 text-muted-foreground hover:text-primary",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isExpanded && "bg-primary/15 text-primary scale-105"
                  )}
                  variant="ghost"
                >
                  <div className="relative p-2 rounded-lg transition-all duration-300 group-hover:bg-primary/10">
                    <motion.div
                      animate={{ rotate: isExpanded ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Plus className="h-5 w-5" />
                    </motion.div>
                    
                    {/* Sparkle Effect */}
                    {!isExpanded && (
                      <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent animate-pulse opacity-70" />
                    )}
                  </div>
                  <span className="text-xs font-medium mt-1 transition-colors duration-300">
                    More
                  </span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Safe Area for iOS devices */}
        <div className="h-safe pb-safe bg-background/50" />
      </motion.nav>
    </>
  );
};

export default BottomNavigation;

