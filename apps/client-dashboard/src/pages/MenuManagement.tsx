import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  Users,
  ChefHat,
  Utensils,
  Star,
  AlertCircle,
  Loader2,
  Image,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  MenuItem,
  MenuCategory,
  RestaurantMenu,
  MenuItemStatus,
  DietaryRestriction,
  CreateMenuItemRequest,
} from "@/types/restaurant";

// Mock data - replace with real API calls
const mockMenus: RestaurantMenu[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    name: "Main Menu",
    description: "Our signature dining menu",
    menu_type: "regular",
    active: true,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    name: "Brunch Menu",
    description: "Weekend brunch specialties",
    menu_type: "brunch",
    active: true,
    start_time: "09:00",
    end_time: "14:00",
    available_days: [0, 6],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockCategories: MenuCategory[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    menu_id: "1",
    name: "Appetizers",
    description: "Start your meal right",
    display_order: 1,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2", 
    tenant_id: "tenant-1",
    menu_id: "1",
    name: "Main Courses",
    description: "Our signature entrees",
    display_order: 2,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    category_id: "1",
    name: "Caesar Salad",
    description: "Crisp romaine, parmesan, croutons, house-made dressing",
    price: 1200, // $12.00
    cost_to_make: 450, // $4.50
    prep_time_minutes: 8,
    calories: 320,
    dietary_restrictions: ["vegetarian"],
    allergens: ["dairy", "gluten"],
    ingredients: ["romaine lettuce", "parmesan cheese", "croutons", "caesar dressing"],
    image_url: "/images/caesar-salad.jpg",
    status: "available",
    display_order: 1,
    available: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1", 
    category_id: "2",
    name: "Grilled Salmon",
    description: "Atlantic salmon with seasonal vegetables and lemon butter",
    price: 2800, // $28.00
    cost_to_make: 1200, // $12.00
    prep_time_minutes: 18,
    calories: 420,
    dietary_restrictions: ["gluten_free"],
    allergens: ["fish"],
    ingredients: ["atlantic salmon", "seasonal vegetables", "lemon", "butter"],
    status: "available",
    display_order: 1,
    available: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const dietaryOptions: DietaryRestriction[] = [
  "vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "kosher", "halal", "keto", "paleo"
];

const statusOptions: MenuItemStatus[] = ["available", "unavailable", "out_of_stock", "limited"];

const statusColors = {
  available: "bg-green-100 text-green-800",
  unavailable: "bg-gray-100 text-gray-800",
  out_of_stock: "bg-red-100 text-red-800",
  limited: "bg-yellow-100 text-yellow-800",
};

const MenuManagement: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [menus] = useState<RestaurantMenu[]>(mockMenus);
  const [categories] = useState<MenuCategory[]>(mockCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [selectedMenu, setSelectedMenu] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  // Form states
  const [itemForm, setItemForm] = useState<Partial<CreateMenuItemRequest>>({
    name: "",
    description: "",
    category_id: "",
    price: 0,
    cost_to_make: 0,
    prep_time_minutes: 15,
    dietary_restrictions: [],
    allergens: [],
    ingredients: [],
    image_url: "",
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.menu_id === selectedMenu && cat.active);
  }, [categories, selectedMenu]);

  const filteredMenuItems = useMemo(() => {
    const categoryIds = filteredCategories.map(cat => cat.id);
    return menuItems.filter(item => categoryIds.includes(item.category_id));
  }, [menuItems, filteredCategories]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const items = filteredMenuItems;
    const totalItems = items.length;
    const availableItems = items.filter(item => item.status === "available").length;
    const avgPrice = items.length > 0 ? items.reduce((sum, item) => sum + item.price, 0) / items.length : 0;
    const profitMargin = items.length > 0 ? 
      items.reduce((sum, item) => {
        const margin = item.cost_to_make ? ((item.price - item.cost_to_make) / item.price) * 100 : 0;
        return sum + margin;
      }, 0) / items.length : 0;

    return {
      totalItems,
      availableItems,
      avgPrice,
      profitMargin,
    };
  }, [filteredMenuItems]);

  const handleCreateItem = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!itemForm.name || !itemForm.category_id || !itemForm.price) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Create new item
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        tenant_id: tenant?.id || "",
        category_id: itemForm.category_id!,
        name: itemForm.name!,
        description: itemForm.description || "",
        price: itemForm.price!,
        cost_to_make: itemForm.cost_to_make,
        prep_time_minutes: itemForm.prep_time_minutes || 15,
        dietary_restrictions: itemForm.dietary_restrictions || [],
        allergens: itemForm.allergens || [],
        ingredients: itemForm.ingredients || [],
        image_url: itemForm.image_url,
        status: "available",
        display_order: filteredMenuItems.length + 1,
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMenuItems(prev => [...prev, newItem]);
      setShowItemDialog(false);
      resetItemForm();
      
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create menu item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    try {
      setIsLoading(true);
      
      const updatedItem: MenuItem = {
        ...editingItem,
        name: itemForm.name!,
        description: itemForm.description || "",
        price: itemForm.price!,
        cost_to_make: itemForm.cost_to_make,
        prep_time_minutes: itemForm.prep_time_minutes || 15,
        dietary_restrictions: itemForm.dietary_restrictions || [],
        allergens: itemForm.allergens || [],
        ingredients: itemForm.ingredients || [],
        image_url: itemForm.image_url,
        updated_at: new Date().toISOString(),
      };

      setMenuItems(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
      
      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
      
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update menu item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: MenuItemStatus) => {
    try {
      setMenuItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
          : item
      ));
      
      toast({
        title: "Success",
        description: "Item status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: "",
      description: "",
      category_id: "",
      price: 0,
      cost_to_make: 0,
      prep_time_minutes: 15,
      dietary_restrictions: [],
      allergens: [],
      ingredients: [],
      image_url: "",
    });
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      price: item.price,
      cost_to_make: item.cost_to_make,
      prep_time_minutes: item.prep_time_minutes,
      dietary_restrictions: item.dietary_restrictions,
      allergens: item.allergens,
      ingredients: item.ingredients,
      image_url: item.image_url,
    });
    setShowItemDialog(true);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant menu items, categories, and pricing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedMenu} onValueChange={setSelectedMenu}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select menu" />
            </SelectTrigger>
            <SelectContent>
              {menus.map(menu => (
                <SelectItem key={menu.id} value={menu.id}>
                  {menu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.availableItems} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.avgPrice)}</div>
            <p className="text-xs text-muted-foreground">
              Across all menu items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average across items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCategories.length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {filteredCategories.map(category => {
              const categoryItems = filteredMenuItems.filter(item => item.category_id === category.id);
              
              return (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <Badge variant="outline">{categoryItems.length} items</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryItems.map(item => (
                      <Card key={item.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{item.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                            {item.image_url && (
                              <div className="ml-3 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Price:</span>
                              <span>{formatPrice(item.price)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Prep Time:</span>
                              <span>{item.prep_time_minutes} min</span>
                            </div>
                            {item.cost_to_make && (
                              <div className="flex items-center justify-between text-sm">
                                <span>Margin:</span>
                                <span className="text-green-600">
                                  {(((item.price - item.cost_to_make) / item.price) * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.dietary_restrictions.map(restriction => (
                              <Badge key={restriction} variant="secondary" className="text-xs">
                                {restriction.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleStatusChange(item.id, value as MenuItemStatus)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(status => (
                                  <SelectItem key={status} value={status}>
                                    {status.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          <Badge 
                            className={`absolute top-2 right-2 text-xs ${statusColors[item.status]}`}
                          >
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {categoryItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No items in this category
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Create Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the menu item details" : "Add a new item to your menu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Item name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={itemForm.category_id}
                  onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={itemForm.description}
                onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the item..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={itemForm.price ? (itemForm.price / 100).toFixed(2) : ""}
                  onChange={(e) => setItemForm(prev => ({ 
                    ...prev, 
                    price: Math.round(parseFloat(e.target.value || "0") * 100)
                  }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost to Make ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={itemForm.cost_to_make ? (itemForm.cost_to_make / 100).toFixed(2) : ""}
                  onChange={(e) => setItemForm(prev => ({ 
                    ...prev, 
                    cost_to_make: Math.round(parseFloat(e.target.value || "0") * 100)
                  }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep_time">Prep Time (min)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={itemForm.prep_time_minutes}
                  onChange={(e) => setItemForm(prev => ({ 
                    ...prev, 
                    prep_time_minutes: parseInt(e.target.value) || 15
                  }))}
                  placeholder="15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={itemForm.dietary_restrictions?.includes(option) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const current = itemForm.dietary_restrictions || [];
                      const updated = current.includes(option)
                        ? current.filter(item => item !== option)
                        : [...current, option];
                      setItemForm(prev => ({ ...prev, dietary_restrictions: updated }));
                    }}
                  >
                    {option.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergens">Allergens (comma separated)</Label>
              <Input
                id="allergens"
                value={itemForm.allergens?.join(", ") || ""}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  allergens: e.target.value ? e.target.value.split(",").map(s => s.trim()) : []
                }))}
                placeholder="dairy, gluten, nuts"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients (comma separated)</Label>
              <Input
                id="ingredients"
                value={itemForm.ingredients?.join(", ") || ""}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  ingredients: e.target.value ? e.target.value.split(",").map(s => s.trim()) : []
                }))}
                placeholder="chicken, rice, vegetables"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={itemForm.image_url}
                onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingItem ? handleUpdateItem : handleCreateItem}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
