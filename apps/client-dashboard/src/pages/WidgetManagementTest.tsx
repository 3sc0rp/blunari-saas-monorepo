/**
 * Widget Management Test Page - Mock Integration Testing
 * Tests the hook-based architecture before database implementation
 */
import React, { useState, useEffect } from "react";
import { useMockWidgetManagement } from '@/hooks/useMockWidgetManagement';
import { useWidgetManagement } from '@/hooks/useWidgetManagement';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  ChefHat,
  Settings2,
  Wifi,
  WifiOff,
  Activity,
  Save,
  TestTube,
  Eye,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const WidgetManagementTest: React.FC = () => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [useMockMode, setUseMockMode] = useState(true);
  const [testConfig, setTestConfig] = useState({
    primaryColor: '#3b82f6',
    welcomeMessage: 'Test widget configuration'
  });
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Switch between mock and real hooks for testing
  const mockHook = useMockWidgetManagement({
    autoSave: true,
    autoSaveInterval: 5000, // Faster for testing
    enableAnalytics: true,
    simulateNetworkDelay: true,
    simulateErrors: false
  });

  // Try real hook (will fail until database is ready)
  const realHook = useWidgetManagement({
    autoSave: true,
    autoSaveInterval: 30000,
    enableAnalytics: true
  });

  // Check database availability on mount
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        setDatabaseStatus('checking');
        // Try to fetch widgets to test database availability
        const result = await realHook.refetchWidgets();
        setDatabaseStatus('available');
        if (useMockMode) {
          toast({
            title: "Database Available!",
            description: "Widget tables detected. You can now switch to Real Mode.",
            variant: "default"
          });
        }
      } catch (error) {
        setDatabaseStatus('unavailable');
        console.log('Database not ready yet:', error);
      }
    };

    if (tenant?.id) {
      checkDatabase();
    }
  }, [tenant?.id, toast, useMockMode]);

  const currentHook = (useMockMode || databaseStatus !== 'available') ? mockHook : realHook;

  const {
    widgets,
    loading,
    error,
    connected,
    analyticsConnected,
    analytics,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    getWidgetByType,
    saveWidgetConfig,
    markConfigChanged,
    toggleWidgetActive,
    getAnalyticsSummary,
    isOnline
  } = currentHook;

  const bookingWidget = getWidgetByType('booking');
  const cateringWidget = getWidgetByType('catering');

  const handleTestSave = async (type: 'booking' | 'catering') => {
    const result = await saveWidgetConfig(type, testConfig);
    
    if (result.success) {
      toast({
        title: "Test Save Successful",
        description: `${type} widget configuration saved successfully`,
        variant: "default"
      });
    } else {
      toast({
        title: "Test Save Failed",
        description: result.error || 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const handleMarkChanged = (type: 'booking' | 'catering') => {
    markConfigChanged(type, testConfig);
    toast({
      title: "Configuration Marked as Changed",
      description: `${type} widget marked as having unsaved changes`,
      variant: "default"
    });
  };

  const handleToggleActive = async (type: 'booking' | 'catering') => {
    const result = await toggleWidgetActive(type);
    
    if (result.success) {
      toast({
        title: "Widget Status Updated",
        description: `${type} widget active status toggled`,
        variant: "default"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Management Testing</h1>
          <p className="text-muted-foreground">
            Testing hook-based architecture before database implementation
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Database Status */}
          <Badge variant={databaseStatus === 'available' ? "default" : databaseStatus === 'checking' ? "secondary" : "outline"}>
            {databaseStatus === 'checking' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
            {databaseStatus === 'available' && <CheckCircle className="w-3 h-3 mr-1" />}
            {databaseStatus === 'unavailable' && <AlertCircle className="w-3 h-3 mr-1" />}
            Database: {databaseStatus === 'checking' ? 'Checking...' : databaseStatus === 'available' ? 'Ready' : 'Not Ready'}
          </Badge>
          
          {/* Mode Switcher */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="mock-mode">Mock Mode</Label>
            <Switch
              id="mock-mode"
              checked={useMockMode}
              onCheckedChange={setUseMockMode}
              disabled={databaseStatus !== 'available'}
            />
          </div>
          
          {/* Connection Status */}
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? (
              <Wifi className="w-3 h-3 mr-1" />
            ) : (
              <WifiOff className="w-3 h-3 mr-1" />
            )}
            {isOnline ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Status Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {useMockMode && (
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertTitle>Mock Mode Active</AlertTitle>
          <AlertDescription>
            Testing with simulated data. 
            {databaseStatus === 'available' 
              ? ' Switch to Real Mode to test with your database.' 
              : ' Database not ready - run the migration first.'}
          </AlertDescription>
        </Alert>
      )}

      {!useMockMode && databaseStatus === 'available' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Real Mode Active</AlertTitle>
          <AlertDescription>
            Connected to your database with real-time WebSocket subscriptions.
          </AlertDescription>
        </Alert>
      )}

      {/* Hook Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Hook Status & Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Connection Status</Label>
            <div className="flex items-center gap-2">
              {connected ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm">{connected ? "Connected" : "Disconnected"}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Analytics Status</Label>
            <div className="flex items-center gap-2">
              {analyticsConnected ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm">{analyticsConnected ? "Active" : "Inactive"}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Widgets Loaded</Label>
            <div className="text-lg font-semibold">{widgets.length}</div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Analytics Events</Label>
            <div className="text-lg font-semibold">{analytics.length}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="widgets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="widgets">Widget Testing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Testing</TabsTrigger>
          <TabsTrigger value="autosave">Auto-save Testing</TabsTrigger>
        </TabsList>

        {/* Widget Testing Tab */}
        <TabsContent value="widgets" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Booking Widget Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Booking Widget Test
                </CardTitle>
                <CardDescription>
                  Test booking widget configuration and state management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bookingWidget ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={bookingWidget.is_active ? "default" : "secondary"}>
                        {bookingWidget.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="booking-color">Primary Color</Label>
                      <Input
                        id="booking-color"
                        type="color"
                        value={testConfig.primaryColor}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-20 h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="booking-message">Welcome Message</Label>
                      <Input
                        id="booking-message"
                        value={testConfig.welcomeMessage}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        placeholder="Enter welcome message"
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkChanged('booking')}
                      >
                        Mark Changed
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleTestSave('booking')}
                        disabled={isSaving}
                      >
                        {isSaving ? <Save className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Test Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleToggleActive('booking')}
                      >
                        Toggle Active
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No booking widget found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Catering Widget Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-500" />
                  Catering Widget Test
                </CardTitle>
                <CardDescription>
                  Test catering widget configuration and state management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cateringWidget ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={cateringWidget.is_active ? "default" : "secondary"}>
                        {cateringWidget.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkChanged('catering')}
                      >
                        Mark Changed
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleTestSave('catering')}
                        disabled={isSaving}
                      >
                        {isSaving ? <Save className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Test Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleToggleActive('catering')}
                      >
                        Toggle Active
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No catering widget found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Testing Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {widgets.map(widget => {
              const analyticsSummary = getAnalyticsSummary(widget.id);
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {widget.widget_type} Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsSummary ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{analyticsSummary.totalViews}</div>
                          <div className="text-sm text-muted-foreground">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{analyticsSummary.totalInteractions}</div>
                          <div className="text-sm text-muted-foreground">Interactions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{analyticsSummary.totalConversions}</div>
                          <div className="text-sm text-muted-foreground">Conversions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{analyticsSummary.conversionRate.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Conversion Rate</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No analytics data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Auto-save Testing Tab */}
        <TabsContent value="autosave" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Auto-save Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {hasUnsavedChanges ? "Yes" : "No"}
                  </div>
                  <div className="text-sm text-muted-foreground">Unsaved Changes</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {isSaving ? "Saving..." : "Idle"}
                  </div>
                  <div className="text-sm text-muted-foreground">Save Status</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {lastSaved ? lastSaved.toLocaleTimeString() : "Never"}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Saved</div>
                </div>
              </div>
              
              <Separator />
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Auto-save Testing</AlertTitle>
                <AlertDescription>
                  Make changes using the "Mark Changed" buttons above to test auto-save functionality.
                  Changes should auto-save after 5 seconds in mock mode.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetManagementTest;
