/**
 * Enhanced Widget Preview Component
 * Real-time interactive preview with device simulation
 */
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  RotateCcw, 
  Eye,
  Zap,
  Wifi,
  ExternalLink,
  Download,
  Share2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WidgetConfig {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  welcomeMessage: string;
  buttonText: string;
  showLogo: boolean;
  compactMode: boolean;
  customCss?: string;
  animation?: 'none' | 'fade' | 'slide' | 'bounce';
  shadowIntensity: number;
  fontFamily: string;
  fontSize: number;
  spacing: number;
}

interface PreviewPanelProps {
  widgetType: 'booking' | 'catering';
  config: WidgetConfig;
  tenantId?: string;
  isActive: boolean;
}

const deviceConfigs = {
  mobile: {
    name: 'Mobile',
    icon: Smartphone,
    width: 'w-80',
    height: 'h-96',
    viewport: '320x568'
  },
  tablet: {
    name: 'Tablet',
    icon: Tablet,
    width: 'w-96',
    height: 'h-[32rem]',
    viewport: '768x1024'
  },
  desktop: {
    name: 'Desktop',
    icon: Monitor,
    width: 'w-full max-w-lg',
    height: 'h-[36rem]',
    viewport: '1200x800'
  }
};

const WidgetPreviewPanel: React.FC<PreviewPanelProps> = ({
  widgetType,
  config,
  tenantId,
  isActive
}) => {
  const [selectedDevice, setSelectedDevice] = useState<keyof typeof deviceConfigs>('desktop');
  const [isLivePreview, setIsLivePreview] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const generatePreviewUrl = useCallback(() => {
    if (!tenantId) return '#';
    const baseUrl = window.location.origin;
    return `${baseUrl}/widget/${widgetType}/${tenantId}`;
  }, [tenantId, widgetType]);

  const mockWidgetPreview = useMemo(() => {
    const fields = widgetType === 'booking' 
      ? [
          { placeholder: 'Select Date', type: 'date' },
          { placeholder: 'Select Time', type: 'time' },
          { placeholder: 'Party Size', type: 'number' },
          { placeholder: 'Your Name', type: 'text' },
          { placeholder: 'Phone Number', type: 'tel' }
        ]
      : [
          { placeholder: 'Event Date', type: 'date' },
          { placeholder: 'Number of Guests', type: 'number' },
          { placeholder: 'Event Type', type: 'text' },
          { placeholder: 'Contact Name', type: 'text' },
          { placeholder: 'Phone Number', type: 'tel' }
        ];

    return (
      <div 
        className="w-full h-full p-6 transition-all duration-300"
        style={{
          backgroundColor: config.backgroundColor,
          color: config.textColor,
          borderRadius: `${config.borderRadius}px`,
          fontFamily: config.fontFamily === 'system' ? 'system-ui' : config.fontFamily,
          fontSize: `${config.fontSize || 14}px`,
          padding: config.compactMode ? '1rem' : '1.5rem',
          boxShadow: config.shadowIntensity ? `0 ${config.shadowIntensity * 4}px ${config.shadowIntensity * 8}px rgba(0,0,0,${config.shadowIntensity * 0.1})` : 'none'
        }}
      >
        <motion.div
          initial={config.animation === 'fade' ? { opacity: 0 } : config.animation === 'slide' ? { y: 20 } : {}}
          animate={config.animation === 'fade' ? { opacity: 1 } : config.animation === 'slide' ? { y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Logo */}
          {config.showLogo && (
            <div className="text-center">
              <div 
                className="mx-auto bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500"
                style={{ 
                  width: config.compactMode ? '48px' : '64px',
                  height: config.compactMode ? '48px' : '64px'
                }}
              >
                Logo
              </div>
            </div>
          )}

          {/* Welcome Message */}
          <div className="text-center">
            <h3 className={`font-semibold mb-2 ${config.compactMode ? 'text-base' : 'text-lg'}`}>
              {config.welcomeMessage || (widgetType === 'booking' ? 'Book your table with us!' : 'Order catering for your event!')}
            </h3>
          </div>

          {/* Form Fields */}
          <div className={`space-y-${(config.spacing || 1) === 0.5 ? '2' : (config.spacing || 1) === 1 ? '3' : '4'}`}>
            {fields.map((field, index) => (
              <div key={index} className={index < 2 && widgetType === 'booking' ? 'grid grid-cols-2 gap-2' : ''}>
                <Input
                  placeholder={field.placeholder}
                  type={field.type}
                  disabled
                  className="border-gray-300"
                  style={{ 
                    borderRadius: `${config.borderRadius}px`,
                    fontSize: `${(config.fontSize || 14) - 1}px`
                  }}
                />
                {index === 0 && widgetType === 'booking' && (
                  <Input
                    placeholder="Select Time"
                    type="time"
                    disabled
                    className="border-gray-300"
                    style={{ 
                      borderRadius: `${config.borderRadius}px`,
                      fontSize: `${(config.fontSize || 14) - 1}px`
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            className="w-full font-medium transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: config.primaryColor,
              borderRadius: `${config.borderRadius}px`,
              fontSize: `${config.fontSize || 14}px`,
              padding: config.compactMode ? '0.5rem 1rem' : '0.75rem 1.5rem'
            }}
            disabled
          >
            {config.buttonText || (widgetType === 'booking' ? 'Reserve Now' : 'Order Catering')}
          </Button>

          {/* Features */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-xs opacity-70">
              <Zap className="w-3 h-3" />
              <span>Instant</span>
            </div>
            <div className="flex items-center gap-1 text-xs opacity-70">
              <Wifi className="w-3 h-3" />
              <span>Secure</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }, [config, widgetType]);

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Live Preview</h3>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Preview Mode"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isActive && tenantId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <a href={generatePreviewUrl()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open in New Tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Device Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Device Preview</CardTitle>
          <CardDescription className="text-xs">
            Test your widget across different screen sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {Object.entries(deviceConfigs).map(([key, device]) => {
              const IconComponent = device.icon;
              const isSelected = selectedDevice === key;
              
              return (
                <Button
                  key={key}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDevice(key as keyof typeof deviceConfigs)}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{device.name}</span>
                </Button>
              );
            })}
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            Viewport: {deviceConfigs[selectedDevice].viewport}
          </div>
        </CardContent>
      </Card>

      {/* Preview Frame */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex justify-center items-center min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <motion.div
              key={`${selectedDevice}-${refreshKey}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`${deviceConfigs[selectedDevice].width} ${deviceConfigs[selectedDevice].height} bg-white rounded-lg shadow-lg overflow-hidden border`}
            >
              {isActive && tenantId && isLivePreview ? (
                <iframe
                  src={generatePreviewUrl()}
                  className="w-full h-full border-0"
                  title={`${widgetType} Widget Preview`}
                  onError={() => setIsLivePreview(false)}
                />
              ) : (
                mockWidgetPreview
              )}
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Actions */}
      <div className="flex items-center gap-2 justify-center">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Share Preview
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Config
        </Button>
      </div>

      {/* Preview Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Widget Type</Label>
              <p className="font-medium capitalize">{widgetType}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Theme</Label>
              <p className="font-medium capitalize">{config.theme}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Colors</Label>
              <div className="flex gap-1">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: config.primaryColor }}
                />
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: config.backgroundColor }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                {isActive ? "Live" : "Preview"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetPreviewPanel;
