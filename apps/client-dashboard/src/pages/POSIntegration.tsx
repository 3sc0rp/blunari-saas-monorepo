import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plug, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Key,
  Database,
  Zap,
  Clock
} from 'lucide-react';

interface POSIntegration {
  id: string;
  name: string;
  type: 'square' | 'toast' | 'clover' | 'lightspeed' | 'resy' | 'opentable';
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  features: string[];
  logo: string;
}

const POSIntegration: React.FC = () => {
  const [integrations] = useState<POSIntegration[]>([
    {
      id: '1',
      name: 'Square POS',
      type: 'square',
      status: 'connected',
      lastSync: '2024-01-15T10:30:00Z',
      features: ['Order Management', 'Payment Processing', 'Inventory Sync'],
      logo: '🟦'
    },
    {
      id: '2',
      name: 'Toast POS',
      type: 'toast',
      status: 'disconnected',
      lastSync: '2024-01-10T15:45:00Z',
      features: ['Menu Management', 'Order Tracking', 'Staff Management'],
      logo: '🍞'
    },
    {
      id: '3',
      name: 'OpenTable',
      type: 'opentable',
      status: 'error',
      lastSync: '2024-01-14T09:15:00Z',
      features: ['Reservation Sync', 'Guest Management', 'Waitlist'],
      logo: '🪑'
    }
  ]);

  const [availableIntegrations] = useState([
    { name: 'Clover', type: 'clover', logo: '☘️', description: 'Complete POS solution with inventory management' },
    { name: 'Lightspeed', type: 'lightspeed', logo: '⚡', description: 'Cloud-based POS for restaurants and retail' },
    { name: 'Resy', type: 'resy', logo: '🎯', description: 'Premium reservation and guest management platform' },
  ]);

  const getStatusColor = (status: POSIntegration['status']) => {
    switch (status) {
      case 'connected': return 'text-success';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: POSIntegration['status']) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'error': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-h1 font-bold text-foreground">POS Integrations</h1>
          <p className="text-muted-foreground">
            Connect your restaurant management system with popular POS platforms
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </motion.div>

      {/* Integration Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{integrations.length}</div>
              <div className="text-sm text-muted-foreground">Total Integrations</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {integrations.filter(i => i.status === 'connected').length}
              </div>
              <div className="text-sm text-muted-foreground">Connected</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {integrations.filter(i => i.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {integrations.filter(i => i.status === 'disconnected').length}
              </div>
              <div className="text-sm text-muted-foreground">Disconnected</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Integrations</TabsTrigger>
          <TabsTrigger value="available">Available Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {/* Active Integrations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {integrations.map((integration, index) => {
              const StatusIcon = getStatusIcon(integration.status);
              
              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{integration.logo}</div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusIcon className={`h-4 w-4 ${getStatusColor(integration.status)}`} />
                              <Badge 
                                variant={
                                  integration.status === 'connected' ? 'default' :
                                  integration.status === 'error' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {integration.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Features</h4>
                        <div className="flex flex-wrap gap-1">
                          {integration.features.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">Last Sync</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          {/* Available Integrations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {availableIntegrations.map((integration, index) => (
              <motion.div
                key={integration.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="text-4xl">{integration.logo}</div>
                      <div>
                        <h3 className="font-semibold text-lg">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {integration.description}
                        </p>
                      </div>
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Integration Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Integration Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-sync enabled</label>
                    <p className="text-xs text-muted-foreground">Automatically sync data every 15 minutes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Real-time notifications</label>
                    <p className="text-xs text-muted-foreground">Get notified of sync errors immediately</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Data validation</label>
                    <p className="text-xs text-muted-foreground">Validate data before syncing</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sync interval (minutes)</label>
                  <Input type="number" defaultValue="15" className="mt-2" min="5" max="60" />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Retry attempts</label>
                  <Input type="number" defaultValue="3" className="mt-2" min="1" max="10" />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input 
                    placeholder="https://your-app.com/webhooks/pos" 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button>
                Save Settings
              </Button>
              <Button variant="outline">
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default POSIntegration;