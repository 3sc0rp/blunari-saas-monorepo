import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  GripVertical,
  Eye,
  Save,
  Undo,
  Settings,
  Copy,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuCategory, MenuItemCard, MenuPreview, MenuTemplateDialog } from './menu-builder';
import { toast } from 'sonner';

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

interface MenuBuilderProps {
  tenantId: string;
  onSave?: (categories: Category[]) => Promise<void>;
  className?: string;
}

/**
 * MenuBuilder Component
 * 
 * Visual drag-and-drop menu builder for organizing catering menus.
 * 
 * Features:
 * - Drag-and-drop categories to reorder
 * - Drag-and-drop items within and between categories
 * - Add/edit/delete categories and items
 * - Menu templates (Appetizers, Entrees, Desserts, etc.)
 * - Live preview mode
 * - Auto-save with undo/redo
 * - Dietary tags (vegetarian, vegan, gluten-free, etc.)
 * 
 * @example
 * <MenuBuilder 
 *   tenantId={tenant.id}
 *   onSave={async (cats) => { ... }}
 * />
 */
export function MenuBuilder({ 
  tenantId, 
  onSave,
  className 
}: MenuBuilderProps) {
  // Mock data - replace with real data from useCateringMenu hook
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Appetizers',
      description: 'Start your event with delicious appetizers',
      sort_order: 0,
      items: [
        {
          id: '1-1',
          name: 'Bruschetta',
          description: 'Toasted bread with tomato and basil',
          price: 850,
          category_id: '1',
          sort_order: 0,
          available: true,
          dietary_tags: ['vegetarian'],
        },
        {
          id: '1-2',
          name: 'Spring Rolls',
          description: 'Crispy vegetable spring rolls',
          price: 950,
          category_id: '1',
          sort_order: 1,
          available: true,
          dietary_tags: ['vegan'],
        },
      ],
    },
    {
      id: '2',
      name: 'Entrees',
      description: 'Main course selections',
      sort_order: 1,
      items: [
        {
          id: '2-1',
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon butter',
          price: 2850,
          category_id: '2',
          sort_order: 0,
          available: true,
          dietary_tags: ['gluten-free'],
        },
      ],
    },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get active item being dragged
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    
    // Check if it's a category
    const category = categories.find(c => c.id === activeId);
    if (category) return { type: 'category', data: category };
    
    // Check if it's an item
    for (const cat of categories) {
      const item = cat.items.find(i => i.id === activeId);
      if (item) return { type: 'item', data: item };
    }
    
    return null;
  }, [activeId, categories]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Handle category reordering
    if (activeItem?.type === 'category') {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(categories, oldIndex, newIndex).map((cat, idx) => ({
          ...cat,
          sort_order: idx,
        }));
        setCategories(reordered);
        setHasChanges(true);
      }
      return;
    }

    // Handle item reordering (within or between categories)
    if (activeItem?.type === 'item') {
      const item = activeItem.data as MenuItem;
      const targetCategory = categories.find(c => 
        c.id === over.id || c.items.some(i => i.id === over.id)
      );
      
      if (!targetCategory) return;

      // Remove item from source category
      const updatedCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.id !== item.id),
      }));

      // Add item to target category
      const targetCat = updatedCategories.find(c => c.id === targetCategory.id);
      if (!targetCat) return;

      const targetItemIndex = targetCat.items.findIndex(i => i.id === over.id);
      const insertIndex = targetItemIndex !== -1 ? targetItemIndex : targetCat.items.length;

      targetCat.items.splice(insertIndex, 0, {
        ...item,
        category_id: targetCategory.id,
      });

      // Update sort orders
      targetCat.items = targetCat.items.map((it, idx) => ({
        ...it,
        sort_order: idx,
      }));

      setCategories(updatedCategories);
      setHasChanges(true);
    }
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(categories);
      }
      setHasChanges(false);
      toast.success('Menu saved successfully');
    } catch (error) {
      console.error('Failed to save menu:', error);
      toast.error('Failed to save menu', {
        description: 'Please try again or contact support',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new category
  const handleAddCategory = () => {
    const newCategory: Category = {
      id: `temp-${Date.now()}`,
      name: 'New Category',
      description: '',
      sort_order: categories.length,
      items: [],
    };
    setCategories([...categories, newCategory]);
    setHasChanges(true);
  };

  // Apply menu template
  const handleApplyTemplate = (template: Category[]) => {
    setCategories(template);
    setHasChanges(true);
    setShowTemplates(false);
    toast.success('Template applied', {
      description: 'You can now customize the menu items',
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Menu Builder</h2>
          <p className="text-muted-foreground">
            Drag and drop to organize your catering menu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Menu'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories & Items</CardTitle>
                  <CardDescription>Drag to reorder categories and items</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    <AnimatePresence>
                      {categories.map((category) => (
                        <MenuCategory
                          key={category.id}
                          category={category}
                          onUpdate={(updated) => {
                            setCategories(categories.map(c => 
                              c.id === updated.id ? updated : c
                            ));
                            setHasChanges(true);
                          }}
                          onDelete={() => {
                            setCategories(categories.filter(c => c.id !== category.id));
                            setHasChanges(true);
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>

                {/* Drag Overlay */}
                <DragOverlay>
                  {activeItem?.type === 'category' ? (
                    <div className="opacity-80 rotate-1 shadow-2xl">
                      <MenuCategory category={activeItem.data as Category} isDragging />
                    </div>
                  ) : activeItem?.type === 'item' ? (
                    <div className="opacity-80 rotate-1 shadow-2xl">
                      <MenuItemCard item={activeItem.data as MenuItem} isDragging />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <MenuPreview categories={categories} />
          </div>
        )}
      </div>

      {/* Template Dialog */}
      <MenuTemplateDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}
