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
  Focus
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
}

export function TopBar({ 
  onDateChange, 
  selectedDate = new Date().toISOString().split('T')[0], 
  onNewReservation = () => {},
  onExport = () => {},
  onNotify = () => {}
}: TopBarProps) {
  const navigate = useNavigate();
  const { setMode } = useUIMode();
  const { triggerModeTransition } = useModeTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState("demo-restaurant");
  const [contextFilter, setContextFilter] = useState("all");

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
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Live Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-md border border-white/10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
              LIVE
            </span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="glass border-white/10 text-white/90 h-10 w-10 p-0 hover:bg-white/5"
              onClick={onNotify}
              title="Send notifications for selected/today's reservations"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center p-0">
              2
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
