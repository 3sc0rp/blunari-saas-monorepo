import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface RealtimeMetrics {
  active_sessions: number
  events_per_minute: number
  conversion_rate: number
  average_session_duration: number
  top_events: Array<{
    event_type: string
    count: number
    last_occurred: string
  }>
  performance_summary: {
    avg_load_time: number
    avg_render_time: number
    error_rate: number
  }
}

interface LiveSession {
  session_id: string
  page_url: string
  user_agent: string
  last_activity: string
  last_event_type: string
}

interface WidgetEvent {
  widget_id: string
  event_type: 'view' | 'interaction' | 'conversion' | 'error' | 'performance'
  event_data: Record<string, any>
  user_session: string
  page_url?: string
  user_agent?: string
  performance_metrics?: {
    load_time: number
    render_time: number
    interaction_time: number
  }
}

export const useRealtimeAnalytics = (widgetId?: string) => {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null)
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const initializeSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      )
    }
    return supabaseRef.current
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const supabase = initializeSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      const tenantId = session.user?.user_metadata?.tenant_id
      if (!tenantId) {
        setError('Tenant ID not found')
        return
      }

      const params = new URLSearchParams({
        action: 'get_realtime_metrics',
        tenant_id: tenantId,
        ...(widgetId && { widget_id: widgetId })
      })

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-realtime?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: RealtimeMetrics = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch realtime metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    }
  }, [widgetId, initializeSupabase])

  const fetchLiveSessions = useCallback(async () => {
    try {
      const supabase = initializeSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const tenantId = session.user?.user_metadata?.tenant_id
      if (!tenantId) return

      const params = new URLSearchParams({
        action: 'get_live_sessions',
        tenant_id: tenantId,
        ...(widgetId && { widget_id: widgetId })
      })

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-realtime?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data: LiveSession[] = await response.json()
        setLiveSessions(data)
      }
    } catch (err) {
      console.error('Failed to fetch live sessions:', err)
    }
  }, [widgetId, initializeSupabase])

  const trackEvent = useCallback(async (eventData: Omit<WidgetEvent, 'widget_id'>) => {
    try {
      const supabase = initializeSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token || !widgetId) return

      const tenantId = session.user?.user_metadata?.tenant_id
      if (!tenantId) return

      const fullEventData: WidgetEvent = {
        ...eventData,
        widget_id: widgetId
      }

      const params = new URLSearchParams({
        action: 'track_event',
        tenant_id: tenantId
      })

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-realtime?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fullEventData)
        }
      )
    } catch (err) {
      console.error('Failed to track event:', err)
    }
  }, [widgetId, initializeSupabase])

  const subscribeToRealtimeUpdates = useCallback(() => {
    if (!widgetId) return

    const supabase = initializeSupabase()
    
    // Subscribe to real-time updates for this widget
      const channel = supabase
      .channel(`widget_${widgetId}`)
      .on('broadcast', { event: 'widget_event' }, (payload: any) => {
        // Refresh metrics when new events come in
        fetchMetrics()
        fetchLiveSessions()
      })
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [widgetId, fetchMetrics, fetchLiveSessions, initializeSupabase])

  // Initialize real-time connection and polling
  useEffect(() => {
    // Fetch initial data
    fetchMetrics()
    fetchLiveSessions()

    // Set up real-time subscription
      const unsubscribe = subscribeToRealtimeUpdates()

    // Set up polling as fallback
    intervalRef.current = setInterval(() => {
      fetchMetrics()
      fetchLiveSessions()
    }, 30000) // Poll every 30 seconds
      return () => {
      if (unsubscribe) unsubscribe()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchMetrics, fetchLiveSessions, subscribeToRealtimeUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    metrics,
    liveSessions,
    isConnected,
    error,
    trackEvent,
    refresh: () => {
      fetchMetrics()
      fetchLiveSessions()
    }
  }
}
