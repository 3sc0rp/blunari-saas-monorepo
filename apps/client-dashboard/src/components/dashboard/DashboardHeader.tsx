import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useTenantBranding } from '@/contexts/TenantBrandingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Wifi,
  WifiOff,
  Calendar,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DashboardHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { tenant } = useTenant();
  const { user, signOut } = useAuth();
  const { isConnected } = useRealtimeBookings(tenant?.id);
  const { restaurantName } = useTenantBranding();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-gradient-to-r from-surface via-surface-2 to-surface border-b border-surface-2 px-4 py-6 md:px-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        {/* Restaurant Info & Date */}
        <div className="space-y-2">
          <h1 className="text-h2 font-bold text-brand">
            {restaurantName}
          </h1>
          <p className="text-body-sm text-text-muted flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </p>
        </div>

        {/* Single Status Indicator */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-surface border border-surface-3 rounded-lg shadow-elev-1">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                isConnected 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-destructive'
                }`}></div>
                <span className="text-sm font-medium">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="text-body-sm">
                <div className="font-semibold text-text font-tabular">87%</div>
                <div className="text-xs text-text-muted">Capacity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="w-9 h-9 p-0 bg-surface border-surface-3 hover:bg-surface-2 hover:border-brand/20 transition-all duration-300"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-text-muted hover:text-brand transition-colors duration-300" />
            ) : (
              <Sun className="h-4 w-4 text-text-muted hover:text-brand transition-colors duration-300" />
            )}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="relative bg-surface border-surface-3 hover:bg-surface-2 hover:border-brand/20 transition-all duration-300"
          >
            <Bell className="h-4 w-4 text-text-muted hover:text-brand transition-colors duration-300" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-destructive"></Badge>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="bg-surface border-surface-3 hover:bg-surface-2 hover:border-brand/20 transition-all duration-300"
          >
            <Settings className="h-4 w-4 text-text-muted hover:text-brand transition-colors duration-300" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-surface border-surface-3 hover:bg-surface-2 hover:border-brand/20 transition-all duration-300"
              >
                <User className="h-4 w-4 text-text-muted hover:text-brand transition-colors duration-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.first_name || 'User'} {user?.user_metadata?.last_name || ''}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;