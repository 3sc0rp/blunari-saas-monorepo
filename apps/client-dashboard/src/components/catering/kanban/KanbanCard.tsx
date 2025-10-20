import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface KanbanCardProps {
  order: any;
  onClick?: () => void;
  isDragging?: boolean;
}

/**
 * KanbanCard Component
 * 
 * Draggable card representing a catering order.
 * Shows key order information and provides quick actions.
 */
export function KanbanCard({ order, onClick, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Determine if order is urgent (inquiry < 24 hours old)
  const isUrgent =
    order.status === 'inquiry' &&
    new Date().getTime() - new Date(order.created_at).getTime() < 24 * 60 * 60 * 1000;

  // Card content (reusable for both sortable and overlay)
  const cardContent = (
    <Card
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
        (isDragging || isSortableDragging) && 'opacity-50',
        isUrgent && 'border-orange-500 border-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm line-clamp-1">
              {order.contact_name || 'Unknown Customer'}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {order.event_name || 'Catering Event'}
            </p>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => e.stopPropagation()}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Event details */}
        <div className="space-y-2">
          {order.event_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(order.event_date), 'MMM dd, yyyy')}</span>
            </div>
          )}

          {order.guest_count && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{order.guest_count} guests</span>
            </div>
          )}

          {order.total_amount && (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <DollarSign className="h-3 w-3" />
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          )}
        </div>

        {/* Footer badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent && (
            <Badge variant="destructive" className="text-xs">
              Urgent
            </Badge>
          )}
          
          {order.created_at && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(order.created_at), 'MMM dd')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // If dragging overlay, return plain card
  if (isDragging) {
    return cardContent;
  }

  // Return sortable card
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      layout
    >
      {cardContent}
    </motion.div>
  );
}
