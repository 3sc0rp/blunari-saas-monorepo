/**
 * Widget Management Real-time Hook
 * Solves WebSocket connection issues for widget management page
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useTenant } from '@/hooks/useTenant';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

interface WidgetConfig {
  id?: string;
  tenant_id: string;
  widget_type: 'booking' | 'catering';
  config: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WidgetAnalytics {
  id?: string;
  widget_id: string;
  event_type: 'view' | 'interaction' | 'conversion';
  timestamp: string;
  metadata?: any;
}

interface UseWidgetManagementOptions {
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableAnalytics?: boolean;
}

export function useWidgetManagement(options: UseWidgetManagementOptions = {}) {
  const {
    autoSave = true,
    autoSaveInterval = 30000, // 30 seconds
    enableAnalytics = true
  } = options;

  const { tenant } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousConfigRef = useRef<any>(null);

  // Real-time widget configurations
  const {
    data: widgets,
    loading: widgetsLoading,
    error: widgetsError,
    connected: widgetsConnected,
    refetch: refetchWidgets
  } = useRealtimeSubscription<WidgetConfig>({
    table: 'widget_configurations',
    filter: tenant?.id ? `tenant_id=eq.${tenant.id}` : undefined,
    enabled: !!tenant?.id,
    onUpdate: (payload) => {
      logger.info('Widget configuration updated', {
        component: 'useWidgetManagement',
        widgetId: payload.new.id,
        type: payload.new.widget_type
      });
      
      // Reset unsaved changes if this was our update
      if (payload.new.updated_at && lastSaved) {
        const updateTime = new Date(payload.new.updated_at);
        if (updateTime >= lastSaved) {
          setHasUnsavedChanges(false);
        }
      }
    },
    onInsert: (payload) => {
      logger.info('New widget configuration created', {
        component: 'useWidgetManagement',
        widgetId: payload.new.id,
        type: payload.new.widget_type
      });
    }
  });

  // Real-time analytics (if enabled)
  const {
    data: analytics,
    loading: analyticsLoading,
    connected: analyticsConnected
  } = useRealtimeSubscription<WidgetAnalytics>({
    table: 'widget_analytics',
    filter: widgets?.length > 0 ? 
      `widget_id=in.(${widgets.map(w => w.id).join(',')})` : 
      undefined,
    enabled: enableAnalytics && widgets && widgets.length > 0,
    onInsert: (payload) => {
      logger.debug('New widget analytics event', {
        component: 'useWidgetManagement',
        event: payload.new.event_type,
        widgetId: payload.new.widget_id
      });
    }
  });

  // Get widget by type
  const getWidgetByType = useCallback((type: 'booking' | 'catering') => {
    return widgets?.find(w => w.widget_type === type);
  }, [widgets]);

  // Save widget configuration
  const saveWidgetConfig = useCallback(async (
    type: 'booking' | 'catering',
    config: any,
    options: { skipAutoSave?: boolean } = {}
  ) => {
    if (!tenant?.id) {
      setError('No tenant selected');
      return { success: false, error: 'No tenant selected' };
    }

    try {
      setIsSaving(true);
      setError(null);

      const existingWidget = getWidgetByType(type);
      
      let result;
      if (existingWidget) {
        // Update existing widget
        result = await supabase
          .from('widget_configurations')
          .update({
            config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWidget.id)
          .select()
          .single();
      } else {
        // Create new widget
        result = await supabase
          .from('widget_configurations')
          .insert({
            tenant_id: tenant.id,
            widget_type: type,
            config,
            is_active: true
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setLastSaved(new Date());
      if (!options.skipAutoSave) {
        setHasUnsavedChanges(false);
      }

      logger.info('Widget configuration saved', {
        component: 'useWidgetManagement',
        widgetId: result.data.id,
        type
      });

      return { success: true, data: result.data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save widget configuration';
      setError(errorMessage);
      
      logger.error('Failed to save widget configuration', error instanceof Error ? error : new Error(errorMessage), {
        component: 'useWidgetManagement',
        type
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, getWidgetByType]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (hasUnsavedChanges && previousConfigRef.current) {
        const { type, config } = previousConfigRef.current;
        await saveWidgetConfig(type, config, { skipAutoSave: true });
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSave, autoSaveInterval, saveWidgetConfig]);

  // Mark configuration as changed
  const markConfigChanged = useCallback((type: 'booking' | 'catering', config: any) => {
    previousConfigRef.current = { type, config };
    setHasUnsavedChanges(true);
  }, []);

  // Toggle widget active state
  const toggleWidgetActive = useCallback(async (type: 'booking' | 'catering') => {
    const widget = getWidgetByType(type);
    if (!widget) return { success: false, error: 'Widget not found' };

    try {
      const result = await supabase
        .from('widget_configurations')
        .update({ is_active: !widget.is_active })
        .eq('id', widget.id)
        .select()
        .single();

      if (result.error) throw result.error;

      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle widget';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [getWidgetByType]);

  // Get widget analytics summary
  const getAnalyticsSummary = useCallback((widgetId: string) => {
    if (!analytics) return null;

    const widgetAnalytics = analytics.filter(a => a.widget_id === widgetId);
    
    return {
      totalViews: widgetAnalytics.filter(a => a.event_type === 'view').length,
      totalInteractions: widgetAnalytics.filter(a => a.event_type === 'interaction').length,
      totalConversions: widgetAnalytics.filter(a => a.event_type === 'conversion').length,
      conversionRate: widgetAnalytics.length > 0 ? 
        (widgetAnalytics.filter(a => a.event_type === 'conversion').length / 
         widgetAnalytics.filter(a => a.event_type === 'view').length * 100) : 0
    };
  }, [analytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Widget data
    widgets: widgets || [],
    loading: widgetsLoading,
    error: error || widgetsError,
    
    // Connection status
    connected: widgetsConnected,
    analyticsConnected,
    
    // Analytics data
    analytics: analytics || [],
    analyticsLoading,
    getAnalyticsSummary,
    
    // State
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    
    // Actions
    getWidgetByType,
    saveWidgetConfig,
    markConfigChanged,
    toggleWidgetActive,
    refetchWidgets,
    
    // Utilities
    isOnline: widgetsConnected && (!enableAnalytics || analyticsConnected)
  };
}
