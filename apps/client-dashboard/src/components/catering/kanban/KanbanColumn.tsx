import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KanbanColumnProps {
  id: string;
  title: string;
  description: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

/**
 * KanbanColumn Component
 * 
 * Droppable column container for kanban cards.
 * Highlights when dragging over to show valid drop zone.
 */
export function KanbanColumn({
  id,
  title,
  description,
  color,
  count,
  children,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        ref={setNodeRef}
        className={cn(
          'h-full transition-all duration-200',
          isOver && 'ring-2 ring-primary ring-offset-2 shadow-lg'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', color)} />
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardHeader>

        <CardContent className="space-y-3 min-h-[200px]">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
