/**
 * @fileoverview Modular Widget Management System
 * @description World-class modular architecture replacing the monolithic WidgetManagement component
 * @version 1.0.0
 * @author Blunari Development Team
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { AlertTriangle, Save, RotateCcw, Settings, Eye, BarChart3, Activity, Archive, Rocket } from 'lucide-react';
import { useEntitlement } from '@/lib/entitlements';

import {
  OptimizedWidgetConfigurationModule,
  OptimizedWidgetPreviewModule,
  OptimizedWidgetAnalyticsModule,
  OptimizedWidgetRealtimeModule,
  OptimizedWidgetVersionModule,
  OptimizedWidgetDeploymentModule,
  type WidgetModuleProps,
  type ModuleState
} from './modules/WidgetModules';

import { useWidgetConfig } from '../../widgets/management/useWidgetConfig';
import { useWidgetAnalytics } from '../../widgets/management/useWidgetAnalytics';
import { usePerformanceMonitor } from '../../utils/performance';
import { logger } from '../../utils/logger';
import { schemaValidator } from '../../utils/validation';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * Props for the Modular Widget Management System
 */
export interface ModularWidgetManagementProps {
  widgetId: string;
  widgetType: 'booking' | 'catering';
  tenant?: any;
  initialTab?: string;
  onConfigSaved?: (config: any) => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * Tab configuration with icons and metadata
 */
const TAB_CONFIG = [
  {
    id: 'configure',
    label: 'Configure',
    icon: Settings,
    description: 'Widget settings and appearance'
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: Eye,
    description: 'Test across devices'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Performance insights'
  },
  {
    id: 'realtime',
    label: 'Real-time',
    icon: Activity,
    description: 'Live monitoring'
  },
  {
    id: 'versions',
    label: 'Versions',
    icon: Archive,
    description: 'Version control & A/B testing'
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: Rocket,
    description: 'Embed codes & deployment'
  }
] as const;

/**
 * Modular Widget Management System
 * World-class architecture replacing the monolithic component
 */
const ModularWidgetManagement = memo<ModularWidgetManagementProps>(({
  widgetId,
  widgetType,
  tenant,
  initialTab = 'configure',
  onConfigSaved,
  onError,
  className = ''
}) => {
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor('ModularWidgetManagement');
  // 3D entitlement removed

  // State management
  const [moduleState, setModuleState] = useState<ModuleState>({
    activeTab: initialTab,
    previewDevice: 'desktop',
    validationErrors: [],
    isDirty: false
  });

  // Hooks for widget functionality
  const {
    activeWidgetType,
    setActiveWidgetType,
    bookingConfig,
    cateringConfig,
    hasUnsavedChanges,
    validationErrors,
    updateConfig,
    saveConfiguration,
    resetToDefaults
  } = useWidgetConfig(widgetType as any, tenant?.id, tenant?.slug);

  const analyticsData = useWidgetAnalytics({
    tenantId: tenant?.id,
    tenantSlug: tenant?.slug,
    widgetType: widgetType as any
  });

  // Get current config based on widget type
  const currentConfig = widgetType === 'booking' ? bookingConfig : cateringConfig;

  // Component lifecycle
  useEffect(() => {
    logger.info('Modular Widget Management mounted', { 
      widgetId, 
      widgetType, 
      initialTab,
      renderCount: performanceMetrics.renderCount 
    });

    return () => {
      logger.info('Modular Widget Management unmounted', { widgetId, widgetType });
    };
  }, [widgetId, widgetType, initialTab, performanceMetrics.renderCount]);

  // Update module state when validation errors change
  useEffect(() => {
    setModuleState(prev => ({
      ...prev,
      validationErrors,
      isDirty: hasUnsavedChanges
    }));
  }, [validationErrors, hasUnsavedChanges]);

  // Event handlers
  const handleTabChange = useCallback((tab: string) => {
    logger.debug('Widget management tab changed', { from: moduleState.activeTab, to: tab });
    setModuleState(prev => ({ ...prev, activeTab: tab }));
  }, [moduleState.activeTab]);

  const handleConfigChange = useCallback((newConfig: any) => {
    try {
      updateConfig(newConfig);
      logger.debug('Widget config updated', { widgetId, changes: Object.keys(newConfig) });
    } catch (err) {
      logger.error('Error updating widget config', err as Error, { 
        operation: 'updateConfig', 
        component: 'ModularWidgetManagement',
        widgetId 
      });
      onError?.(err as Error);
    }
  }, [updateConfig, widgetId, onError]);

  const handleSaveConfig = useCallback(async () => {
    try {
      logger.info('Saving widget configuration', { widgetId });
      
      const success = await saveConfiguration();
      if (success) {
        setModuleState(prev => ({ ...prev, isDirty: false }));
        onConfigSaved?.(currentConfig);
        logger.info('Widget configuration saved successfully', { widgetId });
      }
    } catch (err) {
      logger.error('Failed to save widget configuration', err as Error, { 
        operation: 'saveConfig', 
        component: 'ModularWidgetManagement',
        widgetId 
      });
      onError?.(err as Error);
    }
  }, [saveConfiguration, currentConfig, widgetId, onConfigSaved, onError]);

  const handleResetConfig = useCallback(() => {
    logger.info('Resetting widget configuration', { widgetId });
    resetToDefaults();
    setModuleState(prev => ({ 
      ...prev, 
      isDirty: false, 
      validationErrors: [] 
    }));
  }, [resetToDefaults, widgetId]);

  const handleDeviceChange = useCallback((device: 'desktop' | 'tablet' | 'mobile') => {
    setModuleState(prev => ({ ...prev, previewDevice: device }));
  }, []);

  // Common props for all modules
  const commonModuleProps: WidgetModuleProps = {
    widgetId,
    widgetType,
    config: currentConfig,
    onConfigChange: handleConfigChange,
    hasUnsavedChanges,
    isLoading: false
  };

  return (
    <ErrorBoundary
      component="ModularWidgetManagement"
      fallback={
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Widget Management Error</h3>
          <p className="text-red-700">An error occurred while loading the widget management interface.</p>
        </div>
      }
    >
      <div className={`space-y-6 ${className}`}>
        {/* Header with controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Widget Management</h1>
              <Badge variant={widgetType === 'booking' ? 'default' : 'secondary'}>
                {widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}
              </Badge>
              {moduleState.isDirty && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Configure, preview, and deploy your {widgetType} widget
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetConfig}
              disabled={!hasUnsavedChanges}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!hasUnsavedChanges || moduleState.validationErrors.length > 0}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Validation errors */}
        {moduleState.validationErrors.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Configuration Issues</h3>
            </div>
            <ul className="text-yellow-700 space-y-1">
              {moduleState.validationErrors.map((error, index) => (
                <li key={index} className="text-sm">• {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Modular tabs interface */}
        <Tabs value={moduleState.activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab navigation */}
          <TabsList className="grid w-full grid-cols-6 h-auto p-1">
            {TAB_CONFIG.map(({ id, label, icon: Icon, description }) => (
              <TabsTrigger 
                key={id} 
                value={id} 
                className="flex flex-col gap-1 p-3 h-auto data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab content with modular components */}
          <div className="min-h-[600px]">
            <TabsContent value="configure" className="mt-0">
              <OptimizedWidgetConfigurationModule
                {...commonModuleProps}
                tenant={tenant}
                validationErrors={moduleState.validationErrors}
                onSave={handleSaveConfig}
                onReset={handleResetConfig}
                className="space-y-6"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <OptimizedWidgetPreviewModule
                {...commonModuleProps}
                previewDevice={moduleState.previewDevice}
                onDeviceChange={handleDeviceChange}
                className="space-y-6"
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <OptimizedWidgetAnalyticsModule
                {...commonModuleProps}
                className="space-y-6"
              />
            </TabsContent>

            <TabsContent value="realtime" className="mt-0">
              <OptimizedWidgetRealtimeModule
                {...commonModuleProps}
                className="space-y-6"
              />
            </TabsContent>

            <TabsContent value="versions" className="mt-0">
              <OptimizedWidgetVersionModule
                {...commonModuleProps}
                className="space-y-6"
              />
            </TabsContent>

            <TabsContent value="deploy" className="mt-0">
              <OptimizedWidgetDeploymentModule
                {...commonModuleProps}
                className="space-y-6"
              />
            </TabsContent>
            {/* 3D links removed */}
          </div>
        </Tabs>

        {/* Performance debug info (development only) */}
        {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 border rounded-lg text-xs text-gray-600 dark:text-gray-300">
            <div className="grid grid-cols-4 gap-4">
              <div>Mount Time: {performanceMetrics.mountTime}ms</div>
              <div>Renders: {performanceMetrics.renderCount}</div>
                  <div>Memory: {(performance as any).memory?.usedJSHeapSize ? 
                Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}</div>
              <div>Active Tab: {moduleState.activeTab}</div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

ModularWidgetManagement.displayName = 'ModularWidgetManagement';

export default ModularWidgetManagement;