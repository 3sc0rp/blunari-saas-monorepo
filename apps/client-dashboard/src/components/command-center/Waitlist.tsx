import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTodayData } from "@/hooks/useTodayData";
import { 
  Users, 
  Clock, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Plus,
  MoreHorizontal,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistEntry {
  id: string;
  customerName: string;
  partySize: number;
  waitTime: number;
  phoneNumber?: string;
  specialRequests?: string;
  priority: 'normal' | 'high' | 'vip';
  estimatedWait: number;
  status: 'waiting' | 'called' | 'seated' | 'cancelled';
  avatarUrl?: string;
}

const Waitlist: React.FC = () => {
  const { data, isLoading, error } = useTodayData();
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  // Transform waitlist data
      const waitlistEntries = useMemo((): WaitlistEntry[] => {
    if (!data?.waitlistEntries) return [];

    return data.waitlistEntries.map(entry => {
      const customer = entry.profiles;
      const waitTime = Math.round((new Date().getTime() - new Date(entry.created_at).getTime()) / (1000 * 60));
      
      return {
        id: entry.id,
        customerName: customer 
          ? `${customer.first_name} ${customer.last_name}` 
          : entry.customer_name || 'Walk-in Guest',
        partySize: entry.party_size || 2,
        waitTime,
        phoneNumber: customer?.phone || entry.phone,
        specialRequests: entry.special_requests,
        priority: (entry.priority as 'normal' | 'high' | 'vip') || 'normal',
        estimatedWait: entry.estimated_wait_minutes || waitTime + 15,
        status: (entry.status as 'waiting' | 'called' | 'seated' | 'cancelled') || 'waiting',
        avatarUrl: customer?.avatar_url
      };
    }).sort((a, b) => {
      // Sort by priority, then by wait time
      if (a.priority !== b.priority) {
        const priorityOrder = { 'vip': 0, 'high': 1, 'normal': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.waitTime - a.waitTime;
    });
  }, [data?.waitlistEntries]);

  const getPriorityColor = (priority: WaitlistEntry['priority']) => {
    switch (priority) {
      case 'vip':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-700';
      case 'high':
        return 'bg-red-500/10 border-red-500/30 text-red-700';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-700';
    }
  };

  const getWaitTimeColor = (waitTime: number) => {
    if (waitTime < 15) return 'text-green-600';
    if (waitTime < 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleSeatGuest = (entryId: string) => {
    // TODO: Implement seat guest functionality  };
      const handleCallGuest = (entryId: string) => {
    // TODO: Implement call guest functionality  };
      const handleCancelWait = (entryId: string) => {
    // TODO: Implement cancel wait functionality  };
      if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <div>
            <p className="font-medium text-destructive">Failed to load waitlist</p>
            <p className="text-sm text-muted-foreground">Please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-2/50 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-surface-2/50 rounded" />
                    <div className="w-16 h-3 bg-surface-2/30 rounded" />
                  </div>
                  <div className="w-12 h-6 bg-surface-2/50 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (waitlistEntries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <CheckCircle className="w-12 h-12 text-success mb-4" />
        <h3 className="font-semibold text-lg mb-2">No one waiting!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          All guests have been seated or there's no current waitlist.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Walk-in
        </Button>
      </div>
    );
  }

  const averageWaitTime = Math.round(
    waitlistEntries.reduce((sum, entry) => sum + entry.waitTime, 0) / waitlistEntries.length
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex-shrink-0 p-4 border-b border-surface-2/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{waitlistEntries.length}</span>
              <span className="text-sm text-muted-foreground">waiting</span>
            </div>
            <div className="w-px h-4 bg-surface-2/50" />
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                ~{averageWaitTime}m avg
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Waitlist entries */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {waitlistEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 border-b border-surface-2/30 last:border-b-0"
            >
              <Card className={cn(
                "transition-all duration-200 hover:shadow-md cursor-pointer",
                selectedEntry === entry.id && "ring-2 ring-brand/50",
                entry.priority === 'vip' && "bg-purple-50/50 border-purple-200/50",
                entry.priority === 'high' && "bg-red-50/50 border-red-200/50"
              )}>
                <CardContent 
                  className="p-4"
                  onClick={() => setSelectedEntry(entry.id === selectedEntry ? null : entry.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={entry.avatarUrl} alt={entry.customerName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.customerName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {entry.customerName}
                        </p>
                        {entry.priority !== 'normal' && (
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs px-2 py-0.5", getPriorityColor(entry.priority))}
                          >
                            {entry.priority.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Party of {entry.partySize}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={getWaitTimeColor(entry.waitTime)}>
                            {formatWaitTime(entry.waitTime)}
                          </span>
                        </div>
                      </div>

                      {entry.phoneNumber && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Phone className="w-3 h-3" />
                          <span>{entry.phoneNumber}</span>
                        </div>
                      )}

                      {entry.specialRequests && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Note:</span> {entry.specialRequests}
                        </div>
                      )}
                    </div>

                    {/* Wait time badge */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs tabular-nums",
                          getWaitTimeColor(entry.waitTime)
                        )}
                      >
                        {formatWaitTime(entry.waitTime)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ~{entry.estimatedWait}m est
                      </span>
                    </div>
                  </div>

                  {/* Action buttons - shown when selected */}
                  <AnimatePresence>
                    {selectedEntry === entry.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-2/30"
                      >
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeatGuest(entry.id);
                          }}
                          className="flex-1 gap-2"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Seat Now
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallGuest(entry.id);
                          }}
                          className="gap-2"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelWait(entry.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer with quick actions */}
      <div className="flex-shrink-0 p-4 border-t border-surface-2/30 bg-surface/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tap guest to see actions</span>
          <span>•</span>
          <span>Priority guests shown first</span>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;


