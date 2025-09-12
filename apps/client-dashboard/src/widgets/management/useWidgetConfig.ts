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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;
  const setCurrentConfig = activeWidgetType === 'booking' ? setBookingConfig : setCateringConfig;

  const tenantIdentifier = tenantId || tenantSlug || 'demo';

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
      const storageKey = `widget-config-${activeWidgetType}-${tenantIdentifier}`;
      const configToSave = { ...currentConfig, lastSaved: new Date().toISOString(), version: '2.0' };
      localStorage.setItem(storageKey, JSON.stringify(configToSave));
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      toast({ title: 'Configuration Saved', description: `${activeWidgetType} widget configuration saved.` });
      return true;
    } catch (error) {
      console.error('Save configuration error:', error);
      toast({ title: 'Save Failed', description: 'Failed to save configuration. Please try again.', variant: 'destructive' });
      return false;
    }
  }, [currentConfig, activeWidgetType, tenantIdentifier, toast]);

  useEffect(() => {
    try {
      const storageKey = `widget-config-${activeWidgetType}-${tenantIdentifier}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...getDefaultConfig(activeWidgetType), ...parsed };
        if (merged.width && merged.height && merged.primaryColor) {
          setCurrentConfig(merged);
        }
      }
    } catch (err) {
      console.warn('Failed to load saved configuration:', err);
    }
  }, [activeWidgetType, tenantIdentifier, setCurrentConfig]);

  const resetToDefaults = useCallback(() => {
    setCurrentConfig(getDefaultConfig(activeWidgetType));
    setHasUnsavedChanges(true);
    setValidationErrors([]);
    toast({ title: 'Reset to Defaults', description: 'Configuration has been reset to default values.' });
  }, [activeWidgetType, setCurrentConfig, toast]);

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
    updateConfig,
    saveConfiguration,
    resetToDefaults,
    safeParseInt,
  } as const;
}
