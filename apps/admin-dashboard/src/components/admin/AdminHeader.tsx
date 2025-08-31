import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  CreditCard, 
  Activity,
  UserPlus,
  AlertTriangle,
  Search,
  Plus,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function AdminHeader() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { notifications, getTimeAgo, getNotificationIcon, getNotificationColor } = useNotifications();

  // Get unread notifications (recent ones from last 24 hours)
  const unreadNotifications = notifications.filter(n => {
    const notifDate = new Date(n.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifDate > dayAgo;
  }).slice(0, 5); // Show only latest 5

  const initials = profile?.first_name && profile?.last_name 
    ? `${profile.first_name[0]}${profile.last_name[0]}` 
    : user?.email?.[0]?.toUpperCase() || "A";

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email?.split('@')[0] || "Admin";

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  }, [searchQuery]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate, signOut]);

  const handleNotificationClick = useCallback(() => {
    navigate('/admin/notifications')
  }, [navigate]);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'User': return User;
      case 'UserPlus': return UserPlus;
      case 'CreditCard': return CreditCard;
      case 'Activity': return Activity;
      case 'AlertTriangle': return AlertTriangle;
      default: return Bell;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 text-white">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-slate-800 transition-colors duration-200 text-white" />
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Go to..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full pl-10 pr-16 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:bg-slate-700 focus:border-slate-600 focus:ring-0"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-700 text-slate-300 rounded border border-slate-600">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Support Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-slate-800 hover:text-white border-0 h-8 px-3"
              >
                <span className="text-sm">Support</span>
                <svg className="w-2.5 h-2.5 ml-2" fill="none" viewBox="0 0 10 6">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
            >
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                Documentation
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                Contact Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-slate-800 hover:text-white border-0 h-8 px-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-sm">Add</span>
                <svg className="w-2.5 h-2.5 ml-2" fill="none" viewBox="0 0 10 6">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
            >
              <DropdownMenuItem 
                onClick={() => navigate('/admin/tenants/new')}
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                New Tenant
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/admin/employees')}
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Invite Employee
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                Create Integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-slate-800 hover:text-white border-0 h-8 px-3"
              >
                <span className="text-sm">Theme</span>
                <svg className="w-2.5 h-2.5 ml-2" fill="none" viewBox="0 0 10 6">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
            >
              <ThemeToggle />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-8 w-8 text-white hover:bg-slate-800 hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs bg-orange-500 text-white border-2 border-slate-900">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadNotifications.length} new
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              
              <div className="max-h-96 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  unreadNotifications.map((notification) => {
                    const IconComponent = getIconComponent(getNotificationIcon(notification.type));
                    const color = getNotificationColor(notification.type);
                    
                    return (
                      <DropdownMenuItem 
                        key={notification.id}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            color === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
                            color === 'green' ? 'bg-green-100 dark:bg-green-900' :
                            color === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
                            color === 'red' ? 'bg-red-100 dark:bg-red-900' :
                            'bg-gray-100 dark:bg-gray-900'
                          }`}>
                            <IconComponent className={`h-4 w-4 ${
                              color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                              color === 'green' ? 'text-green-600 dark:text-green-400' :
                              color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                              color === 'red' ? 'text-red-600 dark:text-red-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{notification.message}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{getTimeAgo(notification.created_at)}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
              
              <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNotificationClick}
                  className="w-full justify-center hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{user?.email}</p>
                  <Badge variant="secondary" className="text-xs w-fit mt-1">Administrator</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate('/admin/profile')}
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/admin/settings')}
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}