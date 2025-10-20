import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuItemCard } from './MenuItemCard';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category_id: string;
  sort_order: number;
  available: boolean;
  dietary_tags?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  items: MenuItem[];
}

interface MenuCategoryProps {
  category: Category;
  onUpdate?: (category: Category) => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

/**
 * MenuCategory Component
 * 
 * Sortable category card that contains draggable menu items.
 * Supports inline editing, collapsing, and item management.
 */
export function MenuCategory({
  category,
  onUpdate,
  onDelete,
  isDragging = false,
}: MenuCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [editedDescription, setEditedDescription] = useState(category.description || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Save category edits
  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...category,
        name: editedName,
        description: editedDescription,
      });
    }
    setIsEditing(false);
  };

  // Cancel edits
  const handleCancel = () => {
    setEditedName(category.name);
    setEditedDescription(category.description || '');
    setIsEditing(false);
  };

  // Add new item to category
  const handleAddItem = () => {
    const newItem: MenuItem = {
      id: `temp-item-${Date.now()}`,
      name: 'New Item',
      description: '',
      price: 0,
      category_id: category.id,
      sort_order: category.items.length,
      available: true,
      dietary_tags: [],
    };
    
    if (onUpdate) {
      onUpdate({
        ...category,
        items: [...category.items, newItem],
      });
    }
  };

  // Update item
  const handleUpdateItem = (updatedItem: MenuItem) => {
    if (onUpdate) {
      onUpdate({
        ...category,
        items: category.items.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      });
    }
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    if (onUpdate) {
      onUpdate({
        ...category,
        items: category.items.filter(item => item.id !== itemId),
      });
    }
  };

  // Card content
  const cardContent = (
    <Card
      className={cn(
        'transition-all',
        (isDragging || isSortableDragging) && 'opacity-50'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Expand/collapse button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {/* Category info */}
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Category name"
                  className="h-8"
                />
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="min-h-[60px]"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {category.items.length} items
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Items list */}
      {isExpanded && (
        <CardContent className="space-y-3">
          <SortableContext
            items={category.items.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {category.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </SortableContext>

          {/* Add item button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      )}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      {cardContent}
    </motion.div>
  );
}
