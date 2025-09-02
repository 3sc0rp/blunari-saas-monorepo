import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  HelpCircle,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  Building2,
  Zap,
  Command,
  Sun,
  Moon,
  Shield,
  ChevronDown,
  Home,
  Users2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

// Page title mapping for breadcrumb
const pageTitles: Record<string, { title: string; parent?: string }> = {
  '/admin/dashboard': { title: 'Dashboard' },
  '/admin/tenants': { title: 'Tenants', parent: 'Tenant Management' },
  '/admin/tenants/new': { title: 'New Tenant', parent: 'Tenants' },
  '/admin/tenants/provision': { title: 'Provision', parent: 'Tenants' },
  '/admin/analytics': { title: 'Analytics' },
  '/admin/billing': { title: 'Billing' },
  '/admin/catering': { title: 'Catering Management' },
  '/admin/employees': { title: 'Employees' },
  '/admin/settings': { title: 'Settings' },
  '/admin/notifications': { title: 'Notifications' },
  '/admin/profile': { title: 'Profile' },
};

interface SystemStatus {
  online: boolean;
  lastSync: Date;
  pendingActions: number;
}

export function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    online: true,
    lastSync: new Date(),
    pendingActions: 0
  });
  const { notifications, getTimeAgo, getNotificationIcon, getNotificationColor } = useNotifications();

  // Simulate system status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        online: navigator.onLine
      }));
    }, 30000);

    const handleOnline = () => setSystemStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setSystemStatus(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('admin-search')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleQuickSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentPage = pageTitles[location.pathname];
  const isHomePage = location.pathname === '/admin/dashboard';

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
      // Implement search logic here
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

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleQuickSave = useCallback(() => {
    // Implement quick save functionality
    console.log('Quick save triggered');
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'new-tenant':
        navigate('/admin/tenants/new');
        break;
      case 'new-employee':
        navigate('/admin/employees');
        break;
      case 'system-health':
        navigate('/admin/system/health');
        break;
      case 'analytics':
        navigate('/admin/analytics');
        break;
      default:
        break;
    }
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
    <TooltipProvider>
      <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg backdrop-blur-sm">
        {/* Main Header Bar */}
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left Section - Logo, Navigation, Breadcrumb */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            {/* Sidebar Toggle & Logo */}
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-slate-700/50 transition-all duration-200 text-slate-300 hover:text-white" />
              
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-white">Blunari Admin</h1>
                  <p className="text-xs text-slate-400 -mt-1">Restaurant Platform</p>
                </div>
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            <div className="hidden md:flex items-center">
              <Separator orientation="vertical" className="h-6 bg-slate-700/50" />
              <Breadcrumb className="ml-4">
                <BreadcrumbList>
                  {!isHomePage && (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink 
                          href="/admin/dashboard"
                          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                        >
                          <Home className="h-3.5 w-3.5" />
                          Dashboard
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="text-slate-600" />
                    </>
                  )}
                  {currentPage && (
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-white font-medium">
                        {currentPage.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Center Section - Enhanced Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative group">
              <Search className={cn(
                "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
                isSearchFocused ? "text-blue-400" : "text-slate-400"
              )} />
              <Input
                id="admin-search"
                placeholder="Search tenants, users, settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-20 h-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 transition-all duration-200",
                  "focus:bg-slate-700/70 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30",
                  "group-hover:bg-slate-700/30"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-slate-700/50 text-slate-300 rounded border border-slate-600/50 shadow-sm">
                  <Command className="h-3 w-3 mr-1" />K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right Section - Enhanced Action Bar */}
          <div className="flex items-center gap-2">
            {/* System Status & Quick Actions */}
            <div className="hidden lg:flex items-center gap-2 mr-4">
              {/* System Status Indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    {systemStatus.online ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <Wifi className="h-4 w-4 text-green-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                        <WifiOff className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                    <span className="text-xs text-slate-400">
                      {systemStatus.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-center">
                    <p className="font-medium">System Status</p>
                    <p className="text-xs text-muted-foreground">
                      Last sync: {systemStatus.lastSync.toLocaleTimeString()}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Quick Actions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRefresh}
                    className="h-9 px-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Refresh <kbd className="ml-1 text-xs">Ctrl+R</kbd>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleQuickSave}
                    className="h-9 px-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Quick Save <kbd className="ml-1 text-xs">Ctrl+S</kbd>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Enhanced Quick Create Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 text-slate-300 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all duration-200 border border-slate-600/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create</span>
                  <ChevronDown className="w-3 h-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-slate-800/95 backdrop-blur-sm border-slate-700 shadow-2xl"
                sideOffset={8}
              >
                <DropdownMenuLabel className="text-slate-200 font-medium">Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => handleQuickAction('new-tenant')}
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <Building2 className="mr-3 h-4 w-4 text-blue-400" />
                    New Restaurant
                    <DropdownMenuShortcut className="text-slate-500">⌘T</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleQuickAction('new-employee')}
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <Users2 className="mr-3 h-4 w-4 text-green-400" />
                    Invite User
                    <DropdownMenuShortcut className="text-slate-500">⌘U</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleQuickAction('analytics')}
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <Activity className="mr-3 h-4 w-4 text-purple-400" />
                    View Analytics
                    <DropdownMenuShortcut className="text-slate-500">⌘A</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem 
                  onClick={() => handleQuickAction('system-health')}
                  className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                >
                  <Shield className="mr-3 h-4 w-4 text-orange-400" />
                  System Health
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Support Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Help</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-slate-800/95 backdrop-blur-sm border-slate-700 shadow-2xl"
                sideOffset={8}
              >
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                  <HelpCircle className="mr-3 h-4 w-4 text-blue-400" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                  Contact Support
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                  Keyboard Shortcuts
                  <DropdownMenuShortcut className="text-slate-500">⌘K</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                >
                  {theme === 'light' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Toggle theme
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 bg-slate-700/50 mx-2" />

            {/* Enhanced Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative h-9 w-9 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-2 border-slate-800 shadow-lg animate-pulse">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 bg-slate-800/95 backdrop-blur-sm border-slate-700 shadow-2xl"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-4 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Notifications</span>
                    {unreadNotifications.length > 0 && (
                      <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                        {unreadNotifications.length} new
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                
                <div className="max-h-96 overflow-y-auto">
                  {unreadNotifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No new notifications</p>
                      <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    unreadNotifications.map((notification) => {
                      const IconComponent = getIconComponent(getNotificationIcon(notification.type));
                      const color = getNotificationColor(notification.type);
                      
                      return (
                        <DropdownMenuItem 
                          key={notification.id}
                          className="p-4 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 focus:bg-slate-700/50"
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                              color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                              color === 'green' ? 'bg-green-500/20 text-green-400' :
                              color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                              color === 'red' ? 'bg-red-500/20 text-red-400' :
                              'bg-slate-600/50 text-slate-400'
                            )}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200 leading-tight">{notification.title}</p>
                              <p className="text-xs text-slate-400 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-slate-500">{getTimeAgo(notification.created_at)}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
                
                <div className="p-3 border-t border-slate-700">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleNotificationClick}
                    className="w-full justify-center hover:bg-slate-700/70 text-slate-300 hover:text-white"
                  >
                    View all notifications
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Enhanced User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 ring-2 ring-transparent hover:ring-blue-500/20"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 bg-slate-800/95 backdrop-blur-sm border-slate-700 shadow-2xl"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border-blue-500/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" title="Online" />
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/profile')}
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <User className="mr-3 h-4 w-4 text-blue-400" />
                    Profile Settings
                    <DropdownMenuShortcut className="text-slate-500">⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/settings')}
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <Settings className="mr-3 h-4 w-4 text-slate-400" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white"
                  >
                    <CreditCard className="mr-3 h-4 w-4 text-green-400" />
                    Billing
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-slate-700" />
                
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                    <Activity className="mr-3 h-4 w-4 text-purple-400" />
                    Activity Log
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-slate-700/70 text-slate-200 focus:bg-slate-700/70 focus:text-white">
                    <Zap className="mr-3 h-4 w-4 text-yellow-400" />
                    System Status
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-slate-700" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-red-500/10 text-slate-200 hover:text-red-400 focus:bg-red-500/10 focus:text-red-400 transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                  <DropdownMenuShortcut className="text-slate-500">⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Info Bar (Mobile-responsive) */}
        <div className="md:hidden px-6 py-2 bg-slate-800/30 border-t border-slate-700/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              {currentPage && (
                <span className="text-slate-200 font-medium">{currentPage.title}</span>
              )}
              {systemStatus.online && (
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span>Online</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="p-1 rounded hover:bg-slate-700/50">
                <RefreshCw className="h-3 w-3" />
              </button>
              <button onClick={handleQuickSave} className="p-1 rounded hover:bg-slate-700/50">
                <Save className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}