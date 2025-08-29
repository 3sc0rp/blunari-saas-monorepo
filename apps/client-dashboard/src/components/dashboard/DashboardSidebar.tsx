import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import { useTenantBranding } from '@/contexts/TenantBrandingContext';
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
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Tables', href: '/dashboard/tables', icon: TableProperties },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock },
  { name: 'Staff', href: '/dashboard/staff', icon: ChefHat },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const DashboardSidebar: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { tenant } = useTenant();
  const { logoUrl, restaurantName } = useTenantBranding();

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo and tenant info */}
          <div className="flex h-16 items-center px-6 border-b border-border">
            <img 
              src={logoUrl} 
              alt="Restaurant Logo" 
              className="h-8 w-auto"
            />
            <div className="ml-3">
              <h2 className="text-sm font-semibold text-foreground">
                {restaurantName}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {tenant?.status || 'Active'}
              </Badge>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              Powered by Blunari
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default DashboardSidebar;