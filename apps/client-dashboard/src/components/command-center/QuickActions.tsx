import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  UserPlus, 
  Calendar, 
  Clock, 
  Download, 
  Search,
  Command,
  BookOpen,
  MapPin,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  color: string;
  description: string;
  handler: () => void;
}

const QuickActions: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'new-booking',
      label: 'New Booking',
      icon: Calendar,
      shortcut: '⌘ + N',
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      description: 'Create a new reservation',
      handler: handleNewBooking
    },
    {
      id: 'new-walkin',
      label: 'Walk-in',
      icon: UserPlus,
      shortcut: '⌘ + W',
      color: 'bg-green-500 hover:bg-green-600 text-white',
      description: 'Add walk-in guest',
      handler: handleNewWalkIn
    },
    {
      id: 'block-table',
      label: 'Block Table',
      icon: MapPin,
      shortcut: '⌘ + B',
      color: 'bg-amber-500 hover:bg-amber-600 text-white',
      description: 'Block table for maintenance',
      handler: handleBlockTable
    },
    {
      id: 'export-data',
      label: 'Export',
      icon: Download,
      shortcut: '⌘ + E',
      color: 'bg-slate-500 hover:bg-slate-600 text-white',
      description: 'Export today\'s data',
      handler: handleExportData
    }
  ];

  // Action handlers
  function handleNewBooking() {
    setActiveAction('new-booking');
    // TODO: Open new booking modal/drawer
    setTimeout(() => setActiveAction(null), 1000);  }

  function handleNewWalkIn() {
    setActiveAction('new-walkin');
    // TODO: Open walk-in guest form
    setTimeout(() => setActiveAction(null), 1000);  }

  function handleBlockTable() {
    setActiveAction('block-table');
    // TODO: Open table blocking interface
    setTimeout(() => setActiveAction(null), 1000);  }

  function handleExportData() {
    setActiveAction('export-data');
    // TODO: Trigger data export
    setTimeout(() => setActiveAction(null), 1000);  }

  // Command palette handler
  const handleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
    // TODO: Implement command palette  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            handleCommandPalette();
            break;
          case 'n':
            e.preventDefault();
            handleNewBooking();
            break;
          case 'w':
            e.preventDefault();
            handleNewWalkIn();
            break;
          case 'b':
            e.preventDefault();
            handleBlockTable();
            break;
          case 'e':
            e.preventDefault();
            handleExportData();
            break;
        }
      }

      // ESC to close command palette
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, handleCommandPalette]);

  return (
    <div className="flex items-center gap-2">
      {/* Primary actions */}
      <div className="flex items-center gap-2">
        {quickActions.slice(0, 2).map((action) => (
          <motion.div
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={action.handler}
              className={cn(
                "gap-2 relative overflow-hidden",
                action.color,
                activeAction === action.id && "ring-2 ring-white/50"
              )}
              size="sm"
              aria-label={action.description}
              title={`${action.label} (${action.shortcut})`}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
              
              {/* Active indicator */}
              <AnimatePresence>
                {activeAction === action.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/20 animate-pulse"
                  />
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-surface-2/50 mx-1" />

      {/* Secondary actions */}
      <div className="flex items-center gap-2">
        {quickActions.slice(2, 4).map((action) => (
          <motion.div
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={action.handler}
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 relative",
                activeAction === action.id && "ring-2 ring-brand/50"
              )}
              aria-label={action.description}
              title={`${action.label} (${action.shortcut})`}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden md:inline">{action.label}</span>
              
              {/* Active indicator */}
              <AnimatePresence>
                {activeAction === action.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-brand/10 animate-pulse rounded-md"
                  />
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Command palette trigger */}
      <div className="w-px h-6 bg-surface-2/50 mx-1" />
      
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleCommandPalette}
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-text relative"
          aria-label="Open command palette"
          title="Command Palette (⌘K)"
        >
          <Command className="w-4 h-4" />
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-mono">
            ⌘K
          </Badge>
          
          {/* Pulse effect when palette is "opening" */}
          <AnimatePresence>
            {isCommandPaletteOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 bg-brand/10 rounded-md animate-pulse"
                onAnimationComplete={() => setIsCommandPaletteOpen(false)}
              />
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Status indicator */}
      <div className="hidden lg:flex items-center gap-2 ml-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>Live</span>
        </div>
        <span>•</span>
        <span>Real-time updates</span>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="hidden xl:flex items-center gap-1 ml-3 text-xs text-muted-foreground bg-surface-2/30 rounded-md px-2 py-1">
        <BookOpen className="w-3 h-3" />
        <span>Press ⌘K for shortcuts</span>
      </div>
    </div>
  );
};

export default QuickActions;

