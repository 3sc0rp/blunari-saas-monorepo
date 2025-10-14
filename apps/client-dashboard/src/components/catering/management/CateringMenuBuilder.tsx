import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ChefHat, Grid3x3, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DIETARY_ACCOMMODATIONS } from '@/types/catering';
import type { DietaryRestriction } from '@/types/catering';

interface CateringMenuBuilderProps {
  tenantId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  base_price: number;
  dietary_restrictions: DietaryRestriction[];
  allergen_info?: string;
  image_url?: string;
  active: boolean;
  display_order: number;
}

export function CateringMenuBuilder({ tenantId }: CateringMenuBuilderProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'categories' | 'items'>('categories');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0,
  });

  const [itemForm, setItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    base_price: 0,
    dietary_restrictions: [] as DietaryRestriction[],
    allergen_info: '',
    image_url: '',
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['catering-categories', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_menu_categories' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');
      
      if (error && error.code !== '42P01') throw error;
      return (data || []) as MenuCategory[];
    },
    enabled: !!tenantId,
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['catering-menu-items', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catering_menu_items' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category_id')
        .order('display_order');
      
      if (error && error.code !== '42P01') throw error;
      return (data || []) as MenuItem[];
    },
    enabled: !!tenantId,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const { data, error } = await supabase
        .from('catering_menu_categories' as any)
        .insert({ ...categoryData, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-categories', tenantId] });
      toast.success('Category created successfully');
      setShowCategoryDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Create menu item mutation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const { data, error } = await supabase
        .from('catering_menu_items' as any)
        .insert({
          ...itemData,
          tenant_id: tenantId,
          base_price: Math.round(itemData.base_price * 100), // Convert to cents
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-menu-items', tenantId] });
      toast.success('Menu item created successfully');
      setShowItemDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create menu item');
    },
  });

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', display_order: categories.length });
    setShowCategoryDialog(true);
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setItemForm({
      category_id: categories[0]?.id || '',
      name: '',
      description: '',
      base_price: 0,
      dietary_restrictions: [],
      allergen_info: '',
      image_url: '',
    });
    setShowItemDialog(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }
    createCategoryMutation.mutate(categoryForm);
  };

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.category_id) {
      toast.error('Item name and category are required');
      return;
    }
    createItemMutation.mutate(itemForm);
  };

  const toggleDietaryRestriction = (restriction: DietaryRestriction) => {
    setItemForm(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Menu Builder</CardTitle>
              <CardDescription>
                Organize your catering menu with categories and items
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCreateCategory}>
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
              <Button onClick={handleCreateItem}>
                <Plus className="w-4 h-4 mr-2" />
                New Item
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="categories">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="items">
            <List className="w-4 h-4 mr-2" />
            All Items
          </TabsTrigger>
        </TabsList>

        {/* Categories View */}
        <TabsContent value="categories" className="space-y-6">
          {categories.length > 0 ? (
            categories.map((category) => {
              const categoryItems = menuItems.filter(item => item.category_id === category.id);
              
              return (
                <Card key={category.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{category.name}</CardTitle>
                        {category.description && (
                          <CardDescription>{category.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary">{categoryItems.length} items</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {categoryItems.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {categoryItems.map((item) => (
                          <Card key={item.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{item.name}</CardTitle>
                              <CardDescription className="text-sm">
                                ${(item.base_price / 100).toFixed(2)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.dietary_restrictions && item.dietary_restrictions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.dietary_restrictions.map((diet) => (
                                    <Badge key={diet} variant="outline" className="text-xs">
                                      {diet}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No items in this category yet</p>
                        <Button variant="link" size="sm" onClick={handleCreateItem} className="mt-2">
                          Add first item
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ChefHat className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create menu categories to organize your catering items
                </p>
                <Button onClick={handleCreateCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Category
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Items View */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>All Menu Items ({menuItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {menuItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {menuItems.map((item) => {
                    const category = categories.find(c => c.id === item.category_id);
                    return (
                      <Card key={item.id}>
                        <CardHeader>
                          <Badge variant="secondary" className="w-fit mb-2">
                            {category?.name || 'Uncategorized'}
                          </Badge>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <CardDescription>${(item.base_price / 100).toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {item.dietary_restrictions && item.dietary_restrictions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.dietary_restrictions.map((diet) => (
                                <Badge key={diet} variant="outline" className="text-xs">
                                  {diet}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No menu items yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Menu Category</DialogTitle>
            <DialogDescription>
              Organize your menu items into categories
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Appetizers, Main Courses"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Menu Item</DialogTitle>
            <DialogDescription>
              Add a new item to your catering menu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="item-category">Category *</Label>
                <select
                  id="item-category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="item-name">Item Name *</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g., Grilled Chicken Skewers"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea
                  id="item-desc"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Describe this menu item..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-price">Price ($) *</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={itemForm.base_price}
                  onChange={(e) => setItemForm({ ...itemForm, base_price: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-image">Image URL</Label>
                <Input
                  id="item-image"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Dietary Restrictions</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DIETARY_ACCOMMODATIONS.map((diet) => (
                    <div key={diet.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diet-${diet.value}`}
                        checked={itemForm.dietary_restrictions.includes(diet.value)}
                        onCheckedChange={() => toggleDietaryRestriction(diet.value)}
                      />
                      <Label htmlFor={`diet-${diet.value}`} className="text-sm font-normal">
                        {diet.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="item-allergens">Allergen Information</Label>
                <Input
                  id="item-allergens"
                  value={itemForm.allergen_info}
                  onChange={(e) => setItemForm({ ...itemForm, allergen_info: e.target.value })}
                  placeholder="e.g., Contains nuts, dairy"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={createItemMutation.isPending}>
              {createItemMutation.isPending ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

