import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationsManager } from '@/components/integrations/IntegrationsManager';
import { APIManager } from '@/components/integrations/APIManager';
import { WebhookManager } from '@/components/integrations/WebhookManager';

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Platform Integrations</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Connect with external services, manage APIs, and configure webhooks for real-time notifications
          </p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations">External Integrations</TabsTrigger>
            <TabsTrigger value="api">API Management</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations">
            <IntegrationsManager />
          </TabsContent>

          <TabsContent value="api">
            <APIManager />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};