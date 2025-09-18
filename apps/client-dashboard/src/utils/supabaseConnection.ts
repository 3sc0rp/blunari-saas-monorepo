// Utility to handle Supabase WebSocket connection issues
import { supabase } from '@/integrations/supabase/client';

export class SupabaseConnectionManager {
  private static instance: SupabaseConnectionManager;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  
  // Event handler references for cleanup
  private visibilityChangeHandler = () => {
    if (document.visibilityState === 'visible') {
      this.handlePageVisible();
    }
  };
  
  private onlineHandler = () => {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('🌐 Network online, attempting to reconnect Supabase');
    }
    this.handleNetworkReconnect();
  };
  
  private offlineHandler = () => {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('📴 Network offline');
    }
  };

  private constructor() {
    this.setupConnectionHandlers();
  }

  public static getInstance(): SupabaseConnectionManager {
    if (!SupabaseConnectionManager.instance) {
      SupabaseConnectionManager.instance = new SupabaseConnectionManager();
    }
    return SupabaseConnectionManager.instance;
  }

  private setupConnectionHandlers(): void {
    // Handle auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
          console.log('✅ Supabase auth established, resetting connection attempts');
        }
        this.reconnectAttempts = 0;
      }
      
      if (event === 'SIGNED_OUT') {
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
          console.log('🔓 Supabase auth signed out');
        }
        this.disconnectRealtime();
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Listen for online/offline events
    window.addEventListener('online', this.onlineHandler);

    window.addEventListener('offline', this.offlineHandler);
  }

  private handlePageVisible(): void {
    // When page becomes visible, check connection
    setTimeout(() => {
      this.ensureConnection();
    }, 1000);
  }

  private async handleNetworkReconnect(): Promise<void> {
    // Wait a bit for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.ensureConnection();
  }

  public async ensureConnection(): Promise<void> {
    try {
      // Test the connection with a simple query
      const { error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
          console.warn('⚠️ Supabase connection test failed:', error.message);
        }
        await this.attemptReconnect();
      } else {
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
          console.log('✅ Supabase connection healthy');
        }
        this.reconnectAttempts = 0;
      }
    } catch (error) {
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.error('❌ Supabase connection error:', error);
      }
      await this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log(`🔄 Attempting Supabase reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Force refresh the auth session
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
          console.warn('⚠️ Auth refresh failed:', error.message);
        }
      }
    } catch (error) {
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.error('❌ Auth refresh error:', error);
      }
    }
  }

  private disconnectRealtime(): void {
    try {
      // Remove all subscriptions
      supabase.removeAllChannels();
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.log('🔌 Disconnected Supabase realtime');
      }
    } catch (error) {
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.error('❌ Error disconnecting realtime:', error);
      }
    }
  }

  public createRealtimeChannel(channelName: string) {
    try {
      return supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
            console.log('📡 Realtime update:', payload);
          }
        })
        .subscribe((status) => {
          if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
            console.log(`📡 Channel ${channelName} status:`, status);
          }
          
          if (status === 'CHANNEL_ERROR') {
            if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
              console.error(`❌ Realtime channel ${channelName} error`);
            }
            // Try to reconnect after a delay
            setTimeout(() => this.ensureConnection(), 5000);
          }
        });
    } catch (error) {
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.error('❌ Error creating realtime channel:', error);
      }
      return null;
    }
  }

  /**
   * Clean up event listeners and connections
   */
  public destroy(): void {
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    
    // Disconnect realtime
    this.disconnectRealtime();
    
    // Reset singleton instance
    SupabaseConnectionManager.instance = null as any;
    
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('🧹 Supabase connection manager destroyed');
    }
  }
}

// Export singleton instance
export const connectionManager = SupabaseConnectionManager.getInstance();
