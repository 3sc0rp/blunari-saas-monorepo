/**
 * Example usage of the hybrid approach:
 * Global connection management + Component-level hooks
 */
import React from 'react';
import { useOrdersRealtime, useMenuItemsRealtime } from '@/hooks/useRealtimeSubscription';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export const OrdersDashboard: React.FC = () => {
  const { tenant } = useTenant();
  
  // Use hooks for component-specific subscriptions
      const { 
    data: orders, 
    loading: ordersLoading, 
    error: ordersError,
    connected: ordersConnected 
  } = useOrdersRealtime(tenant?.id);

  const { 
    data: menuItems, 
    loading: menuLoading,
    connected: menuConnected 
  } = useMenuItemsRealtime(tenant?.id);

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading real-time data...</span>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="p-4 text-red-600">
        Error loading orders: {ordersError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center space-x-4">
        <Badge variant={ordersConnected ? "default" : "destructive"}>
          Orders: {ordersConnected ? "Connected" : "Disconnected"}
        </Badge>
        <Badge variant={menuConnected ? "default" : "destructive"}>
          Menu: {menuConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Live Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Live Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">Order #{order.order_number}</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name}
                    </p>
                  </div>
                  <Badge variant={getOrderStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Items Status */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items ({menuItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.slice(0, 6).map((item: any) => (
              <div key={item.id} className="p-3 border rounded-lg">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  ${item.price}
                </p>
                <Badge variant={item.available ? "default" : "secondary"}>
                  {item.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function getOrderStatusVariant(status: string) {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'preparing':
      return 'default';
    case 'ready':
      return 'outline';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

