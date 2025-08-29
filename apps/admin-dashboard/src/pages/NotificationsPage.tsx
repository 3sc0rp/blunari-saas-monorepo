import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, Settings, Trash2 } from 'lucide-react';

const mockNotifications = [
  {
    id: '1',
    title: 'System Alert',
    message: 'High CPU usage detected on server cluster',
    type: 'warning',
    timestamp: '2 minutes ago',
    read: false
  },
  {
    id: '2',
    title: 'New Tenant Registration',
    message: 'Bella Vista Restaurant has completed onboarding',
    type: 'success',
    timestamp: '1 hour ago',
    read: false
  },
  {
    id: '3',
    title: 'Payment Failed',
    message: 'Monthly subscription payment failed for Ocean Breeze Bistro',
    type: 'error',
    timestamp: '3 hours ago',
    read: true
  }
];

export const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with platform activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>Latest platform alerts and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start justify-between p-4 rounded-lg border ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    <Badge
                      variant={
                        notification.type === 'error' ? 'destructive' :
                        notification.type === 'warning' ? 'secondary' : 'default'
                      }
                    >
                      {notification.type}
                    </Badge>
                    {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                  <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;