import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useTenantBranding } from '@/contexts/TenantBrandingContext';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Wifi,
  WifiOff,
  Calendar,
  TrendingUp
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
    <header className="bg-gradient-subtle border-b border-border px-4 py-6 md:px-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        {/* Restaurant Info & Date */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {restaurantName}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3">
          <Card className="px-3 py-2 bg-gradient-warm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary-foreground" />
              <div className="text-sm">
                <div className="font-semibold text-secondary-foreground">87%</div>
                <div className="text-xs text-secondary-foreground/80">Capacity</div>
              </div>
            </div>
          </Card>

          <Card className="px-3 py-2">
            <div className="flex items-center gap-2">
              {/* Real-time connection indicator */}
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-pulse-soft' : 'bg-destructive'}`}></div>
              <div className="text-sm">
                <div className="font-semibold">
                  {isConnected ? 'Live' : 'Offline'}
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Real-time connection status */}
          <Badge 
            variant={isConnected ? "default" : "destructive"} 
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>

          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-destructive"></Badge>
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4" />
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