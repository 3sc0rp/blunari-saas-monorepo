import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ThemePreferences } from '@/types/profile';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Type, 
  Zap, 
  Eye,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThemeTabProps {
  preferences: ThemePreferences;
  onUpdate: (preferences: ThemePreferences) => void;
}

export function ThemeTab({ preferences, onUpdate }: ThemeTabProps) {
  const [editedPreferences, setEditedPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onUpdate(editedPreferences);
      toast({
        title: "Theme Updated",
        description: "Your theme preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save theme preferences.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const accentColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const hasChanges = JSON.stringify(editedPreferences) !== JSON.stringify(preferences);

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Mode
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <div
                key={theme}
                className={`relative cursor-pointer rounded-lg border-2 p-4 ${
                  editedPreferences.theme === theme
                    ? 'border-primary bg-primary/5'
                    : 'border-muted bg-background'
                }`}
                onClick={() => setEditedPreferences(prev => ({ ...prev, theme }))}
              >
                <div className="flex items-center justify-center mb-3">
                  {getThemeIcon(theme)}
                </div>
                <h3 className="text-center font-medium capitalize">{theme}</h3>
                <p className="text-center text-sm text-muted-foreground mt-1">
                  {theme === 'light' && 'Light colors and backgrounds'}
                  {theme === 'dark' && 'Dark colors and backgrounds'}
                  {theme === 'system' && 'Match your system setting'}
                </p>
                {editedPreferences.theme === theme && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>
            Choose your preferred accent color for highlights and buttons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {accentColors.map((color) => (
              <div
                key={color.value}
                className={`relative cursor-pointer rounded-lg p-3 border-2 ${
                  editedPreferences.accentColor === color.value
                    ? 'border-foreground'
                    : 'border-muted'
                }`}
                onClick={() => setEditedPreferences(prev => ({ ...prev, accentColor: color.value }))}
              >
                <div
                  className="h-8 w-full rounded-md"
                  style={{ backgroundColor: color.value }}
                />
                <p className="text-xs text-center mt-1">{color.name}</p>
                {editedPreferences.accentColor === color.value && (
                  <div className="absolute top-1 right-1">
                    <div className="h-2 w-2 rounded-full bg-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>
            Customize text size and readability options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="fontSize">Font Size</Label>
            <Select 
              value={editedPreferences.fontSize} 
              onValueChange={(value: typeof editedPreferences.fontSize) => 
                setEditedPreferences(prev => ({ ...prev, fontSize: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="high-contrast">High Contrast</Label>
                <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
              </div>
              <Switch
                id="high-contrast"
                checked={editedPreferences.highContrast}
                onCheckedChange={(checked) => setEditedPreferences(prev => ({ ...prev, highContrast: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reduced-motion">Reduced Motion</Label>
                <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
              </div>
              <Switch
                id="reduced-motion"
                checked={editedPreferences.reducedMotion}
                onCheckedChange={(checked) => setEditedPreferences(prev => ({ ...prev, reducedMotion: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Preferences</CardTitle>
          <CardDescription>
            Customize the layout and interface behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Reduce padding and spacing for denser layout</p>
            </div>
            <Switch
              id="compact-mode"
              checked={editedPreferences.compactMode}
              onCheckedChange={(checked) => setEditedPreferences(prev => ({ ...prev, compactMode: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sidebar-collapsed">Sidebar Collapsed by Default</Label>
              <p className="text-sm text-muted-foreground">Start with the sidebar in collapsed state</p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={editedPreferences.sidebarCollapsed}
              onCheckedChange={(checked) => setEditedPreferences(prev => ({ ...prev, sidebarCollapsed: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animations-enabled">Enable Animations</Label>
              <p className="text-sm text-muted-foreground">Show smooth transitions and animations</p>
            </div>
            <Switch
              id="animations-enabled"
              checked={editedPreferences.animationsEnabled}
              onCheckedChange={(checked) => setEditedPreferences(prev => ({ ...prev, animationsEnabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Theme Preview
          </CardTitle>
          <CardDescription>
            Preview how your theme preferences will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border rounded-lg p-6 space-y-4"
            style={{ 
              fontSize: editedPreferences.fontSize === 'small' ? '0.875rem' : 
                        editedPreferences.fontSize === 'large' ? '1.125rem' : '1rem',
              filter: editedPreferences.highContrast ? 'contrast(1.2)' : 'none'
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sample Dashboard</h3>
              <div 
                className="px-3 py-1 rounded-md text-white text-sm"
                style={{ backgroundColor: editedPreferences.accentColor }}
              >
                Primary Button
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-3 rounded">
                <div className="h-2 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-2 bg-muted-foreground/10 rounded w-2/3" />
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="h-2 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-2 bg-muted-foreground/10 rounded w-3/4" />
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="h-2 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-2 bg-muted-foreground/10 rounded w-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <div 
                className="flex-1 h-2 rounded"
                style={{ backgroundColor: editedPreferences.accentColor + '40' }}
              />
              <div className="flex-1 h-2 bg-muted rounded" />
              <div className="flex-1 h-2 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Theme'}
          </Button>
        </div>
      )}
    </div>
  );
}