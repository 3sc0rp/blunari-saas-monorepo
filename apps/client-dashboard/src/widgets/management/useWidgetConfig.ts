import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { safeStorage } from '@/utils/safeStorage';
import { useToast } from '@/hooks/use-toast';
import { getDefaultConfig } from './defaults';
import { validateConfig } from './validation';
import { ValidationError, WidgetConfig, WidgetType } from './types';
import shallowEqual from '@/utils/shallowEqual';

export function useWidgetConfig(initialType: WidgetType, tenantId?: string | null, tenantSlug?: string | null, isLoading?: boolean) {
  const { toast } = useToast();
  const [activeWidgetType, setActiveWidgetType] = useState<WidgetType>(initialType);
  const [bookingConfig, setBookingConfig] = useState<WidgetConfig>(() => getDefaultConfig('booking'));
  const [cateringConfig, setCateringConfig] = useState<WidgetConfig>(() => getDefaultConfig('catering'));
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedConfigSnapshot, setLastSavedConfigSnapshot] = useState<WidgetConfig | null>(null);
  const [changedKeysCount, setChangedKeysCount] = useState(0);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastLoadSigRef = useRef<string | null>(null);
  const AUTOSAVE_DELAY = 1800; // ms
  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
  const setCurrentConfig = activeWidgetType === 'booking' ? setBookingConfig : setCateringConfig;

  // Stable tenant identifier:
  // 1. Prefer persistent tenantId (UUID) so slug changes won't orphan configs.
  // 2. Fall back to slug if id not yet available.
  // 3. Never return 'loading' as a namespace (use separate loading flag) to avoid writing under a transient key.
  // 4. Provide migration support for legacy "id-slug" composite keys so previously saved configs are recovered.
  const tenantIdentifier = useMemo(() => {
    if (tenantId) return tenantId; // stable primary key
    if (tenantSlug) return tenantSlug; // fallback while id resolves
    return 'default-tenant';
  }, [tenantId, tenantSlug]);

  // Track whether we've attempted legacy key migration to avoid repeated work
  const [migratedLegacyKeys, setMigratedLegacyKeys] = useState(false);

  

  const debug = (...args: any[]) => {
    if (import.meta.env.VITE_ANALYTICS_DEBUG === '1') {
      // Prefix to identify hook logs
      // eslint-disable-next-line no-console
      console.log('[WidgetConfig]', ...args);
    }
  };

  const saveConfiguration = useCallback(async (options?: { silent?: boolean; allowAutosave?: boolean }) => {
    const silent = options?.silent;
    const allowAutosave = options?.allowAutosave;
    if (saving) return true; // prevent concurrent saves
    const errors = validateConfig(currentConfig);
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (!silent) {
        toast({ title: 'Validation Error', description: `Please fix ${errors.length} error(s) before saving`, variant: 'destructive' });
      }
      return false;
    }

    // Skip saving if still loading (id or slug absent) except allow saving for fallback default tenant in dev
    if ((isLoading || (!tenantId && !tenantSlug)) && tenantIdentifier === 'default-tenant') {
      if (!silent) {
        toast({ 
          title: 'Cannot Save', 
          description: 'Please wait for tenant information to load before saving', 
          variant: 'destructive' 
        });
      }
      return false;
    }

    try {
      setSaving(true);
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
      
  safeStorage.set(storageKey, JSON.stringify(configToSave));
      
      // Also save tenant-specific backup for cross-reference
  const tenantConfigList = JSON.parse(safeStorage.get(`blunari-tenant-widgets-${tenantIdentifier}`) || '[]');
      const existingIndex = tenantConfigList.findIndex((config: any) => config.widgetType === activeWidgetType);
      
      if (existingIndex >= 0) {
        tenantConfigList[existingIndex] = configToSave;
      } else {
        tenantConfigList.push(configToSave);
      }
      
  safeStorage.set(`blunari-tenant-widgets-${tenantIdentifier}`, JSON.stringify(tenantConfigList));
      
      setLastSavedTimestamp(timestamp);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      setLastSavedConfigSnapshot(currentConfig);
      setChangedKeysCount(0);
      if (!silent) {
        // Build diff summary
        const diffKeys = Object.keys(currentConfig).filter(k => (currentConfig as any)[k] !== (lastSavedConfigSnapshot as any)?.[k]);
        toast({ 
          title: 'Configuration Saved', 
          description: `${activeWidgetType} saved (${diffKeys.length} field${diffKeys.length===1?'':'s'} changed) for ${tenantSlug || tenantId || 'Unknown'}` 
        });
      } else if (allowAutosave) {
        // Optional subtle toast *could* be added; keeping silent for now
      }
      return true;
    } catch (error) {
      console.error('Save configuration error:', error);
      if (!silent) {
        toast({ title: 'Save Failed', description: 'Failed to save configuration. Please try again.', variant: 'destructive' });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentConfig, activeWidgetType, tenantIdentifier, tenantId, tenantSlug, isLoading, toast, saving, lastSavedConfigSnapshot]);

  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    const tentative = { ...currentConfig, ...updates };
    if (shallowEqual(tentative, currentConfig)) {
      debug('updateConfig skipped (no changes)');
      return;
    }
    setCurrentConfig(tentative);
    setHasUnsavedChanges(true);
    setValidationErrors(validateConfig(tentative));

    // Track changed keys relative to last saved snapshot
    if (lastSavedConfigSnapshot) {
      const changed = Object.keys(tentative).filter(k => (tentative as any)[k] !== (lastSavedConfigSnapshot as any)[k]);
      setChangedKeysCount(changed.length);
    } else {
      setChangedKeysCount(Object.keys(tentative).length); // everything considered changed until initial snapshot
    }

    try {
      // Write to a draft key immediately (does not require tenant stable id yet)
      const draftKey = `blunari-widget-config-draft-${activeWidgetType}-${tenantIdentifier}`;
      const draftPayload = {
        ...tentative,
        draft: true,
        draftUpdated: Date.now(),
        tenantId,
        tenantSlug,
        widgetType: activeWidgetType,
      };
      safeStorage.set(draftKey, JSON.stringify(draftPayload));
    } catch (e) {
      // Non-fatal
      console.warn('Failed to persist draft config', e);
    }
    // Debounced autosave attempt (only if tenantId resolved to stable)
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    if (tenantId) {
      const cfgSnapshot = { ...tentative };
      autosaveTimerRef.current = window.setTimeout(() => {
        // Only autosave if no further changes occurred
        if (shallowEqual(cfgSnapshot, (activeWidgetType === 'booking' ? bookingConfig : cateringConfig))) {
          saveConfiguration({ silent: true, allowAutosave: true });
        }
      }, AUTOSAVE_DELAY);
    }
  }, [currentConfig, setCurrentConfig, lastSavedConfigSnapshot, activeWidgetType, tenantIdentifier, tenantId, tenantSlug, shallowEqual, saveConfiguration, bookingConfig, cateringConfig]);

  // Clear pending autosave on unmount to avoid late writes
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const loadConfigRef = useRef(false);
  
  useEffect(() => {
    // Prevent duplicate loads during initialization
    if (loadConfigRef.current) return;
    loadConfigRef.current = true;
    
    const signature = `${activeWidgetType}::${tenantIdentifier}`;
    if (lastLoadSigRef.current === signature) {
      debug('loadEffect skipped (unchanged signature)', signature);
      return;
    }
    lastLoadSigRef.current = signature;
    
    debug('loadEffect start', { activeWidgetType, tenantIdentifier });
    
    try {
      const storageKey = `blunari-widget-config-${activeWidgetType}-${tenantIdentifier}`;
      const saved = safeStorage.get(storageKey);
      const defaults = getDefaultConfig(activeWidgetType);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = { ...defaults, ...parsed };
          
          if (merged.width && merged.height && merged.primaryColor) {
            setCurrentConfig(merged);
            setLastSavedTimestamp(parsed.lastSaved || null);
            setLastSavedConfigSnapshot(merged);
            setHasUnsavedChanges(false);
            debug('Loaded saved config');
          } else {
            setCurrentConfig(defaults);
            setLastSavedTimestamp(null);
            setHasUnsavedChanges(false);
            debug('Invalid saved config, using defaults');
          }
        } catch (parseErr) {
          console.warn('Failed to parse saved config:', parseErr);
          setCurrentConfig(defaults);
          setLastSavedTimestamp(null);
          setHasUnsavedChanges(false);
        }
      } else {
        setCurrentConfig(defaults);
        setLastSavedTimestamp(null);
        setHasUnsavedChanges(false);
        debug('No saved config, using defaults');
      }
    } catch (err) {
      console.error('Config load error:', err);
      setCurrentConfig(getDefaultConfig(activeWidgetType));
      setLastSavedTimestamp(null);
      setHasUnsavedChanges(false);
    }
    
    debug('loadEffect end');
  }, [activeWidgetType, tenantIdentifier]);
  
  // Reset load flag when signature changes
  useEffect(() => {
    loadConfigRef.current = false;
  }, [activeWidgetType, tenantIdentifier]);

  const resetToDefaults = useCallback(() => {
    setCurrentConfig(getDefaultConfig(activeWidgetType));
    setLastSavedTimestamp(null);
    setHasUnsavedChanges(true);
    setValidationErrors([]);
    setChangedKeysCount(Object.keys(getDefaultConfig(activeWidgetType)).length);
    toast({ 
      title: 'Reset to Defaults', 
      description: `${activeWidgetType} configuration reset to defaults for tenant: ${tenantSlug || tenantId || 'Unknown'}` 
    });
  }, [activeWidgetType, setCurrentConfig, tenantSlug, tenantId, toast]);

  // Get all saved configurations for current tenant
  const getTenantConfigurations = useCallback(() => {
    try {
  const tenantConfigList = JSON.parse(safeStorage.get(`blunari-tenant-widgets-${tenantIdentifier}`) || '[]');
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
    saving,
    changedKeysCount,
    isDraft: hasUnsavedChanges && !!lastSavedConfigSnapshot,
  } as const;
}

