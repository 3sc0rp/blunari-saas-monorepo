import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface TenantNotification {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  created_at: string;
}

function getReadStorageKey(tenantId?: string | null) {
  return `notif_read_${tenantId || 'unknown'}`;
}

// Sound notification utilities
      const playNotificationSound = (type: 'new_reservation' | 'general' = 'general') => {
  try {
    // Create audio context for browser notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different tones for different notification types
      const frequencies = {
      new_reservation: [800, 600, 400], // Descending tone for new reservations
      general: [400, 600] // Simple two-tone for general notifications
    };
    
    const freq = frequencies[type] || frequencies.general;
    
    freq.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.3);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + index * 0.3 + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + index * 0.3 + 0.25);
      
      oscillator.start(audioContext.currentTime + index * 0.3);
      oscillator.stop(audioContext.currentTime + index * 0.3 + 0.25);
    });
  } catch (error) {
    // Fallback to system notification sound or silent fail  }
};

export function useTenantNotifications() {
  const { tenantId } = useTenant();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(30);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(getReadStorageKey(tenantId));
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastNotificationCount = useRef<number>(0);
  // Note: Server-side notification read tracking not yet implemented
  // Using localStorage-only mode for now

  // Rehydrate read IDs whenever tenant changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getReadStorageKey(tenantId));
      setReadIds(new Set<string>(raw ? JSON.parse(raw) : []));
    } catch {
      setReadIds(new Set());
    }
  }, [tenantId]);

  const persistReadIds = (next: Set<string>) => {
    try {
      localStorage.setItem(getReadStorageKey(tenantId), JSON.stringify(Array.from(next)));
    } catch {/* silent */}
  };

  const refresh = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('id, tenant_id, notification_type, title, message, data, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(pageSize);
      if (error) throw error;
      const mapped: TenantNotification[] = (data || []).map((n: any) => ({
        id: n.id,
        tenant_id: n.tenant_id,
        type: n.notification_type,
        title: n.title,
        message: n.message,
        data: n.data,
        created_at: n.created_at,
      }));
      setNotifications(mapped);
    } catch (err) {
      // Non-fatal; leave list as-is
      console.error('Notifications refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Realtime subscription for this tenant
      if (!tenantId) return;
    try {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      const ch = supabase
        .channel(`tenant-notifications-${tenantId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notification_queue', filter: `tenant_id=eq.${tenantId}` },
          (payload) => {
            const n = payload.new as any;
            const mapped: TenantNotification = {
              id: n.id,
              tenant_id: n.tenant_id,
              type: n.notification_type,
              title: n.title,
              message: n.message,
              data: n.data,
              created_at: n.created_at,
            };
            
            // Play notification sound for new notifications
      const isNewReservation = mapped.type === 'new_reservation' || 
                                  mapped.title?.toLowerCase().includes('reservation') ||
                                  mapped.message?.toLowerCase().includes('reservation');
            
            if (isNewReservation) {
              playNotificationSound('new_reservation');
            } else {
              playNotificationSound('general');
            }
            
            setNotifications((prev) => [mapped, ...prev].slice(0, Math.max(pageSize, 50)));
            
            // Show browser notification
      if (Notification.permission === 'granted') {
              new Notification(mapped.title || 'New Notification', {
                body: mapped.message,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: mapped.id // Prevent duplicate notifications
              });
            }
          }
        )
        .subscribe();
      channelRef.current = ch;
      return () => {
        if (ch) supabase.removeChannel(ch);
      };
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const unreadCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notifications.filter((n) => !readIds.has(n.id) && new Date(n.created_at).getTime() >= weekAgo).length;
  }, [notifications, readIds]);

  const isRead = (id: string) => readIds.has(id);

  const markRead = async (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    persistReadIds(next);
    // Note: Server sync not yet implemented - using localStorage only
  };

  const markAllRead = async () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    persistReadIds(next);
    // Note: Server sync not yet implemented - using localStorage only
  };

  const markManyRead = async (ids: string[]) => {
    const next = new Set(readIds);
    ids.forEach(id => next.add(id));
    setReadIds(next);
    persistReadIds(next);
    // Note: Server sync not yet implemented - using localStorage only
  };

  const markUnread = async (id: string) => {
    if (!readIds.has(id)) return; // already unread from perspective
      const next = new Set(readIds);
    next.delete(id);
    setReadIds(next);
    persistReadIds(next);
    // Note: Server sync not yet implemented - using localStorage only
  };

  const loadMore = () => {
    setPageSize(ps => Math.min(ps + 30, 300));
  };

  const counts = useMemo(() => {
    const reservations = notifications.filter(n => (n.type || '').includes('reservation')).length;
    const system = notifications.length - reservations;
    const unread = notifications.filter(n => !readIds.has(n.id)).length;
    return { all: notifications.length, reservations, system, unread };
  }, [notifications, readIds]);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    markManyRead,
  markUnread,
    isRead,
    counts,
    loadMore,
    playNotificationSound, // Expose for manual testing
  };
}






