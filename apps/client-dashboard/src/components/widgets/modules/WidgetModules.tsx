/**
 * @fileoverview Widget Management Architecture Design
 * @description Modular architecture design for breaking down the massive WidgetManagement component
 * @version 1.0.0
 * @author Blunari Development Team
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { withPerformanceOptimization } from '../../../utils/performance';
import { logger } from '../../../utils/logger';

/**
 * Architecture Overview:
 * 
 * Current State: Monolithic 2,270+ line component
 * Target State: Modular, composable architecture with 8 main modules
 * 
 * Module Breakdown:
 * 1. WidgetConfigurationModule - Settings, styling, features
 * 2. WidgetPreviewModule - Device preview, responsive testing
 * 3. WidgetAnalyticsModule - Performance metrics, usage stats
 * 4. WidgetRealtimeModule - Live analytics, real-time updates
 * 5. WidgetVersionModule - Version control, A/B testing
 * 6. WidgetDeploymentModule - Embed codes, deployment
 * 7. WidgetHeaderModule - Controls, status, navigation
 * 8. WidgetValidationModule - Error handling, validation
 */

// Type definitions for the modular architecture
export interface WidgetModuleProps {
  widgetId: string;
  widgetType: 'booking' | 'catering';
  config: any;
  onConfigChange: (config: any) => void;
  hasUnsavedChanges?: boolean;
  isLoading?: boolean;
  className?: string;
}

export interface ModuleState {
  activeTab: string;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  validationErrors: any[];
  isDirty: boolean;
}

/**
 * Base Module Component
 * Provides common functionality for all widget modules
 */
export const BaseWidgetModule = memo<{
  moduleName: string;
  children: React.ReactNode;
  onMount?: () => void;
  onUnmount?: () => void;
}>(({ moduleName, children, onMount, onUnmount }) => {
  React.useEffect(() => {
    logger.debug('Widget module mounted', { moduleName });
    onMount?.();
    
    return () => {
      logger.debug('Widget module unmounted', { moduleName });
      onUnmount?.();
    };
  }, [moduleName, onMount, onUnmount]);

  return <div data-module={moduleName}>{children}</div>;
});

BaseWidgetModule.displayName = 'BaseWidgetModule';

/**
 * Module 1: Widget Configuration Module
 * Handles all widget settings, styling, and feature configuration
 */
export interface ConfigurationModuleProps extends WidgetModuleProps {
  tenant?: any;
  validationErrors: any[];
  onSave: () => Promise<void>;
  onReset: () => void;
}

const WidgetConfigurationModule = memo<ConfigurationModuleProps>(({
  widgetId,
  widgetType,
  config,
  onConfigChange,
  tenant,
  validationErrors,
  onSave,
  onReset,
  className
}) => {
  const [activeSection, setActiveSection] = useState('appearance');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigUpdate = useCallback((updates: any) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'content', label: 'Content', icon: '📝' },
    { id: 'features', label: 'Features', icon: '⚙️' }
  ];

  return (
    <BaseWidgetModule moduleName="configuration">
      <div className={className}>
        <div className="space-y-6">
          {/* Section Navigation */}
          <div className="border-b">
            <nav className="flex space-x-8">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeSection === section.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Color Scheme</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.primaryColor || '#3b82f6'}
                          onChange={(e) => handleConfigUpdate({ primaryColor: e.target.value })}
                          className="w-12 h-10 p-1 rounded border"
                        />
                        <input
                          type="text"
                          value={config.primaryColor || '#3b82f6'}
                          onChange={(e) => handleConfigUpdate({ primaryColor: e.target.value })}
                          placeholder="#3b82f6"
                          className="flex-1 px-3 py-2 border rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secondary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.secondaryColor || '#1e40af'}
                          onChange={(e) => handleConfigUpdate({ secondaryColor: e.target.value })}
                          className="w-12 h-10 p-1 rounded border"
                        />
                        <input
                          type="text"
                          value={config.secondaryColor || '#1e40af'}
                          onChange={(e) => handleConfigUpdate({ secondaryColor: e.target.value })}
                          placeholder="#1e40af"
                          className="flex-1 px-3 py-2 border rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <select
                      value={config.theme || 'light'}
                      onChange={(e) => handleConfigUpdate({ theme: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Typography</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Font Size</label>
                      <input
                        type="number"
                        value={config.fontSize || 14}
                        onChange={(e) => handleConfigUpdate({ fontSize: parseInt(e.target.value) })}
                        min="12"
                        max="24"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Border Radius</label>
                      <input
                        type="number"
                        value={config.borderRadius || 8}
                        onChange={(e) => handleConfigUpdate({ borderRadius: parseInt(e.target.value) })}
                        min="0"
                        max="20"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Section */}
          {activeSection === 'content' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Widget Content</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Welcome Message</label>
                      <input
                        type="text"
                        value={config.welcomeMessage || ''}
                        onChange={(e) => handleConfigUpdate({ welcomeMessage: e.target.value })}
                        placeholder={widgetType === 'booking' ? 'Book your table with us!' : 'Order catering for your event!'}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={config.description || ''}
                        onChange={(e) => handleConfigUpdate({ description: e.target.value })}
                        placeholder={widgetType === 'booking' ? 'Reserve your perfect dining experience' : 'Delicious catering for any occasion'}
                        rows={3}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Button Text</label>
                      <input
                        type="text"
                        value={config.buttonText || ''}
                        onChange={(e) => handleConfigUpdate({ buttonText: e.target.value })}
                        placeholder={widgetType === 'booking' ? 'Reserve Now' : 'Order Catering'}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          {activeSection === 'features' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Display Options</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Logo</label>
                      <input
                        type="checkbox"
                        checked={config.showLogo ?? true}
                        onChange={(e) => handleConfigUpdate({ showLogo: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Description</label>
                      <input
                        type="checkbox"
                        checked={config.showDescription ?? true}
                        onChange={(e) => handleConfigUpdate({ showDescription: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Compact Mode</label>
                      <input
                        type="checkbox"
                        checked={config.compactMode ?? false}
                        onChange={(e) => handleConfigUpdate({ compactMode: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Enable Animations</label>
                      <input
                        type="checkbox"
                        checked={config.enableAnimations ?? true}
                        onChange={(e) => handleConfigUpdate({ enableAnimations: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">{widgetType === 'booking' ? 'Booking' : 'Catering'} Features</h4>
                  
                  <div className="space-y-3">
                    {widgetType === 'booking' && (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Smart Table Optimization</label>
                          <input
                            type="checkbox"
                            checked={config.enableTableOptimization ?? false}
                            onChange={(e) => handleConfigUpdate({ enableTableOptimization: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Require Deposit</label>
                          <input
                            type="checkbox"
                            checked={config.requireDeposit ?? false}
                            onChange={(e) => handleConfigUpdate({ requireDeposit: e.target.checked })}
                            className="rounded"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Max Party Size</label>
                          <input
                            type="number"
                            value={config.maxPartySize || 12}
                            onChange={(e) => handleConfigUpdate({ maxPartySize: parseInt(e.target.value) })}
                            min="1"
                            max="50"
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Availability Indicator</label>
                      <input
                        type="checkbox"
                        checked={config.showAvailabilityIndicator ?? true}
                        onChange={(e) => handleConfigUpdate({ showAvailabilityIndicator: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Enable Special Requests</label>
                      <input
                        type="checkbox"
                        checked={config.enableSpecialRequests ?? true}
                        onChange={(e) => handleConfigUpdate({ enableSpecialRequests: e.target.checked })}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced CSS Section */}
          {showAdvanced && (
            <div className="space-y-4">
              <h4 className="font-medium">Custom CSS</h4>
              <textarea
                value={config.customCss || ''}
                onChange={(e) => handleConfigUpdate({ customCss: e.target.value })}
                placeholder="/* Add custom CSS styles here */"
                rows={6}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
              />
            </div>
          )}

          {/* Advanced Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetConfigurationModule.displayName = 'WidgetConfigurationModule';

/**
 * Module 2: Widget Preview Module
 * Handles device previews, responsive testing, and visual feedback
 */
export interface PreviewModuleProps extends WidgetModuleProps {
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
  showDeviceFrames?: boolean;
}

const WidgetPreviewModule = memo<PreviewModuleProps>(({
  widgetId,
  widgetType,
  config,
  previewDevice,
  onDeviceChange,
  showDeviceFrames = true,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Generate preview URL based on current config
  useEffect(() => {
    const baseUrl = `/widget-preview/${widgetType}`;
    const params = new URLSearchParams({
      widgetId: widgetId,
      device: previewDevice,
      preview: 'true',
      ...Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key, String(value)])
      )
    });
    setPreviewUrl(`${baseUrl}?${params.toString()}`);
  }, [widgetId, widgetType, config, previewDevice]);

  const deviceSizes = {
    desktop: { width: '100%', height: '600px' },
    tablet: { width: '768px', height: '500px' },
    mobile: { width: '375px', height: '600px' }
  };

  const currentSize = deviceSizes[previewDevice];

  return (
    <BaseWidgetModule moduleName="preview">
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Widget Preview</h3>
              <p className="text-sm text-muted-foreground">
                Test your {widgetType} widget across different devices and screen sizes
              </p>
            </div>
            
            {/* Device selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Device:</label>
              <select 
                value={previewDevice} 
                onChange={(e) => onDeviceChange(e.target.value as any)}
                className="px-3 py-1 border rounded"
              >
                <option value="desktop">🖥️ Desktop</option>
                <option value="tablet">📱 Tablet</option>
                <option value="mobile">📱 Mobile</option>
              </select>
            </div>
          </div>

          {/* Preview area */}
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[600px] flex items-center justify-center">
            <div 
              className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
                showDeviceFrames ? 'border-8 border-gray-300' : ''
              }`}
              style={{
                width: currentSize.width,
                height: currentSize.height,
                maxWidth: '100%'
              }}
            >
              {/* Widget Preview Content */}
              <div className="w-full h-full p-6 flex flex-col">
                <div 
                  className="flex-1 rounded-lg shadow-sm border"
                  style={{
                    backgroundColor: config.backgroundColor || '#ffffff',
                    borderRadius: `${config.borderRadius || 8}px`,
                    color: config.textColor || '#1f2937'
                  }}
                >
                  <div className="p-6 space-y-4">
                    {/* Widget Header */}
                    {config.showLogo && (
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                      </div>
                    )}
                    
                    {/* Welcome Message */}
                    <div className="text-center">
                      <h3 
                        className="font-semibold mb-2"
                        style={{ 
                          fontSize: `${config.fontSize || 14}px`,
                          color: config.textColor || '#1f2937'
                        }}
                      >
                        {config.welcomeMessage || `Book your ${widgetType} experience!`}
                      </h3>
                      
                      {config.showDescription && (
                        <p 
                          className="text-sm"
                          style={{ 
                            fontSize: `${(config.fontSize || 14) - 2}px`,
                            color: config.textColor || '#6b7280'
                          }}
                        >
                          {config.description || 'Configure your widget to see changes here'}
                        </p>
                      )}
                    </div>
                    
                    {/* Form Elements Preview */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">Date</label>
                          <div className="h-8 bg-gray-100 rounded border"></div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">Time</label>
                          <div className="h-8 bg-gray-100 rounded border"></div>
                        </div>
                      </div>
                      
                      {widgetType === 'booking' && config.maxPartySize && (
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">Party Size (Max: {config.maxPartySize})</label>
                          <div className="h-8 bg-gray-100 rounded border"></div>
                        </div>
                      )}
                      
                      {config.enableSpecialRequests && (
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">Special Requests</label>
                          <div className="h-16 bg-gray-100 rounded border"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <button
                      className="w-full font-medium transition-colors rounded"
                      style={{
                        backgroundColor: config.primaryColor || '#3b82f6',
                        color: 'white',
                        borderRadius: `${(config.borderRadius || 8) / 2}px`,
                        padding: `${(config.fontSize || 14) * 0.6}px ${(config.fontSize || 14) * 1.2}px`,
                        fontSize: `${config.fontSize || 14}px`
                      }}
                    >
                      {config.buttonText || 'Reserve Now'}
                    </button>
                    
                    {/* Feature Indicators */}
                    <div className="flex justify-center gap-2 text-xs">
                      {config.enableTableOptimization && widgetType === 'booking' && (
                        <span className="text-blue-600">⚡ Smart Tables</span>
                      )}
                      {config.showAvailabilityIndicator && (
                        <span className="text-green-600">✓ Live Availability</span>
                      )}
                      {config.requireDeposit && (
                        <span className="text-orange-600">💳 Deposit Required</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Device Info */}
                <div className="mt-4 text-center text-xs text-gray-500">
                  Previewing on {previewDevice} ({currentSize.width} × {currentSize.height})
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Actions */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDeviceFrames}
                  onChange={(e) => {/* Add handler if needed */}}
                  className="rounded"
                />
                Show device frames
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsLoading(!isLoading)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                {isLoading ? '🔄 Refreshing...' : '🔄 Refresh Preview'}
              </button>
              <button 
                onClick={() => window.open(previewUrl, '_blank')}
                className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              >
                🔗 Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetPreviewModule.displayName = 'WidgetPreviewModule';

/**
 * Module 3: Widget Analytics Module
 * Handles performance metrics, usage statistics, and insights
 */
export interface AnalyticsModuleProps extends WidgetModuleProps {
  dateRange?: { start: Date; end: Date };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
}

const WidgetAnalyticsModule = memo<AnalyticsModuleProps>(({
  widgetId,
  widgetType,
  dateRange,
  onDateRangeChange,
  className
}) => {
  return (
    <BaseWidgetModule moduleName="analytics">
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Widget Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Performance metrics and usage insights for your {widgetType} widget
              </p>
            </div>
            
            {/* Date range selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Period:</label>
              <select className="px-3 py-1 border rounded">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Analytics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Views', value: '12,345', change: '+12%' },
              { label: 'Conversions', value: '1,234', change: '+8%' },
              { label: 'Conversion Rate', value: '10.0%', change: '+2.1%' },
              { label: 'Avg. Session', value: '2:45', change: '+15s' }
            ].map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white">
                <div className="text-sm text-gray-600">{metric.label}</div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm text-green-600">{metric.change}</div>
              </div>
            ))}
          </div>

          {/* Charts placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg bg-white">
              <h4 className="font-medium mb-4">Usage Over Time</h4>
              <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
                <span className="text-gray-500">📊 Chart Component</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <h4 className="font-medium mb-4">Device Breakdown</h4>
              <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
                <span className="text-gray-500">🥧 Pie Chart Component</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetAnalyticsModule.displayName = 'WidgetAnalyticsModule';

/**
 * Module 4: Widget Real-time Module
 * Handles live analytics, real-time updates, and monitoring
 */
const WidgetRealtimeModule = memo<WidgetModuleProps>(({
  widgetId,
  widgetType,
  className
}) => {
  return (
    <BaseWidgetModule moduleName="realtime">
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Real-time Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Live monitoring and real-time insights for your {widgetType} widget
              </p>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Live</span>
            </div>
          </div>

          {/* Real-time metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Active Users', value: '23', icon: '👥' },
              { label: 'Current Conversions', value: '5', icon: '✅' },
              { label: 'Response Time', value: '1.2s', icon: '⚡' }
            ].map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{metric.icon}</span>
                  <span className="text-sm text-gray-600">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
              </div>
            ))}
          </div>

          {/* Live activity feed */}
          <div className="p-4 border rounded-lg bg-white">
            <h4 className="font-medium mb-4">Live Activity Feed</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[
                { time: '2 seconds ago', event: 'User viewed widget', type: 'view' },
                { time: '15 seconds ago', event: 'Booking completed', type: 'conversion' },
                { time: '1 minute ago', event: 'User started booking flow', type: 'interaction' },
                { time: '2 minutes ago', event: 'Widget loaded', type: 'view' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'conversion' ? 'bg-green-500' :
                      activity.type === 'interaction' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm">{activity.event}</span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetRealtimeModule.displayName = 'WidgetRealtimeModule';

/**
 * Module 5: Widget Version Module
 * Handles version control, A/B testing, and deployment management
 */
const WidgetVersionModule = memo<WidgetModuleProps>(({
  widgetId,
  widgetType,
  className
}) => {
  return (
    <BaseWidgetModule moduleName="version">
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Version Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage versions, deployments, and A/B tests for your {widgetType} widget
              </p>
            </div>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Create Version
            </button>
          </div>

          {/* Version list */}
          <div className="space-y-3">
            {[
              { version: 'v2.1.0', status: 'Production', traffic: '80%', created: '2 days ago' },
              { version: 'v2.1.1-beta', status: 'A/B Test', traffic: '20%', created: '1 day ago' },
              { version: 'v2.0.5', status: 'Archived', traffic: '0%', created: '1 week ago' }
            ].map((version, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{version.version}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      version.status === 'Production' ? 'bg-green-100 text-green-800' :
                      version.status === 'A/B Test' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {version.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{version.traffic} traffic</span>
                    <span className="text-sm text-gray-500">{version.created}</span>
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetVersionModule.displayName = 'WidgetVersionModule';

/**
 * Module 6: Widget Deployment Module
 * Handles embed codes, installation guides, and deployment options
 */
const WidgetDeploymentModule = memo<WidgetModuleProps>(({
  widgetId,
  widgetType,
  config,
  className
}) => {
  return (
    <BaseWidgetModule moduleName="deployment">
      <div className={className}>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Deploy Your Widget</h3>
            <p className="text-sm text-muted-foreground">
              Get embed codes and deployment instructions for your {widgetType} widget
            </p>
          </div>

          {/* Embed code section */}
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Embed Code</h4>
              <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                Copy Code
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm font-mono overflow-x-auto">
              {`<script src="https://widgets.blunari.com/embed.js"></script>
<div id="blunari-widget" 
     data-widget-type="${widgetType}"
     data-widget-id="${widgetId}">
</div>`}
            </div>
          </div>

          {/* Installation options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">WordPress Plugin</h4>
              <p className="text-sm text-gray-600 mb-3">
                Easy installation with our WordPress plugin
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Download Plugin
              </button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Shopify App</h4>
              <p className="text-sm text-gray-600 mb-3">
                Seamless integration with Shopify stores
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Install App
              </button>
            </div>
          </div>

          {/* Testing checklist */}
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium mb-3">Deployment Checklist</h4>
            <div className="space-y-2 text-sm">
              {[
                'Test widget on staging environment',
                'Verify responsive design on all devices',
                'Check analytics tracking functionality',
                'Validate form submissions and integrations',
                'Monitor performance after deployment'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BaseWidgetModule>
  );
});

WidgetDeploymentModule.displayName = 'WidgetDeploymentModule';

/**
 * Performance-optimized exports with HOC
 */
export const OptimizedWidgetConfigurationModule = withPerformanceOptimization(
  WidgetConfigurationModule,
  { memoize: true, displayName: 'WidgetConfigurationModule', debugRenders: false }
);

export const OptimizedWidgetPreviewModule = withPerformanceOptimization(
  WidgetPreviewModule,
  { memoize: true, displayName: 'WidgetPreviewModule', debugRenders: false }
);

export const OptimizedWidgetAnalyticsModule = withPerformanceOptimization(
  WidgetAnalyticsModule,
  { memoize: true, displayName: 'WidgetAnalyticsModule', debugRenders: false }
);

export const OptimizedWidgetRealtimeModule = withPerformanceOptimization(
  WidgetRealtimeModule,
  { memoize: true, displayName: 'WidgetRealtimeModule', debugRenders: false }
);

export const OptimizedWidgetVersionModule = withPerformanceOptimization(
  WidgetVersionModule,
  { memoize: true, displayName: 'WidgetVersionModule', debugRenders: false }
);

export const OptimizedWidgetDeploymentModule = withPerformanceOptimization(
  WidgetDeploymentModule,
  { memoize: true, displayName: 'WidgetDeploymentModule', debugRenders: false }
);

// Export all modules
export {
  WidgetConfigurationModule,
  WidgetPreviewModule,
  WidgetAnalyticsModule,
  WidgetRealtimeModule,
  WidgetVersionModule,
  WidgetDeploymentModule
};