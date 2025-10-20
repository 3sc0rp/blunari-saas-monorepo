import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { KanbanColumn, KanbanCard } from './kanban';
import { useCateringOrders } from '@/hooks/useCateringOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OrderStatus = 'inquiry' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';

interface KanbanOrderBoardProps {
  tenantId: string;
  onOrderClick?: (orderId: string) => void;
  className?: string;
}

// Column configuration
const COLUMNS: { id: OrderStatus; title: string; color: string; description: string }[] = [
  {
    id: 'inquiry',
    title: 'Inquiry',
    color: 'bg-blue-500',
    description: 'New customer inquiries',
  },
  {
    id: 'quoted',
    title: 'Quoted',
    color: 'bg-yellow-500',
    description: 'Quote sent to customer',
  },
  {
    id: 'confirmed',
    title: 'Confirmed',
    color: 'bg-green-500',
    description: 'Order confirmed by customer',
  },
  {
    id: 'completed',
    title: 'Completed',
    color: 'bg-purple-500',
    description: 'Event completed',
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    color: 'bg-red-500',
    description: 'Order cancelled',
  },
];

/**
 * KanbanOrderBoard Component
 * 
 * Drag-and-drop kanban board for managing catering orders.
 * Orders can be dragged between columns to change their status.
 * 
 * Features:
 * - Drag-and-drop order cards between status columns
 * - Auto-save status changes to database
 * - Visual feedback during drag (opacity, shadows)
 * - Mobile-friendly touch interactions
 * - Real-time updates from Supabase
 * - Card actions: view, edit, delete, message
 * 
 * Columns:
 * - Inquiry: New customer requests
 * - Quoted: Quote sent, awaiting response
 * - Confirmed: Customer accepted, event scheduled
 * - Completed: Event successfully completed
 * - Cancelled: Order cancelled by customer or restaurant
 * 
 * @example
 * <KanbanOrderBoard 
 *   tenantId={tenant.id} 
 *   onOrderClick={(id) => router.push(`/orders/${id}`)}
 * />
 */
export function KanbanOrderBoard({ 
  tenantId, 
  onOrderClick,
  className 
}: KanbanOrderBoardProps) {
  const { orders, isLoading, refetch } = useCateringOrders(tenantId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, any[]> = {
      inquiry: [],
      quoted: [],
      confirmed: [],
      completed: [],
      cancelled: [],
    };

    orders?.forEach((order) => {
      if (grouped[order.status as OrderStatus]) {
        grouped[order.status as OrderStatus].push(order);
      }
    });

    // Sort by created date (newest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as OrderStatus].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return grouped;
  }, [orders]);

  // Get the active order being dragged
  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return orders?.find((order) => order.id === activeId);
  }, [activeId, orders]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const order = orders?.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // Optimistic update
    setIsSaving(true);

    try {
      // Update order status in database (with type assertion to work around Supabase type issues)
      const { error } = await (supabase as any)
        .from('catering_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Refetch orders to update UI
      await refetch();

      toast.success('Order status updated', {
        description: `Moved to ${COLUMNS.find((c) => c.id === newStatus)?.title}`,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status', {
        description: 'Please try again or contact support',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4', className)}>
        {COLUMNS.map((column) => (
          <Card key={column.id}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map((column) => {
            const columnOrders = ordersByStatus[column.id] || [];
            
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                description={column.description}
                color={column.color}
                count={columnOrders.length}
              >
                <SortableContext
                  items={columnOrders.map((o) => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence>
                    {columnOrders.map((order) => (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        onClick={() => onOrderClick?.(order.id)}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>

                {columnOrders.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    No orders in this stage
                  </div>
                )}
              </KanbanColumn>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOrder ? (
            <div className="opacity-80 rotate-3 shadow-2xl">
              <KanbanCard order={activeOrder} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Saving indicator */}
      {isSaving && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Saving changes...</span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * KanbanOrderBoardSkeleton
 * Loading state for kanban board
 */
export function KanbanOrderBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
