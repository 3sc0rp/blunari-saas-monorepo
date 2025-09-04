import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Zap, 
  CreditCard, 
  FileText, 
  Mail, 
  MessageSquare, 
  ShoppingCart,
  TrendingUp,
  Database,
  Smartphone,
  Globe,
  Check,
  AlertCircle,
  RefreshCw,
  Link,
  Key,
  TestTube
} from 'lucide-react';

interface APIIntegration {
  id: string;
  name: string;
  category: 'pos' | 'accounting' | 'marketing' | 'delivery' | 'analytics' | 'communication';
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  isEnabled: boolean;
  config: Record<string, any>;
  lastSync?: Date;
  syncFrequency: string;
  features: string[];
  webhookUrl?: string;
}

const integrations: APIIntegration[] = [
  {
    id: 'square-pos',
    name: 'Square POS',
    category: 'pos',
    description: 'Sync orders, payments, and inventory with Square POS system',
    icon: CreditCard,
    status: 'connected',
    isEnabled: true,
    config: { apiKey: '****-****-****', locationId: 'MAIN_LOC' },
    lastSync: new Date(Date.now() - 300000),
    syncFrequency: 'Real-time',
    features: ['Order Sync', 'Payment Processing', 'Inventory Sync', 'Customer Data'],
    webhookUrl: 'https://api.blunari.com/webhooks/square'
  },
  {
    id: 'toast-pos',
    name: 'Toast POS',
    category: 'pos',
    description: 'Complete Toast POS integration for enterprise restaurants',
    icon: ShoppingCart,
    status: 'disconnected',
    isEnabled: false,
    config: {},
    syncFrequency: 'Real-time',
    features: ['Order Management', 'Menu Sync', 'Staff Management', 'Analytics']
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    description: 'Automated accounting and financial reporting',
    icon: FileText,
    status: 'connected',
    isEnabled: true,
    config: { companyId: 'QB_COMP_123', accessToken: '****' },
    lastSync: new Date(Date.now() - 3600000),
    syncFrequency: 'Daily',
    features: ['Invoice Sync', 'Expense Tracking', 'Financial Reports', 'Tax Preparation']
  },
  {
    id: 'xero',
    name: 'Xero Accounting',
    category: 'accounting',
    description: 'Cloud-based accounting platform integration',
    icon: Database,
    status: 'error',
    isEnabled: true,
    config: { tenantId: 'XERO_TENANT_456' },
    syncFrequency: 'Daily',
    features: ['Bookkeeping', 'Invoicing', 'Bank Reconciliation', 'Financial Reports']
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    description: 'Email marketing automation and customer campaigns',
    icon: Mail,
    status: 'connected',
    isEnabled: true,
    config: { apiKey: '****-us1', listId: 'MAIN_LIST' },
    lastSync: new Date(Date.now() - 1800000),
    syncFrequency: 'Hourly',
    features: ['Email Campaigns', 'Customer Segmentation', 'Marketing Automation', 'Analytics']
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    category: 'marketing',
    description: 'Customer relationship management and marketing automation',
    icon: TrendingUp,
    status: 'disconnected',
    isEnabled: false,
    config: {},
    syncFrequency: 'Real-time',
    features: ['Lead Management', 'Email Marketing', 'Sales Pipeline', 'Customer Analytics']
  },
  {
    id: 'uber-eats',
    name: 'Uber Eats',
    category: 'delivery',
    description: 'Food delivery platform integration',
    icon: Smartphone,
    status: 'connected',
    isEnabled: true,
    config: { storeId: 'UBER_STORE_789', apiKey: '****' },
    lastSync: new Date(Date.now() - 900000),
    syncFrequency: 'Real-time',
    features: ['Order Management', 'Menu Sync', 'Delivery Tracking', 'Revenue Analytics']
  },
  {
    id: 'doordash',
    name: 'DoorDash',
    category: 'delivery',
    description: 'DoorDash delivery platform integration',
    icon: Globe,
    status: 'syncing',
    isEnabled: true,
    config: { merchantId: 'DD_MERCHANT_101' },
    lastSync: new Date(Date.now() - 600000),
    syncFrequency: 'Real-time',
    features: ['Order Sync', 'Driver Tracking', 'Performance Metrics', 'Customer Feedback']
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'analytics',
    description: 'Advanced web analytics and customer insights',
    icon: TrendingUp,
    status: 'connected',
    isEnabled: true,
    config: { propertyId: 'GA_PROP_456', measurementId: 'G-XXXXXXXXXX' },
    lastSync: new Date(Date.now() - 1200000),
    syncFrequency: 'Hourly',
    features: ['Website Analytics', 'Customer Journey', 'Conversion Tracking', 'Custom Reports']
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    category: 'communication',
    description: 'SMS marketing and customer communication',
    icon: MessageSquare,
    status: 'connected',
    isEnabled: true,
    config: { accountSid: 'AC****', authToken: '****' },
    lastSync: new Date(Date.now() - 300000),
    syncFrequency: 'Real-time',
    features: ['SMS Marketing', 'Order Notifications', 'Reservation Alerts', 'Customer Support']
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return 'bg-green-500';
    case 'disconnected': return 'bg-gray-400';
    case 'error': return 'bg-red-500';
    case 'syncing': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected': return 'Connected';
    case 'disconnected': return 'Disconnected';
    case 'error': return 'Error';
    case 'syncing': return 'Syncing...';
    default: return 'Unknown';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'pos': return 'bg-blue-100 text-blue-800';
    case 'accounting': return 'bg-green-100 text-green-800';
    case 'marketing': return 'bg-purple-100 text-purple-800';
    case 'delivery': return 'bg-orange-100 text-orange-800';
    case 'analytics': return 'bg-indigo-100 text-indigo-800';
    case 'communication': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function APIIntegrationHub() {
  const [selectedIntegration, setSelectedIntegration] = useState<APIIntegration | null>(null);
  const [integrationsData, setIntegrationsData] = useState(integrations);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configData, setConfigData] = useState<Record<string, string>>({});

  const categories = [
    { id: 'all', label: 'All Integrations', count: integrationsData.length },
    { id: 'pos', label: 'POS Systems', count: integrationsData.filter(i => i.category === 'pos').length },
    { id: 'accounting', label: 'Accounting', count: integrationsData.filter(i => i.category === 'accounting').length },
    { id: 'marketing', label: 'Marketing', count: integrationsData.filter(i => i.category === 'marketing').length },
    { id: 'delivery', label: 'Delivery', count: integrationsData.filter(i => i.category === 'delivery').length },
    { id: 'analytics', label: 'Analytics', count: integrationsData.filter(i => i.category === 'analytics').length },
    { id: 'communication', label: 'Communication', count: integrationsData.filter(i => i.category === 'communication').length }
  ];

  const filteredIntegrations = activeCategory === 'all' 
    ? integrationsData 
    : integrationsData.filter(i => i.category === activeCategory);

  const connectedCount = integrationsData.filter(i => i.status === 'connected').length;
  const errorCount = integrationsData.filter(i => i.status === 'error').length;

  const handleToggleIntegration = (integrationId: string) => {
    setIntegrationsData(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, isEnabled: !integration.isEnabled }
        : integration
    ));
  };

  const handleConnect = (integration: APIIntegration) => {
    setSelectedIntegration(integration);
    setConfigData(integration.config || {});
    setIsConfiguring(true);
  };

  const handleSaveConfig = () => {
    if (selectedIntegration) {
      setIntegrationsData(prev => prev.map(integration => 
        integration.id === selectedIntegration.id
          ? { 
              ...integration, 
              config: configData, 
              status: 'connected',
              lastSync: new Date()
            }
          : integration
      ));
    }
    setIsConfiguring(false);
    setSelectedIntegration(null);
  };

  const handleTestConnection = async (integration: APIIntegration) => {
    // Simulate API test
    setIntegrationsData(prev => prev.map(i => 
      i.id === integration.id ? { ...i, status: 'syncing' } : i
    ));
    
    setTimeout(() => {
      setIntegrationsData(prev => prev.map(i => 
        i.id === integration.id ? { ...i, status: 'connected', lastSync: new Date() } : i
      ));
    }, 2000);
  };

  const handleSync = (integration: APIIntegration) => {
    setIntegrationsData(prev => prev.map(i => 
      i.id === integration.id ? { ...i, status: 'syncing' } : i
    ));
    
    setTimeout(() => {
      setIntegrationsData(prev => prev.map(i => 
        i.id === integration.id ? { ...i, status: 'connected', lastSync: new Date() } : i
      ));
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Integration Hub</h1>
          <p className="text-muted-foreground">
            Connect and manage all your restaurant's external services and APIs
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Add Integration
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{integrationsData.length}</p>
                <p className="text-xs text-muted-foreground">Total Integrations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <RefreshCw className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-xs text-muted-foreground">Real-time Sync</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => {
              const IconComponent = integration.icon;
              return (
                <Card key={integration.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryColor(integration.category)}>
                              {integration.category.toUpperCase()}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(integration.status)}`} />
                              <span className="text-xs text-muted-foreground">
                                {getStatusText(integration.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={() => handleToggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{integration.description}</CardDescription>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {integration.lastSync && (
                      <div className="text-xs text-muted-foreground">
                        Last sync: {integration.lastSync.toLocaleString()}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleSync(integration)}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sync
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleConnect(integration)}>
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => handleConnect(integration)}>
                          <Link className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleTestConnection(integration)}>
                        <TestTube className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      {isConfiguring && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Configure {selectedIntegration.name}</CardTitle>
              <CardDescription>
                Enter your API credentials and configuration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedIntegration.category === 'pos' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={configData.apiKey || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationId">Location ID</Label>
                    <Input
                      id="locationId"
                      placeholder="Enter location ID"
                      value={configData.locationId || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, locationId: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {selectedIntegration.category === 'accounting' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Company ID</Label>
                    <Input
                      id="companyId"
                      placeholder="Enter company ID"
                      value={configData.companyId || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, companyId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      placeholder="Enter access token"
                      value={configData.accessToken || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, accessToken: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {selectedIntegration.category === 'marketing' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={configData.apiKey || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listId">List ID</Label>
                    <Input
                      id="listId"
                      placeholder="Enter list ID"
                      value={configData.listId || ''}
                      onChange={(e) => setConfigData(prev => ({ ...prev, listId: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Your API credentials are encrypted and stored securely. They are only used to connect to your external services.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                <Button onClick={handleSaveConfig} className="flex-1">
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={() => setIsConfiguring(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
