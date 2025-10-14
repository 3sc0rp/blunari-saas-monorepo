/**
 * Mock Data Provider for Widget Management Testing
 * Allows testing hook architecture before database implementation
 */
import { useState, useCallback, useEffect } from 'react';

// Interfaces for type safety
interface WidgetConfig {
  id: string;
  tenant_id: string;
  widget_type: 'booking' | 'catering';
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WidgetAnalytics {
  id: string;
  widget_id: string;
  event_type: 'view' | 'interaction' | 'conversion';
  timestamp: string;
  metadata?: any;
}

// Mock widget configuration data
const MOCK_WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'mock-booking-widget-1',
    tenant_id: 'mock-tenant-id',
    widget_type: 'booking',
    config: {
      theme: 'light',
      primaryColor: '#3b82f6',
      borderRadius: '8',
      fontFamily: 'system',
      showAvailability: true,
      requirePhone: true,
      enableNotifications: true,
      maxAdvanceBooking: 30,
      minBookingWindow: 2,
      welcomeMessage: 'Welcome! Book your table with us.',
      customFields: []
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-catering-widget-1',
    tenant_id: 'mock-tenant-id',
    widget_type: 'catering',
    config: {
      theme: 'light',
      primaryColor: '#f97316',
      borderRadius: '8',
      fontFamily: 'system',
      showMenuPreviews: true,
      requireEventDetails: true,
      enableQuickQuote: true,
      minAdvanceNotice: 48,
      maxGuestCount: 500,
      welcomeMessage: 'Discover our catering services for your special event.',
      eventTypes: ['corporate', 'wedding', 'private']
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock analytics data
const MOCK_ANALYTICS: WidgetAnalytics[] = [
  {
    id: 'analytics-1',
    widget_id: 'mock-booking-widget-1',
    event_type: 'view',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: { page: '/booking' }
  },
  {
    id: 'analytics-2',
    widget_id: 'mock-booking-widget-1',
    event_type: 'interaction',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    metadata: { action: 'date_selected' }
  },
  {
    id: 'analytics-3',
    widget_id: 'mock-booking-widget-1',
    event_type: 'conversion',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    metadata: { booking_id: 'booking-123' }
  },
  {
    id: 'analytics-4',
    widget_id: 'mock-catering-widget-1',
    event_type: 'view',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    metadata: { page: '/catering' }
  }
];

interface MockWidgetManagementOptions {
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableAnalytics?: boolean;
  simulateNetworkDelay?: boolean;
  simulateErrors?: boolean;
}

/**
 * Mock version of useWidgetManagement for testing
 * Simulates all real functionality without database dependency
 */
export function useMockWidgetManagement(options: MockWidgetManagementOptions = {}) {
  const {
    autoSave = true,
    autoSaveInterval = 30000,
    enableAnalytics = true,
    simulateNetworkDelay = true,
    simulateErrors = false
  } = options;

  // State management
  const [widgets, setWidgets] = useState<WidgetConfig[]>(MOCK_WIDGET_CONFIGS);
  const [analytics, setAnalytics] = useState<WidgetAnalytics[]>(MOCK_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Simulate connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate occasional connection hiccups
      if (Math.random() < 0.05) { // 5% chance of temporary disconnect
        setConnected(false);
        setTimeout(() => setConnected(true), 2000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Auto-save simulation
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges) return;

    const timeout = setTimeout(() => {      setIsSaving(true);
      
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);      }, 1000);
    }, autoSaveInterval);

    return () => clearTimeout(timeout);
  }, [hasUnsavedChanges, autoSave, autoSaveInterval]);

  // Simulate network delay
  const simulateDelay = () => new Promise(resolve => 
    setTimeout(resolve, simulateNetworkDelay ? 500 + Math.random() * 1000 : 0)
  );

  // Mock functions
  const getWidgetByType = useCallback((type: 'booking' | 'catering') => {
    return widgets.find(w => w.widget_type === type);
  }, [widgets]);

  const saveWidgetConfig = useCallback(async (
    type: 'booking' | 'catering',
    config: any,
    options: { skipAutoSave?: boolean } = {}
  ) => {    if (simulateErrors && Math.random() < 0.1) {
      setError('Mock error: Network timeout');
      return { success: false, error: 'Network timeout' };
    }

    try {
      setIsSaving(true);
      setError(null);
      
      await simulateDelay();
      
      // Update mock data
      setWidgets(prev => prev.map(w => 
        w.widget_type === type 
          ? { ...w, config, updated_at: new Date().toISOString() }
          : w
      ));

      setLastSaved(new Date());
      if (!options.skipAutoSave) {
        setHasUnsavedChanges(false);
      }

      // Simulate analytics event
      if (enableAnalytics) {
        const widget = getWidgetByType(type);
        if (widget) {
          setAnalytics(prev => [...prev, {
            id: `analytics-${Date.now()}`,
            widget_id: widget.id,
            event_type: 'interaction' as const,
            timestamp: new Date().toISOString(),
            metadata: { action: 'config_updated' }
          }]);
        }
      }      return { success: true, data: { id: `mock-${type}-widget-1`, config } };
      
    } catch (error) {
      const errorMessage = 'Mock save failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [simulateErrors, simulateNetworkDelay, enableAnalytics, getWidgetByType]);

  const markConfigChanged = useCallback((type: 'booking' | 'catering', config: any) => {    setHasUnsavedChanges(true);
  }, []);

  const toggleWidgetActive = useCallback(async (type: 'booking' | 'catering') => {    await simulateDelay();
    
    setWidgets(prev => prev.map(w => 
      w.widget_type === type 
        ? { ...w, is_active: !w.is_active, updated_at: new Date().toISOString() }
        : w
    ));

    return { success: true, data: getWidgetByType(type) };
  }, [getWidgetByType]);

  const getAnalyticsSummary = useCallback((widgetId: string) => {
    const widgetAnalytics = analytics.filter(a => a.widget_id === widgetId);
    
    return {
      totalViews: widgetAnalytics.filter(a => a.event_type === 'view').length,
      totalInteractions: widgetAnalytics.filter(a => a.event_type === 'interaction').length,
      totalConversions: widgetAnalytics.filter(a => a.event_type === 'conversion').length,
      conversionRate: widgetAnalytics.length > 0 ? 
        (widgetAnalytics.filter(a => a.event_type === 'conversion').length / 
         Math.max(widgetAnalytics.filter(a => a.event_type === 'view').length, 1) * 100) : 0
    };
  }, [analytics]);

  const refetchWidgets = useCallback(async () => {    setLoading(true);
    await simulateDelay();
    setLoading(false);
  }, []);

  // Simulate periodic analytics updates
  useEffect(() => {
    if (!enableAnalytics) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance of new analytics event
        const randomWidget = widgets[Math.floor(Math.random() * widgets.length)];
        const eventTypes = ['view', 'interaction', 'conversion'] as const;
        const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        const newAnalytic: WidgetAnalytics = {
          id: `analytics-${Date.now()}-${Math.random()}`,
          widget_id: randomWidget.id,
          event_type: randomEventType,
          timestamp: new Date().toISOString(),
          metadata: { simulated: true }
        };
        setAnalytics(prev => [...prev, newAnalytic]);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [enableAnalytics, widgets]);

  return {
    // Widget data
    widgets,
    loading,
    error,
    
    // Connection status
    connected,
    analyticsConnected: connected && enableAnalytics,
    
    // Analytics data
    analytics: enableAnalytics ? analytics : [],
    analyticsLoading: false,
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
    isOnline: connected,
    
    // Mock-specific
    isMockMode: true
  };
}

/**
 * Development utility to compare mock vs real hook performance
 */
export function useWidgetManagementComparison(enableMockMode: boolean = false) {
  // This would import the real hook when available
  // const realHook = useWidgetManagement();
  const mockHook = useMockWidgetManagement();
  
  if (enableMockMode) {
    return mockHook;
  }
  
  // Return real hook when database is ready
  // return realHook;
  return mockHook; // For now, always return mock until database is ready
}

