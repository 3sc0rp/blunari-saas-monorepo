import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
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
  Plug
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Tables', href: '/dashboard/tables', icon: TableProperties },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Widget', href: '/dashboard/widget-preview', icon: Code },
];

const secondaryNavigation = [
  { name: 'POS', href: '/dashboard/pos-integrations', icon: Plug },
  { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock },
  { name: 'Staff', href: '/dashboard/staff', icon: ChefHat },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const BottomNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg motion-reduce:transform-none"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      {/* Main Navigation Row - More Compact */}
      <div className="grid grid-cols-5 px-1 py-1" role="tablist">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex flex-col items-center justify-center py-1 px-1 rounded-md transition-all duration-200 motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
                ${isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              aria-label={`Navigate to ${item.name}`}
              role="tab"
              aria-selected={isActive}
            >
              <div className={`
                p-1.5 rounded-md transition-all duration-200 motion-reduce:transition-none
                ${isActive 
                  ? 'bg-primary/10' 
                  : 'hover:bg-muted'
                }
              `}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium mt-0.5 truncate leading-tight">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
      
      {/* Secondary Navigation Row - Compact */}
      <div className="border-t border-border bg-muted/20">
        <div className="flex justify-center py-1">
          <div className="flex gap-0.5 px-2 max-w-full overflow-x-auto scrollbar-none" role="tablist">
            {secondaryNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-1.5 py-1.5 px-2.5 rounded-md transition-all duration-200 motion-reduce:transition-none whitespace-nowrap flex-shrink-0 text-xs
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }
                  `}
                  aria-label={`Navigate to ${item.name}`}
                  role="tab"
                  aria-selected={isActive}
                >
                  <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Safe area for mobile devices */}
      <div className="h-safe-area-bottom bg-background"></div>
    </motion.nav>
  );
};

export default BottomNavigation;