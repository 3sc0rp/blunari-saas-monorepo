import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUIMode } from "@/lib/ui-mode";
import { useModeTransition } from "@/contexts/ModeTransitionContext";
import { 
  Search, 
  Plus, 
  Download, 
  Bell, 
  Calendar,
  ChevronDown,
  MoreVertical,
  Focus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
  Trash2,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover as UIPopover, PopoverTrigger as UIPopoverTrigger, PopoverContent as UIPopoverContent } from "@/components/ui/popover";
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { formatDistanceToNow } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onDateChange?: (date: string) => void;
  selectedDate?: string;
  onNewReservation?: () => void;
  onExport?: () => void;
  onNotify?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function TopBar({ 
  onDateChange, 
  selectedDate = new Date().toISOString().split('T')[0], 
  onNewReservation = () => {},
  onExport = () => {},
  onNotify = () => {},
  onSearch = () => {},
  searchQuery = ""
}: TopBarProps) {
  const navigate = useNavigate();
  const { setMode } = useUIMode();
  const { triggerModeTransition } = useModeTransition();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState("demo-restaurant");
  const [contextFilter, setContextFilter] = useState("all");
  const { notifications, unreadCount, loading: notifLoading, markRead, markAllRead, markManyRead, markUnread, isRead, counts, loadMore, playNotificationSound, refresh } = useTenantNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread' | 'reservations' | 'system'>('all');
  const [notifFilter, setNotifFilter] = useState<{search: string; type: string | null;}>({ search: '', type: null });

  // Derived + memoized filtered notifications
  const filteredNotifications = React.useMemo(() => {
    let list = notifications;
    if (notifTab === 'unread') {
      list = list.filter(n => !isRead(n.id));
    } else if (notifTab === 'reservations') {
      list = list.filter(n => (n.type || '').includes('reservation'));
    } else if (notifTab === 'system') {
      list = list.filter(n => !(n.type || '').includes('reservation'));
    }
    if (notifFilter.type) list = list.filter(n => n.type === notifFilter.type);
    if (notifFilter.search.trim()) {
      const q = notifFilter.search.toLowerCase();
      list = list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q));
    }
    return list.slice(0, 100); // safety cap
  }, [notifications, notifTab, notifFilter]);

  const grouped = React.useMemo(() => {
    // Group by day (Today, Yesterday, Older)
    const now = new Date();
    const todayKey = now.toDateString();
    const y = new Date(now.getTime() - 86400000).toDateString();
    const buckets: Record<string, typeof filteredNotifications> = {};
    filteredNotifications.forEach(n => {
      const k = new Date(n.created_at).toDateString();
      const label = k === todayKey ? 'Today' : k === y ? 'Yesterday' : new Date(n.created_at).getFullYear() === now.getFullYear() ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : new Date(n.created_at).toLocaleDateString();
      buckets[label] = buckets[label] || [];
      buckets[label].push(n);
    });
    return Object.entries(buckets).map(([label, items]) => ({ label, items }));
  }, [filteredNotifications]);

  const notificationIcon = (type?: string) => {
    if (!type) return <Info className="w-4 h-4 text-white/50" />;
    if (type.includes('reservation')) return <Calendar className="w-4 h-4 text-blue-300" />;
    if (type.includes('warning') || type.includes('error')) return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Info className="w-4 h-4 text-white/50" />;
  };

  const handleMarkAllVisible = () => {
    markManyRead(filteredNotifications.map(n => n.id));
  };

  const handleQuickAck = (nId: string) => {
    markRead(nId);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(format(date, 'yyyy-MM-dd'));
      setDatePickerOpen(false);
    }
  };

  const handleAdvanceModeClick = async () => {
    try {
      // Trigger the global transition animation
      await triggerModeTransition("operations", "management");
      
      // Switch to management mode
      await setMode("management");
      
      // Navigate to the dashboard (management section)
      navigate('/dashboard');
    } catch (error) {
      console.error("Error switching to management mode:", error);
      // Fallback navigation even if mode switching fails
      navigate('/dashboard');
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    }
    
    return format(date, 'MMM d');
  };

  return (
    <div className="glass rounded-[10px] p-4">
      <div className="flex items-center justify-between">
        {/* Left Group - Brand */}
        <div className="flex items-center gap-6">
          <img 
            src="/logo.png" 
            alt="Blunari Logo" 
            className="h-8 w-auto"
          />
        </div>

        {/* Control Group */}
        <div className="flex items-center gap-3">
          {/* Venue Switcher */}
          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
            <SelectTrigger className="glass border-white/10 text-white/90 w-[160px] h-10 focus:ring-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/10">
              <SelectItem value="demo-restaurant">Demo Restaurant</SelectItem>
              <SelectItem value="branch-1">Branch Location 1</SelectItem>
              <SelectItem value="branch-2">Branch Location 2</SelectItem>
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search Guests"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="glass border-white/10 text-white placeholder:text-white/50 pl-10 w-[180px] h-10 focus:ring-accent"
            />
          </div>

          {/* Context Select */}
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="glass border-white/10 text-white/90 w-[100px] h-10 focus:ring-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "glass border-white/10 text-white/90 h-10 px-4 justify-between hover:bg-white/5",
                  "focus:ring-accent focus:ring-2"
                )}
              >
                {formatDisplayDate(selectedDate)}
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="glass border-white/10 w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={parseISO(selectedDate)}
                onSelect={handleDateSelect}
                initialFocus
                className="text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Group - Actions */}
        <div className="flex items-center gap-3">
          {/* Focus Mode Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdvanceModeClick}
            className="
              relative overflow-hidden group
              bg-gradient-to-r from-accent/10 to-accent/5 
              border-accent/20 text-accent 
              hover:from-accent/20 hover:to-accent/10 
              hover:border-accent/30 hover:text-accent
              transition-all duration-300
              backdrop-blur-sm shadow-sm
              hover:shadow-accent/20 hover:shadow-lg
              h-10 px-4
            "
          >
            {/* Subtle animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <Focus className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
            <span className="relative font-medium">
              Advance Mode
            </span>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-lg bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
          </Button>

          {/* New Reservation */}
          <Button
            onClick={onNewReservation}
            className="bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-2))] text-white border-0 h-10 px-4 hover:opacity-90 font-medium relative group"
            title="Create new reservation (Press N)"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reservation
            <kbd className="absolute -top-2 -right-2 bg-white/20 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              N
            </kbd>
          </Button>

          {/* Export */}
          <Button
            variant="secondary"
            onClick={onExport}
            className="glass border-white/10 text-white/90 h-10 px-4 hover:bg-white/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          {/* Notification Bell */}
          <UIPopover open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) refresh(); }}>
            <UIPopoverTrigger asChild>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass border-white/10 text-white/90 h-10 w-10 p-0 hover:bg-white/5"
                  title="Notifications"
                  aria-label="Open notifications"
                >
                  <Bell className="w-4 h-4" />
                </Button>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center p-0">
                    {Math.min(unreadCount, 99)}
                  </Badge>
                )}
              </div>
            </UIPopoverTrigger>
            <UIPopoverContent className="w-[420px] glass border-white/10 p-0" align="end">
              {/* Header */}
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white/90 flex items-center gap-1">
                    <Bell className="w-4 h-4" /> Notifications
                  </span>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500/90 text-white h-5 px-1 text-[11px]">{Math.min(unreadCount, 99)} new</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => refresh()} title="Refresh">
                    ↻
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onNotify}>Send Reminders</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={handleMarkAllVisible} title="Mark visible as read">
                    <CheckCheck className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => { markAllRead(); }} title="Mark all read">
                    <CheckCircle2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {/* Tabs & Filters */}
              <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                {(['all','unread','reservations','system'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setNotifTab(tab)}
                    className={cn('text-[11px] px-3 py-1 rounded-full border transition-colors',
                      notifTab === tab ? 'bg-accent/30 border-accent/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80')}
                  >
                    {tab === 'all' && `All (${counts.all})`}
                    {tab === 'unread' && `Unread (${counts.unread})`}
                    {tab === 'reservations' && `Reservations (${counts.reservations})`}
                    {tab === 'system' && `System (${counts.system})`}
                  </button>
                ))}
                <div className="relative ml-auto">
                  <Filter className="w-3.5 h-3.5 text-white/40 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    value={notifFilter.search}
                    onChange={(e) => setNotifFilter(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search"
                    className="pl-7 h-8 text-[12px] bg-white/5 border-white/10 focus:ring-accent"
                  />
                </div>
              </div>
              {/* Body */}
              <div className="max-h-96 overflow-auto p-0 divide-y divide-white/5 custom-scrollbar">
                {notifLoading && (
                  <div className="p-4 space-y-2">
                    <div className="h-9 rounded-md bg-white/5 animate-pulse" />
                    <div className="h-9 rounded-md bg-white/5 animate-pulse" />
                    <div className="h-9 rounded-md bg-white/5 animate-pulse" />
                  </div>
                )}
                {!notifLoading && filteredNotifications.length === 0 && (
                  <div className="py-8 text-center text-xs text-white/60">No notifications</div>
                )}
                {!notifLoading && grouped.map(group => (
                  <div key={group.label} className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-white/40 font-semibold">{group.label}</div>
                    {group.items.map(n => {
                      const read = isRead(n.id);
                      return (
                        <div
                          key={n.id}
                          className={cn('px-3 py-2 flex items-start gap-3 group hover:bg-white/5 transition-colors', !read && 'bg-accent/5')}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleQuickAck(n.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAck(n.id); }}
                          aria-label={`Notification ${n.title || n.type}`}
                        >
                          <div className="mt-0.5">{notificationIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[12px] font-medium truncate', !read ? 'text-white' : 'text-white/80')}>{n.title || n.type}</span>
                              {!read && <span className="w-2 h-2 rounded-full bg-accent shadow shadow-accent/40" />}
                            </div>
                            <div className="text-[11px] text-white/60 line-clamp-2">{n.message}</div>
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-white/40">
                              <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (isRead(n.id)) { 
                                    markUnread(n.id); 
                                  } else { 
                                    handleQuickAck(n.id); 
                                  }
                                }}
                                className="text-[10px] text-accent hover:underline"
                              >{isRead(n.id) ? 'Mark Unread' : 'Mark Read'}</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(n.message || ''); }}
                                className="text-[10px] text-white/50 hover:text-white/70"
                                title="Copy message"
                              >Copy</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 gap-2">
                <span>{filteredNotifications.length} shown</span>
                <div className="flex items-center gap-2 ml-auto">
                  {notifications.length >=  counts.all && notifications.length < 300 && (
                    <button className="hover:text-white/70" onClick={() => loadMore()}>Load more</button>
                  )}
                  <button className="hover:text-white/70" onClick={() => setNotifFilter({ search: '', type: null })}>Reset</button>
                  <button className="hover:text-white/70" onClick={() => setNotifOpen(false)}>Close</button>
                </div>
              </div>
            </UIPopoverContent>
          </UIPopover>
        </div>
      </div>
    </div>
  );
}
