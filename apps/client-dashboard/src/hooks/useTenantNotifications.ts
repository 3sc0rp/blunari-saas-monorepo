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
    // Fallback to system notification sound or silent fail
    console.log('Notification sound unavailable:', error);
  }
};

export function useTenantNotifications() {
  const { tenantId } = useTenant();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastNotificationCount = useRef<number>(0);

  const readSet = useMemo(() => {
    try {
      const raw = localStorage.getItem(getReadStorageKey(tenantId));
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  }, [tenantId]);

  const persistReadSet = (next: Set<string>) => {
    try {
      localStorage.setItem(getReadStorageKey(tenantId), JSON.stringify(Array.from(next)));
    } catch {}
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
        .limit(30);
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
            
            setNotifications((prev) => [mapped, ...prev].slice(0, 50));
            
            // Show browser notification if permission granted
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
    // Consider unread those not in read set and within last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notifications.filter((n) => !readSet.has(n.id) && new Date(n.created_at).getTime() >= weekAgo).length;
  }, [notifications, readSet]);

  const markRead = (id: string) => {
    const next = new Set(readSet);
    next.add(id);
    persistReadSet(next);
  };

  const markAllRead = () => {
    const next = new Set(readSet);
    notifications.forEach((n) => next.add(n.id));
    persistReadSet(next);
  };

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
    playNotificationSound, // Expose for manual testing
  };
}


