import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExtensibilityManager } from '@/components/extensibility/ExtensibilityManager';
import { Rocket, Zap, Puzzle, Smartphone, Globe, Code2 } from 'lucide-react';

const RoadmapPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Future Roadmap & Extensibility</h1>
            <p className="text-muted-foreground">
              Explore upcoming features and extend your platform capabilities
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Rocket className="h-3 w-3 mr-1" />
              Innovation Hub
            </Badge>
          </div>
        </div>

        {/* Roadmap Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Mobile App
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="default" className="bg-success/10 text-success border-success/20">Ready</Badge>
                <p className="text-sm text-muted-foreground">
                  Native iOS & Android app with Capacitor integration
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="default" className="bg-success/10 text-success border-success/20">Ready</Badge>
                <p className="text-sm text-muted-foreground">
                  WebSocket-powered live data and notifications
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Puzzle className="h-5 w-5 mr-2" />
                Plugin System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="secondary">Beta</Badge>
                <p className="text-sm text-muted-foreground">
                  Extensible architecture with marketplace
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                API Gateway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">Planned</Badge>
                <p className="text-sm text-muted-foreground">
                  Enhanced API management and security
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Code2 className="h-5 w-5 mr-2" />
                Microservices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">Planned</Badge>
                <p className="text-sm text-muted-foreground">
                  Scalable microservices architecture
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                AI Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">Research</Badge>
                <p className="text-sm text-muted-foreground">
                  Machine learning-powered insights
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Extensibility Manager */}
        <ExtensibilityManager />

        {/* Development Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Mobile App Development Instructions</CardTitle>
            <CardDescription>
              Follow these steps to build and test the mobile application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Setup Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Export your project to GitHub using the "Export to GitHub" button</li>
                <li>Clone the repository locally and run <code className="bg-background px-1 rounded">npm install</code></li>
                <li>Add mobile platforms: <code className="bg-background px-1 rounded">npx cap add ios</code> and/or <code className="bg-background px-1 rounded">npx cap add android</code></li>
                <li>Update dependencies: <code className="bg-background px-1 rounded">npx cap update ios</code> or <code className="bg-background px-1 rounded">npx cap update android</code></li>
                <li>Build the project: <code className="bg-background px-1 rounded">npm run build</code></li>
                <li>Sync with native platforms: <code className="bg-background px-1 rounded">npx cap sync</code></li>
                <li>Run on device/emulator: <code className="bg-background px-1 rounded">npx cap run ios</code> or <code className="bg-background px-1 rounded">npx cap run android</code></li>
              </ol>
            </div>
            
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-primary">
                📱 <strong>Requirements:</strong> iOS development requires macOS with Xcode. Android development requires Android Studio.
                For more detailed instructions, visit our comprehensive mobile development guide.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoadmapPage;