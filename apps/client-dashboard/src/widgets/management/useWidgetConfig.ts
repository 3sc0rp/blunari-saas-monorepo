import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultConfig } from './defaults';
import { validateConfig } from './validation';
import { ValidationError, WidgetConfig, WidgetType } from './types';

export function useWidgetConfig(initialType: WidgetType, tenantId?: string | null, tenantSlug?: string | null) {
  const { toast } = useToast();
  const [activeWidgetType, setActiveWidgetType] = useState<WidgetType>(initialType);
  const [bookingConfig, setBookingConfig] = useState<WidgetConfig>(() => getDefaultConfig('booking'));
  const [cateringConfig, setCateringConfig] = useState<WidgetConfig>(() => getDefaultConfig('catering'));
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
  const setCurrentConfig = activeWidgetType === 'booking' ? setBookingConfig : setCateringConfig;

  // Enhanced tenant identification - no demo fallbacks
  const tenantIdentifier = useMemo(() => {
    // Each tenant gets their own unique configuration namespace
    if (tenantId && tenantSlug) {
      return `${tenantId}-${tenantSlug}`;
    } else if (tenantId) {
      return tenantId;
    } else if (tenantSlug) {
      return tenantSlug;
    } else {
      throw new Error('Tenant information required - no demo mode available');
    }
  }, [tenantId, tenantSlug]);

  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    const newConfig = { ...currentConfig, ...updates };
    setCurrentConfig(newConfig);
    setHasUnsavedChanges(true);
    setValidationErrors(validateConfig(newConfig));
  }, [currentConfig, setCurrentConfig]);

  const saveConfiguration = useCallback(async () => {
    const errors = validateConfig(currentConfig);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({ title: 'Validation Error', description: `Please fix ${errors.length} error(s) before saving`, variant: 'destructive' });
      return false;
    }

    try {
      // Enhanced storage key with tenant isolation
      const storageKey = `blunari-widget-config-${activeWidgetType}-${tenantIdentifier}`;
      const timestamp = new Date().toISOString();
      const configToSave = { 
        ...currentConfig, 
        lastSaved: timestamp, 
        version: '2.0',
        tenantId,
        tenantSlug,
        widgetType: activeWidgetType,
        configId: `${tenantIdentifier}-${activeWidgetType}-${Date.now()}`
      };
      
      localStorage.setItem(storageKey, JSON.stringify(configToSave));
      
      // Also save tenant-specific backup for cross-reference
      const tenantConfigList = JSON.parse(localStorage.getItem(`blunari-tenant-widgets-${tenantIdentifier}`) || '[]');
      const existingIndex = tenantConfigList.findIndex((config: any) => config.widgetType === activeWidgetType);
      
      if (existingIndex >= 0) {
        tenantConfigList[existingIndex] = configToSave;
      } else {
        tenantConfigList.push(configToSave);
      }
      
      localStorage.setItem(`blunari-tenant-widgets-${tenantIdentifier}`, JSON.stringify(tenantConfigList));
      
      setLastSavedTimestamp(timestamp);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      toast({ 
        title: 'Configuration Saved', 
        description: `${activeWidgetType} widget configuration saved for tenant: ${tenantSlug || tenantId || 'Unknown'}` 
      });
      return true;
    } catch (error) {
      console.error('Save configuration error:', error);
      toast({ title: 'Save Failed', description: 'Failed to save configuration. Please try again.', variant: 'destructive' });
      return false;
    }
  }, [currentConfig, activeWidgetType, tenantIdentifier, tenantId, tenantSlug, toast]);

  useEffect(() => {
    try {
      // Enhanced loading with tenant-specific storage
      const storageKey = `blunari-widget-config-${activeWidgetType}-${tenantIdentifier}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Validate that this config belongs to the current tenant - no demo fallbacks
        if (parsed.tenantId === tenantId || parsed.tenantSlug === tenantSlug) {
          const merged = { ...getDefaultConfig(activeWidgetType), ...parsed };
          
          // Basic validation before applying
          if (merged.width && merged.height && merged.primaryColor) {
            setCurrentConfig(merged);
            setLastSavedTimestamp(parsed.lastSaved || null);
            console.log(`[Widget Config] Loaded ${activeWidgetType} config for tenant: ${tenantIdentifier}`);
          } else {
            console.warn(`[Widget Config] Invalid saved config for ${activeWidgetType}, using defaults`);
            setCurrentConfig(getDefaultConfig(activeWidgetType));
            setLastSavedTimestamp(null);
          }
        } else {
          console.warn(`[Widget Config] Config mismatch for tenant ${tenantIdentifier}, using defaults`);
          setCurrentConfig(getDefaultConfig(activeWidgetType));
          setLastSavedTimestamp(null);
        }
      } else {
        // No saved config, use defaults
        console.log(`[Widget Config] No saved config for ${activeWidgetType} - ${tenantIdentifier}, using defaults`);
        setCurrentConfig(getDefaultConfig(activeWidgetType));
        setLastSavedTimestamp(null);
      }
      
      // Reset change tracking
      setHasUnsavedChanges(false);
    } catch (err) {
      console.warn('Failed to load saved configuration:', err);
      setCurrentConfig(getDefaultConfig(activeWidgetType));
      setLastSavedTimestamp(null);
    }
  }, [activeWidgetType, tenantIdentifier, tenantId, tenantSlug, setCurrentConfig]);

  const resetToDefaults = useCallback(() => {
    setCurrentConfig(getDefaultConfig(activeWidgetType));
    setLastSavedTimestamp(null);
    setHasUnsavedChanges(true);
    setValidationErrors([]);
    toast({ 
      title: 'Reset to Defaults', 
      description: `${activeWidgetType} configuration reset to defaults for tenant: ${tenantSlug || tenantId || 'Unknown'}` 
    });
  }, [activeWidgetType, setCurrentConfig, tenantSlug, tenantId, toast]);

  // Get all saved configurations for current tenant
  const getTenantConfigurations = useCallback(() => {
    try {
      const tenantConfigList = JSON.parse(localStorage.getItem(`blunari-tenant-widgets-${tenantIdentifier}`) || '[]');
      return tenantConfigList;
    } catch (error) {
      console.error('Error loading tenant configurations:', error);
      return [];
    }
  }, [tenantIdentifier]);

  // Export tenant configuration for backup/transfer
  const exportTenantConfiguration = useCallback(() => {
    const allConfigs = getTenantConfigurations();
    const exportData = {
      tenantId,
      tenantSlug,
      tenantIdentifier,
      exportDate: new Date().toISOString(),
      version: '2.0',
      configurations: allConfigs
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blunari-widget-config-${tenantIdentifier}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ 
      title: 'Configuration Exported', 
      description: `Widget configurations exported for tenant: ${tenantSlug || tenantId || 'Unknown'}` 
    });
  }, [getTenantConfigurations, tenantId, tenantSlug, tenantIdentifier, toast]);

  const safeParseInt = useCallback((value: string, fallback: number, min?: number, max?: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  }, []);

  return {
    activeWidgetType,
    setActiveWidgetType,
    bookingConfig,
    setBookingConfig,
    cateringConfig,
    setCateringConfig,
    currentConfig,
    setCurrentConfig,
    hasUnsavedChanges,
    validationErrors,
    lastSavedTimestamp,
    updateConfig,
    saveConfiguration,
    resetToDefaults,
    safeParseInt,
    tenantIdentifier,
    getTenantConfigurations,
    exportTenantConfiguration,
  } as const;
}
