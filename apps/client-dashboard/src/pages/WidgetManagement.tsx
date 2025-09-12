import React, { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Settings2 as Settings,
  Calendar,
  ChefHat,
  Eye,
  BarChart3,
  Code2 as Code,
  Copy,
  Loader2,
} from 'lucide-react';

interface WidgetConfig {
  theme: 'light' | 'dark';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  welcomeMessage: string;
  buttonText: string;
  showLogo: boolean;
}

const WidgetManagement: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const [selectedTab, setSelectedTab] = useState('configure');
  const [isLoading, setIsLoading] = useState(false);

  const [bookingConfig, setBookingConfig] = useState<WidgetConfig>({
    theme: 'light',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Book your table with us!',
    buttonText: 'Reserve Now',
    showLogo: true,
  });

  const [cateringConfig, setCateringConfig] = useState<WidgetConfig>({
    theme: 'light',
    primaryColor: '#f97316',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: 'Order catering for your event!',
    buttonText: 'Order Catering',
    showLogo: true,
  });

  const generateWidgetUrl = (type: 'booking' | 'catering') => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/widget/${type}?tenant=${tenant?.id}`;
  };

  const generateEmbedCode = (type: 'booking' | 'catering') => {
    const url = generateWidgetUrl(type);
    return `<iframe src="${url}" width="400" height="600" frameborder="0"></iframe>`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      setIsLoading(true);
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentConfig = activeWidgetType === 'booking' ? bookingConfig : cateringConfig;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Widget Management</h1>
            <p className="text-muted-foreground">
              Configure, preview, and deploy your widgets
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="widget-type">Active Widget:</Label>
          <Select value={activeWidgetType} onValueChange={(value: 'booking' | 'catering') => setActiveWidgetType(value)}>
            <SelectTrigger id="widget-type" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="booking">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Booking
                </div>
              </SelectItem>
              <SelectItem value="catering">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  Catering
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Customize your {activeWidgetType} widget settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <input
                    className="w-full p-2 border rounded"
                    value={currentConfig.welcomeMessage}
                    onChange={(e) => {
                      if (activeWidgetType === 'booking') {
                        setBookingConfig({...bookingConfig, welcomeMessage: e.target.value});
                      } else {
                        setCateringConfig({...cateringConfig, welcomeMessage: e.target.value});
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <input
                    className="w-full p-2 border rounded"
                    value={currentConfig.buttonText}
                    onChange={(e) => {
                      if (activeWidgetType === 'booking') {
                        setBookingConfig({...bookingConfig, buttonText: e.target.value});
                      } else {
                        setCateringConfig({...cateringConfig, buttonText: e.target.value});
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Preview</CardTitle>
              <CardDescription>
                Preview your {activeWidgetType} widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 text-center">
                <h3 className="text-lg font-semibold mb-2">{currentConfig.welcomeMessage}</h3>
                <Button style={{backgroundColor: currentConfig.primaryColor}}>
                  {currentConfig.buttonText}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embed Tab */}
        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Integration</CardTitle>
              <CardDescription>
                Copy and paste this code to embed the {activeWidgetType} widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Widget URL</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-gray-50 border rounded font-mono text-sm break-all">
                    {generateWidgetUrl(activeWidgetType)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateWidgetUrl(activeWidgetType), 'Widget URL')}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="flex gap-2">
                  <pre className="flex-1 p-3 bg-gray-50 border rounded text-xs overflow-auto">
                    {generateEmbedCode(activeWidgetType)}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateEmbedCode(activeWidgetType), 'Embed Code')}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetManagement;
