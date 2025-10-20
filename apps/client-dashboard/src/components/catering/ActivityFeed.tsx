import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Package, 
  Star, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { useCateringPackages } from '@/hooks/useCateringPackages';

interface Activity {
  id: string;
  type: 'order' | 'package' | 'payment' | 'alert' | 'status';
  title: string;
  description?: string;
  timestamp: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  tenantId: string;
  limit?: number;
  showTimestamp?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * ActivityFeed Component
 * 
 * Displays a real-time feed of recent activities including:
 * - New catering orders
 * - Package updates (created, edited, marked popular)
 * - Status changes
 * - Important alerts
 * 
 * Uses existing hooks for data fetching.
 * 
 * @example
 * <ActivityFeed tenantId={tenant.id} limit={5} />
 */
export function ActivityFeed({ 
  tenantId, 
  limit = 10,
  showTimestamp = true,
  compact = false,
  className 
}: ActivityFeedProps) {
  // Use existing hooks instead of direct Supabase calls
  const { orders, isLoading: ordersLoading } = useCateringOrders(tenantId);
  const { packages, isLoading: packagesLoading } = useCateringPackages(tenantId);
  
  const isLoading = ordersLoading || packagesLoading;
  
  // Transform data to activities
  const activities = useMemo(() => {
    const result: Activity[] = [];
    
    // Get recent orders (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    (orders || [])
      .filter(order => new Date(order.created_at).getTime() > thirtyDaysAgo)
      .forEach(order => {
        const isNew = new Date(order.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isUrgent = order.status === 'inquiry' && isNew;
        
        result.push({
          id: `order-${order.id}`,
          type: 'order' as const,
          title: `New order from ${order.contact_name || 'Customer'}`,
          description: `${order.event_name || 'Event'} • ${order.guest_count} guests • $${((order.total_amount || 0) / 100).toFixed(0)}`,
          timestamp: new Date(order.created_at),
          priority: isUrgent ? 'urgent' : isNew ? 'high' : 'normal',
          status: getOrderStatus(order.status),
          metadata: { orderId: order.id, status: order.status },
        });
      });
    
    // Get recent packages (last 30 days)
    (packages || [])
      .filter(pkg => new Date(pkg.updated_at || pkg.created_at).getTime() > thirtyDaysAgo)
      .forEach(pkg => {
        const isNew = new Date(pkg.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        const wasRecentlyUpdated = pkg.updated_at && pkg.updated_at !== pkg.created_at && 
          new Date(pkg.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (isNew) {
          result.push({
            id: `package-created-${pkg.id}`,
            type: 'package' as const,
            title: `New package created: "${pkg.name}"`,
            description: `$${((pkg.price_per_person || pkg.base_price || 0) / 100).toFixed(0)} ${pkg.pricing_type === 'per_person' ? 'per person' : pkg.pricing_type === 'per_tray' ? 'per tray' : 'fixed'}`,
            timestamp: new Date(pkg.created_at),
            priority: 'normal',
            status: 'success',
            metadata: { packageId: pkg.id },
          });
        } else if (wasRecentlyUpdated && pkg.popular) {
          result.push({
            id: `package-popular-${pkg.id}`,
            type: 'package' as const,
            title: `"${pkg.name}" marked as popular`,
            description: 'Highlighted for customers',
            timestamp: new Date(pkg.updated_at!),
            priority: 'low',
            status: 'info',
            metadata: { packageId: pkg.id },
          });
        }
      });
    
    // Sort by timestamp and limit
    return result
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [orders, packages, limit]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ActivityItemSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }
  
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground mt-1">
          Activities will appear here as orders and packages are created
        </p>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-3', className)}>
      {activities.map(activity => (
        <ActivityItem 
          key={activity.id} 
          activity={activity} 
          showTimestamp={showTimestamp}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * Individual Activity Item
 */
interface ActivityItemProps {
  activity: Activity;
  showTimestamp?: boolean;
  compact?: boolean;
}

function ActivityItem({ activity, showTimestamp = true, compact = false }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.type, activity.status);
  const iconColor = getIconColor(activity.status);
  
  return (
    <div className="flex gap-3 items-start group hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
        iconColor
      )}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'font-medium',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {activity.title}
          </p>
          {activity.priority === 'urgent' && (
            <Badge variant="destructive" className="text-xs flex-shrink-0">
              Urgent
            </Badge>
          )}
          {activity.priority === 'high' && !compact && (
            <Badge className="text-xs flex-shrink-0 bg-orange-100 text-orange-700 hover:bg-orange-200">
              New
            </Badge>
          )}
        </div>
        
        {activity.description && (
          <p className={cn(
            'text-muted-foreground truncate',
            compact ? 'text-xs' : 'text-xs mt-0.5'
          )}>
            {activity.description}
          </p>
        )}
        
        {showTimestamp && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading Skeleton
 */
function ActivityItemSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className={cn('h-4', compact ? 'w-32' : 'w-48')} />
        <Skeleton className={cn('h-3', compact ? 'w-24' : 'w-36')} />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Helper Functions
 */
function getActivityIcon(type: Activity['type'], status?: Activity['status']) {
  if (status === 'error') return XCircle;
  if (status === 'warning') return AlertCircle;
  if (status === 'success') return CheckCircle;
  
  switch (type) {
    case 'order': return Package;
    case 'package': return Star;
    case 'payment': return DollarSign;
    case 'status': return TrendingUp;
    case 'alert': return AlertCircle;
    default: return Calendar;
  }
}

function getIconColor(status?: Activity['status']) {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    case 'error': return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    case 'warning': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
    case 'info': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getOrderStatus(status: string): Activity['status'] {
  switch (status) {
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    case 'inquiry': return 'warning';
    default: return 'info';
  }
}
