import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  Settings,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Monitor,
  Zap,
  Database,
  ExternalLink,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface POSProvider {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  status: string;
  event_types: any; // Can be string[] or Json from Supabase
  configuration_schema: any;
}

interface POSIntegration {
  id: string;
  tenant_id: string;
  provider_id: string;
  integration_name: string;
  status: string; // Allow any string from database
  health_status: string; // Allow any string from database
  last_sync_at?: string;
  last_health_check?: string;
  error_message?: string;
  pos_providers: POSProvider;
}

interface POSEvent {
  id: string;
  event_type: string;
  event_source: string;
  processed: boolean;
  created_at: string;
  error_message?: string;
  pos_integrations: {
    integration_name: string;
    pos_providers: { name: string };
  };
}

interface HealthCheckResult {
  integration_id: string;
  integration_name: string;
  provider: string;
  health_status: string;
  response_time_ms?: number;
  error_message?: string;
}

export default function POSSystemsPage() {
  const [providers, setProviders] = useState<POSProvider[]>([]);
  const [integrations, setIntegrations] = useState<POSIntegration[]>([]);
  const [events, setEvents] = useState<POSEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<POSProvider | null>(null);
  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPOSData();
    setupRealtimeSubscriptions();
  }, []);

  const loadPOSData = async () => {
    try {
      setLoading(true);

      // Load providers
      const { data: providersData, error: providersError } = await supabase
        .from('pos_providers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (providersError) throw providersError;

      // Load integrations
      const { data: integrationsData, error: integrationsError } = await supabase
        .from('pos_integrations')
        .select(`
          *,
          pos_providers!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (integrationsError) throw integrationsError;

      // Load recent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('pos_events')
        .select(`
          *,
          pos_integrations!inner(
            integration_name,
            pos_providers!inner(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      setProviders(providersData || []);
      setIntegrations(integrationsData || []);
      setEvents(eventsData || []);

    } catch (error: any) {
      console.error('Error loading POS data:', error);
      toast({
        title: "Error",
        description: "Failed to load POS systems data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const integrationsChannel = supabase
      .channel('pos-integrations-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pos_integrations' },
        () => {
          loadPOSData();
          toast({
            title: "Live Update",
            description: "POS integration status updated",
          });
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('pos-events-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pos_events' },
        () => {
          loadPOSData();
          toast({
            title: "New POS Event",
            description: "A new POS event has been received",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(integrationsChannel);
      supabase.removeChannel(eventsChannel);
    };
  };

  const runHealthCheck = async (integrationId?: string) => {
    try {
      setHealthChecking(true);
      
      const { data, error } = await supabase.functions.invoke('pos-health-monitor', {
        body: {
          integration_id: integrationId,
          check_all: !integrationId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Health Check Complete",
          description: integrationId 
            ? "Integration health check completed"
            : `Checked ${data.results?.length || 0} integrations`,
        });
        
        // Refresh data to show updated health status
        await loadPOSData();
      }

    } catch (error: any) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: error.message || "Failed to run health check",
        variant: "destructive"
      });
    } finally {
      setHealthChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { variant: 'default' as const, label: 'Connected' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      error: { variant: 'destructive' as const, label: 'Error' },
      disabled: { variant: 'outline' as const, label: 'Disabled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getHealthIcon = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'unhealthy':
        return <WifiOff className="h-4 w-4 text-destructive" />;
      default:
        return <Wifi className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProviderLogo = (provider: POSProvider) => {
    // In a real app, these would be actual logos
    const logos: Record<string, string> = {
      'toast': '🍞',
      'square': '🔲',
      'clover': '🍀',
      'resy': '🎯',
      'opentable': '📋',
      'custom': '⚙️'
    };
    return logos[provider.slug] || '📱';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">POS Systems</h1>
            <p className="text-muted-foreground">Manage point-of-sale integrations</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">POS Systems</h1>
            <p className="text-muted-foreground">
              Manage point-of-sale integrations across all tenants
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runHealthCheck()}
              disabled={healthChecking}
            >
              {healthChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Check All Health
            </Button>
            <Button variant="default" onClick={() => setShowAddIntegration(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{integrations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === 'connected').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy</CardTitle>
              <Activity className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.health_status === 'healthy').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Today</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter(e => {
                  const today = new Date().toDateString();
                  return new Date(e.created_at).toDateString() === today;
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="events">Recent Events</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            {integrations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No POS Integrations</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Connect your first POS system to start receiving events and managing orders.
                  </p>
                  <Button onClick={() => setShowAddIntegration(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {integrations.map((integration) => (
                  <Card key={integration.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getProviderLogo(integration.pos_providers)}
                          </span>
                          <div>
                            <CardTitle className="text-base">
                              {integration.integration_name}
                            </CardTitle>
                            <CardDescription>
                              {integration.pos_providers.name}
                            </CardDescription>
                          </div>
                        </div>
                        {getHealthIcon(integration.health_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {getStatusBadge(integration.status)}
                      </div>
                      
                      {integration.last_sync_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last Sync</span>
                          <span className="text-sm">
                            {new Date(integration.last_sync_at).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {integration.error_message && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {integration.error_message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runHealthCheck(integration.id)}
                          disabled={healthChecking}
                        >
                          {healthChecking ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Activity className="h-3 w-3" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Card key={provider.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getProviderLogo(provider)}</span>
                      <div>
                        <CardTitle>{provider.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {provider.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(provider.event_types) ? provider.event_types : []).slice(0, 3).map((eventType: string) => (
                        <Badge key={eventType} variant="secondary" className="text-xs">
                          {eventType.replace('_', ' ')}
                        </Badge>
                      ))}
                      {(Array.isArray(provider.event_types) ? provider.event_types : []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(Array.isArray(provider.event_types) ? provider.event_types : []).length - 3} more
                        </Badge>
                      )}
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowAddIntegration(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent POS Events</CardTitle>
                <CardDescription>
                  Latest events received from connected POS systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            event.processed ? 'bg-success' : 'bg-warning'
                          }`} />
                          <div>
                            <div className="font-medium text-sm">
                              {event.event_type.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.pos_integrations.pos_providers.name} • {event.pos_integrations.integration_name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                          <Badge variant={event.processed ? "default" : "secondary"} className="text-xs">
                            {event.processed ? "Processed" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No events received yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Health Check Tools</CardTitle>
                  <CardDescription>
                    Diagnose connection issues and test integration health
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => runHealthCheck()}
                    disabled={healthChecking}
                  >
                    {healthChecking ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Activity className="h-4 w-4 mr-2" />
                    )}
                    Run All Health Checks
                  </Button>
                  <Button className="w-full" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Replay Failed Events
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Monitor className="h-4 w-4 mr-2" />
                    Test Webhook Delivery
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Connection Diagnostics</CardTitle>
                  <CardDescription>
                    Advanced tools for debugging integration issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    View Webhook Logs
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Event Replay Console
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Reset Credentials
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}