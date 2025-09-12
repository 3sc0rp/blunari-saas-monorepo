/**
 * Enhanced Widget Configuration Panel Component
 * Professional UI/UX with advanced state management and real-time preview
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Type, 
  Layout, 
  Settings2,
  RotateCcw,
  Save,
  Wand2,
  Paintbrush2,
  Box,
  Layers,
  MoreHorizontal
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface ConfigurationPanelProps {
  widgetType: 'booking' | 'catering';
  config: WidgetConfig;
  onConfigChange: (config: WidgetConfig) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isActive: boolean;
  onToggleActive: () => void;
}

const presetThemes = [
  {
    name: 'Modern Blue',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    preset: 'modern-blue'
  },
  {
    name: 'Elegant Purple',
    primaryColor: '#8b5cf6',
    backgroundColor: '#faf5ff',
    textColor: '#2d1b69',
    preset: 'elegant-purple'
  },
  {
    name: 'Warm Orange',
    primaryColor: '#f97316',
    backgroundColor: '#fff7ed',
    textColor: '#9a3412',
    preset: 'warm-orange'
  },
  {
    name: 'Professional Gray',
    primaryColor: '#6b7280',
    backgroundColor: '#f9fafb',
    textColor: '#111827',
    preset: 'professional-gray'
  },
  {
    name: 'Dark Mode',
    primaryColor: '#60a5fa',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    preset: 'dark-mode'
  }
];

const fontOptions = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'nunito', label: 'Nunito' }
];

const WidgetConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  widgetType,
  config,
  onConfigChange,
  onSave,
  onReset,
  isSaving,
  isActive,
  onToggleActive
}) => {
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigUpdate = useCallback((updates: Partial<WidgetConfig>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  const applyPresetTheme = useCallback((preset: typeof presetThemes[0]) => {
    handleConfigUpdate({
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor
    });
  }, [handleConfigUpdate]);

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'content', label: 'Content', icon: Type },
    { id: 'advanced', label: 'Advanced', icon: Settings2 }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          <h3 className="text-lg font-semibold capitalize">
            {widgetType} Widget Configuration
          </h3>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          <Switch
            checked={isActive}
            onCheckedChange={onToggleActive}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {sections.map(section => {
            const IconComponent = section.icon;
            return (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex items-center gap-1 text-xs"
              >
                <IconComponent className="w-3 h-3" />
                <span className="hidden sm:inline">{section.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 mt-6">
          {/* Theme Presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Quick Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presetThemes.map((theme) => (
                  <Button
                    key={theme.preset}
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-center gap-2"
                    onClick={() => applyPresetTheme(theme)}
                  >
                    <div className="flex gap-1">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: theme.backgroundColor }}
                      />
                    </div>
                    <span className="text-xs">{theme.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paintbrush2 className="w-4 h-4" />
                Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => handleConfigUpdate({ primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 border-2"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => handleConfigUpdate({ primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => handleConfigUpdate({ backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1 border-2"
                    />
                    <Input
                      value={config.backgroundColor}
                      onChange={(e) => handleConfigUpdate({ backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => handleConfigUpdate({ textColor: e.target.value })}
                    className="w-12 h-10 p-1 border-2"
                  />
                  <Input
                    value={config.textColor}
                    onChange={(e) => handleConfigUpdate({ textColor: e.target.value })}
                    placeholder="#1f2937"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="w-4 h-4" />
                Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Border Radius: {config.borderRadius}px</Label>
                <Slider
                  value={[config.borderRadius]}
                  onValueChange={([value]) => handleConfigUpdate({ borderRadius: value })}
                  max={24}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Shadow Intensity: {config.shadowIntensity || 1}</Label>
                <Slider
                  value={[config.shadowIntensity || 1]}
                  onValueChange={([value]) => handleConfigUpdate({ shadowIntensity: value })}
                  max={5}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Animation</Label>
                <Select
                  value={config.animation || 'none'}
                  onValueChange={(value: any) => handleConfigUpdate({ animation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fade">Fade In</SelectItem>
                    <SelectItem value="slide">Slide Up</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Layout Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Show Logo</Label>
                  <p className="text-xs text-muted-foreground">Display restaurant logo in widget</p>
                </div>
                <Switch
                  checked={config.showLogo}
                  onCheckedChange={(checked) => handleConfigUpdate({ showLogo: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">Reduce spacing for tight layouts</p>
                </div>
                <Switch
                  checked={config.compactMode}
                  onCheckedChange={(checked) => handleConfigUpdate({ compactMode: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Spacing: {config.spacing || 1}x</Label>
                <Slider
                  value={[config.spacing || 1]}
                  onValueChange={([value]) => handleConfigUpdate({ spacing: value })}
                  max={3}
                  min={0.5}
                  step={0.25}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Welcome Message</Label>
                <Textarea
                  value={config.welcomeMessage}
                  onChange={(e) => handleConfigUpdate({ welcomeMessage: e.target.value })}
                  placeholder={`${widgetType === 'booking' ? 'Book your table with us!' : 'Order catering for your event!'}`}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Button Text</Label>
                <Input
                  value={config.buttonText}
                  onChange={(e) => handleConfigUpdate({ buttonText: e.target.value })}
                  placeholder={`${widgetType === 'booking' ? 'Reserve Now' : 'Order Catering'}`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Font Family</Label>
                <Select
                  value={config.fontFamily || 'system'}
                  onValueChange={(value) => handleConfigUpdate({ fontFamily: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map(font => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Font Size: {config.fontSize || 14}px</Label>
                <Slider
                  value={[config.fontSize || 14]}
                  onValueChange={([value]) => handleConfigUpdate({ fontSize: value })}
                  max={20}
                  min={12}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Theme Mode</Label>
                <Select
                  value={config.theme}
                  onValueChange={(value: any) => handleConfigUpdate({ theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <span className="text-sm">Custom CSS</span>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <Label className="text-sm text-muted-foreground">
                    Add custom CSS for advanced styling
                  </Label>
                  <Textarea
                    value={config.customCss || ''}
                    onChange={(e) => handleConfigUpdate({ customCss: e.target.value })}
                    placeholder="/* Custom CSS */&#10;.widget-container {&#10;  /* Your styles here */&#10;}"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <Save className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default WidgetConfigurationPanel;
