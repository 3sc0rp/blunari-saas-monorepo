import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GripVertical,
  Edit2,
  Trash2,
  Check,
  X,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface MenuItemCardProps {
  item: MenuItem;
  onUpdate?: (item: MenuItem) => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

const DIETARY_TAGS = [
  { value: 'vegetarian', label: 'Vegetarian', color: 'bg-green-100 text-green-800' },
  { value: 'vegan', label: 'Vegan', color: 'bg-green-200 text-green-900' },
  { value: 'gluten-free', label: 'Gluten-Free', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'dairy-free', label: 'Dairy-Free', color: 'bg-blue-100 text-blue-800' },
  { value: 'nut-free', label: 'Nut-Free', color: 'bg-orange-100 text-orange-800' },
  { value: 'halal', label: 'Halal', color: 'bg-purple-100 text-purple-800' },
  { value: 'kosher', label: 'Kosher', color: 'bg-indigo-100 text-indigo-800' },
];

/**
 * MenuItemCard Component
 * 
 * Sortable card representing a menu item.
 * Supports inline editing, dietary tags, and availability toggle.
 */
export function MenuItemCard({
  item,
  onUpdate,
  onDelete,
  isDragging = false,
}: MenuItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Format currency
  const formatCurrency = (cents?: number) => {
    if (!cents) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Save edits
  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedItem);
    }
    setIsEditing(false);
  };

  // Cancel edits
  const handleCancel = () => {
    setEditedItem(item);
    setIsEditing(false);
  };

  // Toggle dietary tag
  const toggleDietaryTag = (tag: string) => {
    const tags = editedItem.dietary_tags || [];
    const newTags = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags, tag];
    
    setEditedItem({
      ...editedItem,
      dietary_tags: newTags,
    });
  };

  // Card content
  const cardContent = (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50',
        !item.available && 'bg-muted'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Item content */}
          <div className="flex-1 space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  placeholder="Item name"
                  className="h-8"
                />
                
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="min-h-[60px]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="price" className="text-xs">Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        value={(editedItem.price || 0) / 100}
                        onChange={(e) => setEditedItem({ 
                          ...editedItem, 
                          price: Math.round(parseFloat(e.target.value) * 100) 
                        })}
                        placeholder="0.00"
                        className="h-8 pl-7"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="available" className="text-xs">Available</Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch
                        id="available"
                        checked={editedItem.available}
                        onCheckedChange={(checked) => 
                          setEditedItem({ ...editedItem, available: checked })
                        }
                      />
                      <span className="text-xs">
                        {editedItem.available ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Dietary Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_TAGS.map((tag) => (
                      <Badge
                        key={tag.value}
                        variant={editedItem.dietary_tags?.includes(tag.value) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer text-xs',
                          editedItem.dietary_tags?.includes(tag.value) && tag.color
                        )}
                        onClick={() => toggleDietaryTag(tag.value)}
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-sm text-primary ml-2">
                    {formatCurrency(item.price)}
                  </span>
                </div>

                {/* Dietary tags */}
                {item.dietary_tags && item.dietary_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.dietary_tags.map((tag) => {
                      const tagInfo = DIETARY_TAGS.find(t => t.value === tag);
                      return (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className={cn('text-xs', tagInfo?.color)}
                        >
                          {tagInfo?.label || tag}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Status */}
                {!item.available && (
                  <Badge variant="destructive" className="text-xs">
                    Unavailable
                  </Badge>
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
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      {cardContent}
    </motion.div>
  );
}
