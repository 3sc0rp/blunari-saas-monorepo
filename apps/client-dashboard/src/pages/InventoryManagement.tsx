import React, { useState, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  BarChart3,
  Search,
  Filter,
  Truck,
  ShoppingCart,
  Clock,
  Loader2,
  FileText,
  Eye,
  Download,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  PurchaseOrder,
  CreateInventoryItemRequest,
  CreatePurchaseOrderRequest,
  InventoryAlert,
} from "@/types/restaurant";

// Mock data for inventory items
const mockInventoryItems: InventoryItem[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    name: "Chicken Breast",
    category: "protein",
    sku: "CHKN-001",
    current_quantity: 45,
    unit: "lb",
    cost_per_unit: 850, // $8.50
    reorder_point: 20,
    max_quantity: 100,
    supplier: "Fresh Foods Co",
    storage_location: "Walk-in Cooler A",
    expiration_date: "2024-09-10",
    last_updated: "2024-09-04T10:00:00Z",
    created_at: "2024-09-01T00:00:00Z",
    updated_at: "2024-09-04T10:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    name: "Tomatoes",
    category: "produce",
    sku: "TOM-001",
    current_quantity: 15,
    unit: "lb",
    cost_per_unit: 320, // $3.20
    reorder_point: 25,
    max_quantity: 50,
    supplier: "Local Farm",
    storage_location: "Walk-in Cooler B",
    expiration_date: "2024-09-07",
    last_updated: "2024-09-04T08:30:00Z",
    created_at: "2024-09-01T00:00:00Z",
    updated_at: "2024-09-04T08:30:00Z",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    name: "All-Purpose Flour",
    category: "dry_goods",
    sku: "FLOUR-001",
    current_quantity: 80,
    unit: "lb",
    cost_per_unit: 125, // $1.25
    reorder_point: 30,
    max_quantity: 150,
    supplier: "Grain Supply Inc",
    storage_location: "Dry Storage",
    last_updated: "2024-09-03T14:00:00Z",
    created_at: "2024-09-01T00:00:00Z",
    updated_at: "2024-09-03T14:00:00Z",
  },
  {
    id: "4",
    tenant_id: "tenant-1",
    name: "Olive Oil",
    category: "oils_condiments",
    sku: "OIL-001",
    current_quantity: 8,
    unit: "bottle",
    cost_per_unit: 1250, // $12.50
    reorder_point: 12,
    max_quantity: 24,
    supplier: "Mediterranean Foods",
    storage_location: "Dry Storage",
    last_updated: "2024-09-04T09:15:00Z",
    created_at: "2024-09-01T00:00:00Z",
    updated_at: "2024-09-04T09:15:00Z",
  },
];

// Mock data for purchase orders
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    order_number: "PO-2024-001",
    supplier: "Fresh Foods Co",
    status: "pending",
    order_date: "2024-09-04",
    expected_delivery: "2024-09-06",
    total_amount: 45000, // $450.00
    notes: "Weekly protein order",
    created_at: "2024-09-04T09:00:00Z",
    updated_at: "2024-09-04T09:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    order_number: "PO-2024-002",
    supplier: "Local Farm",
    status: "delivered",
    order_date: "2024-09-02",
    expected_delivery: "2024-09-04",
    actual_delivery: "2024-09-04",
    total_amount: 18500, // $185.00
    notes: "Fresh produce delivery",
    created_at: "2024-09-02T10:00:00Z",
    updated_at: "2024-09-04T08:30:00Z",
  },
];

const categoryOptions: InventoryCategory[] = [
  "protein", "produce", "dairy", "dry_goods", "beverages", "oils_condiments", "spices", "cleaning", "disposables"
];

const unitOptions: InventoryUnit[] = [
  "lb", "kg", "oz", "g", "piece", "case", "bottle", "can", "box", "bag"
];

const categoryColors = {
  protein: "bg-red-100 text-red-800",
  produce: "bg-green-100 text-green-800",
  dairy: "bg-blue-100 text-blue-800",
  dry_goods: "bg-yellow-100 text-yellow-800",
  beverages: "bg-purple-100 text-purple-800",
  oils_condiments: "bg-orange-100 text-orange-800",
  spices: "bg-pink-100 text-pink-800",
  cleaning: "bg-gray-100 text-gray-800",
  disposables: "bg-indigo-100 text-indigo-800",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  ordered: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const InventoryManagement: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(mockInventoryItems);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form states
  const [itemForm, setItemForm] = useState<Partial<CreateInventoryItemRequest>>({
    name: "",
    category: "protein",
    sku: "",
    current_quantity: 0,
    unit: "lb",
    cost_per_unit: 0,
    reorder_point: 0,
    max_quantity: 0,
    supplier: "",
    storage_location: "",
  });

  const [poForm, setPOForm] = useState<Partial<CreatePurchaseOrderRequest>>({
    supplier: "",
    expected_delivery: "",
    notes: "",
  });

  // Filter inventory items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchTerm, selectedCategory]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => 
      item.current_quantity <= item.reorder_point
    ).length;
    const outOfStockItems = inventoryItems.filter(item => 
      item.current_quantity === 0
    ).length;
    const totalValue = inventoryItems.reduce((sum, item) => 
      sum + (item.current_quantity * item.cost_per_unit), 0
    );
    const pendingOrders = purchaseOrders.filter(po => po.status === "pending").length;
    const expiringItems = inventoryItems.filter(item => {
      if (!item.expiration_date) return false;
      const expirationDate = new Date(item.expiration_date);
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      return expirationDate <= threeDaysFromNow;
    }).length;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      pendingOrders,
      expiringItems,
    };
  }, [inventoryItems, purchaseOrders]);

  // Get inventory alerts
  const inventoryAlerts = useMemo(() => {
    const alerts: InventoryAlert[] = [];
    
    inventoryItems.forEach(item => {
      if (item.current_quantity === 0) {
        alerts.push({
          id: `out-${item.id}`,
          type: "out_of_stock",
          item_id: item.id,
          message: `${item.name} is out of stock`,
          severity: "critical",
          created_at: new Date().toISOString(),
        });
      } else if (item.current_quantity <= item.reorder_point) {
        alerts.push({
          id: `low-${item.id}`,
          type: "low_stock",
          item_id: item.id,
          message: `${item.name} is below reorder point (${item.current_quantity} ${item.unit} remaining)`,
          severity: "warning",
          created_at: new Date().toISOString(),
        });
      }
      
      if (item.expiration_date) {
        const expirationDate = new Date(item.expiration_date);
        const today = new Date();
        const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        if (expirationDate <= today) {
          alerts.push({
            id: `expired-${item.id}`,
            type: "expired",
            item_id: item.id,
            message: `${item.name} has expired`,
            severity: "critical",
            created_at: new Date().toISOString(),
          });
        } else if (expirationDate <= threeDaysFromNow) {
          alerts.push({
            id: `expiring-${item.id}`,
            type: "expiring_soon",
            item_id: item.id,
            message: `${item.name} expires on ${expirationDate.toLocaleDateString()}`,
            severity: "warning",
            created_at: new Date().toISOString(),
          });
        }
      }
    });
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [inventoryItems]);

  const handleCreateItem = async () => {
    try {
      setIsLoading(true);
      
      // Validate form
      if (!itemForm.name || !itemForm.sku || !itemForm.supplier) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate SKU
      if (inventoryItems.some(item => item.sku === itemForm.sku)) {
        toast({
          title: "Validation Error",
          description: "SKU already exists",
          variant: "destructive",
        });
        return;
      }

      // Create new item
      const newItem: InventoryItem = {
        id: `item-${Date.now()}`,
        tenant_id: tenant?.id || "",
        name: itemForm.name!,
        category: itemForm.category!,
        sku: itemForm.sku!,
        current_quantity: itemForm.current_quantity || 0,
        unit: itemForm.unit!,
        cost_per_unit: itemForm.cost_per_unit ? Math.round(itemForm.cost_per_unit * 100) : 0,
        reorder_point: itemForm.reorder_point || 0,
        max_quantity: itemForm.max_quantity || 0,
        supplier: itemForm.supplier!,
        storage_location: itemForm.storage_location || "",
        expiration_date: itemForm.expiration_date,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setInventoryItems(prev => [...prev, newItem]);
      setShowItemDialog(false);
      resetItemForm();
      
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create inventory item",
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
      
      const updatedItem: InventoryItem = {
        ...editingItem,
        name: itemForm.name!,
        category: itemForm.category!,
        current_quantity: itemForm.current_quantity || 0,
        unit: itemForm.unit!,
        cost_per_unit: itemForm.cost_per_unit ? Math.round(itemForm.cost_per_unit * 100) : 0,
        reorder_point: itemForm.reorder_point || 0,
        max_quantity: itemForm.max_quantity || 0,
        supplier: itemForm.supplier!,
        storage_location: itemForm.storage_location || "",
        expiration_date: itemForm.expiration_date,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setInventoryItems(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
      
      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
      
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setInventoryItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive",
      });
    }
  };

  const handleAdjustQuantity = async (itemId: string, newQuantity: number) => {
    try {
      setInventoryItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              current_quantity: Math.max(0, newQuantity),
              last_updated: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : item
      ));
      
      toast({
        title: "Success",
        description: "Quantity updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: "",
      category: "protein",
      sku: "",
      current_quantity: 0,
      unit: "lb",
      cost_per_unit: 0,
      reorder_point: 0,
      max_quantity: 0,
      supplier: "",
      storage_location: "",
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      sku: item.sku,
      current_quantity: item.current_quantity,
      unit: item.unit,
      cost_per_unit: item.cost_per_unit / 100,
      reorder_point: item.reorder_point,
      max_quantity: item.max_quantity,
      supplier: item.supplier,
      storage_location: item.storage_location,
      expiration_date: item.expiration_date,
    });
    setShowItemDialog(true);
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const getStockLevel = (item: InventoryItem) => {
    if (item.current_quantity === 0) return "out";
    if (item.current_quantity <= item.reorder_point) return "low";
    if (item.current_quantity >= item.max_quantity * 0.8) return "high";
    return "normal";
  };

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case "out": return "bg-red-500";
      case "low": return "bg-yellow-500";
      case "high": return "bg-green-500";
      default: return "bg-blue-500";
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels, manage suppliers, and automate reordering
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowPODialog(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Order
          </Button>
          <Button onClick={() => setShowItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{analytics.totalItems}</p>
              </div>
              <Package className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.lowStockItems}</p>
              </div>
              <TrendingDown className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{analytics.outOfStockItems}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{analytics.pendingOrders}</p>
              </div>
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.expiringItems}</p>
              </div>
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {inventoryAlerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Inventory Alerts ({inventoryAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryAlerts.slice(0, 5).map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    alert.severity === "critical" ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === "critical" ? "text-red-500" : "text-yellow-500"
                    }`} />
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
              {inventoryAlerts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {inventoryAlerts.length - 5} more alerts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items by name, SKU, or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Items */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const stockLevel = getStockLevel(item);
                  const stockPercentage = (item.current_quantity / item.max_quantity) * 100;
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{item.name}</h4>
                                  <Badge className={`${categoryColors[item.category]}`}>
                                    {item.category.replace('_', ' ')}
                                  </Badge>
                                  {stockLevel === "out" && (
                                    <Badge variant="destructive">Out of Stock</Badge>
                                  )}
                                  {stockLevel === "low" && (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                      Low Stock
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                                  <div>
                                    <span className="font-medium">SKU:</span> {item.sku}
                                  </div>
                                  <div>
                                    <span className="font-medium">Supplier:</span> {item.supplier}
                                  </div>
                                  <div>
                                    <span className="font-medium">Location:</span> {item.storage_location}
                                  </div>
                                  <div>
                                    <span className="font-medium">Cost:</span> {formatCurrency(item.cost_per_unit)}/{item.unit}
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium">
                                        Stock: {item.current_quantity} {item.unit}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        Max: {item.max_quantity} {item.unit}
                                      </span>
                                    </div>
                                    <Progress 
                                      value={Math.min(stockPercentage, 100)} 
                                      className="h-2"
                                    />
                                  </div>
                                  
                                  {item.expiration_date && (
                                    <div className="text-sm">
                                      <span className="font-medium">Expires:</span> {" "}
                                      <span className={`${
                                        new Date(item.expiration_date) <= new Date() ? "text-red-600" :
                                        new Date(item.expiration_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? "text-yellow-600" :
                                        "text-muted-foreground"
                                      }`}>
                                        {new Date(item.expiration_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAdjustQuantity(item.id, item.current_quantity - 1)}
                                    disabled={item.current_quantity <= 0}
                                  >
                                    -
                                  </Button>
                                  <span className="w-12 text-center text-sm">
                                    {item.current_quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAdjustQuantity(item.id, item.current_quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>

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
                                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {item.name}? 
                                        This action cannot be undone.
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No inventory items found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          {/* Purchase Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseOrders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{order.order_number}</h4>
                            <Badge className={statusColors[order.status]}>
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Supplier:</span> {order.supplier}
                            </div>
                            <div>
                              <span className="font-medium">Order Date:</span> {new Date(order.order_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Expected:</span> {new Date(order.expected_delivery).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Total:</span> {formatCurrency(order.total_amount)}
                            </div>
                          </div>
                          
                          {order.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{order.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {purchaseOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No purchase orders found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Inventory Reports</h3>
              <p className="text-muted-foreground">
                Advanced reporting features coming soon. Generate inventory reports, 
                analyze usage patterns, and optimize stock levels.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update inventory item information" : "Create a new inventory item"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={itemForm.name}
                onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Chicken Breast"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={itemForm.sku}
                onChange={(e) => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="CHKN-001"
                disabled={!!editingItem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={itemForm.category}
                onValueChange={(value) => setItemForm(prev => ({ ...prev, category: value as InventoryCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={itemForm.unit}
                onValueChange={(value) => setItemForm(prev => ({ ...prev, unit: value as InventoryUnit }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_quantity">Current Quantity</Label>
              <Input
                id="current_quantity"
                type="number"
                value={itemForm.current_quantity}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  current_quantity: parseInt(e.target.value) || 0
                }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost per Unit ($)</Label>
              <Input
                id="cost_per_unit"
                type="number"
                step="0.01"
                value={itemForm.cost_per_unit}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  cost_per_unit: parseFloat(e.target.value) || 0
                }))}
                placeholder="8.50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                value={itemForm.reorder_point}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  reorder_point: parseInt(e.target.value) || 0
                }))}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_quantity">Max Quantity</Label>
              <Input
                id="max_quantity"
                type="number"
                value={itemForm.max_quantity}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  max_quantity: parseInt(e.target.value) || 0
                }))}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Input
                id="supplier"
                value={itemForm.supplier}
                onChange={(e) => setItemForm(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Fresh Foods Co"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_location">Storage Location</Label>
              <Input
                id="storage_location"
                value={itemForm.storage_location}
                onChange={(e) => setItemForm(prev => ({ ...prev, storage_location: e.target.value }))}
                placeholder="Walk-in Cooler A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                value={itemForm.expiration_date}
                onChange={(e) => setItemForm(prev => ({ ...prev, expiration_date: e.target.value }))}
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

export default InventoryManagement;
