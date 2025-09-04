// Core Restaurant Management Types - Built on Blunari SAAS Foundation

export type MenuItemStatus = "available" | "unavailable" | "out_of_stock" | "limited";
export type MenuItemCategory = 
  | "appetizers" 
  | "mains" 
  | "desserts" 
  | "beverages" 
  | "sides" 
  | "specials" 
  | "kids"
  | "vegetarian"
  | "vegan";

export type DietaryRestriction =
  | "vegetarian"
  | "vegan" 
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "kosher"
  | "halal"
  | "keto"
  | "paleo";

export type OrderStatus = 
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type KitchenDisplayStatus = 
  | "new"
  | "preparing" 
  | "ready"
  | "served";

export type StaffRole = 
  | "manager"
  | "chef"
  | "sous_chef"
  | "line_cook"
  | "server"
  | "bartender"
  | "host"
  | "busser"
  | "dishwasher";

export type ShiftStatus = 
  | "scheduled"
  | "checked_in"
  | "on_break"
  | "checked_out"
  | "no_show";

export type InventoryStatus = 
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "ordered";

// ===== CORE RESTAURANT MENU SYSTEM =====

export interface RestaurantMenu {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  menu_type: "regular" | "brunch" | "dinner" | "happy_hour" | "seasonal";
  active: boolean;
  start_time?: string; // Time when menu becomes available
  end_time?: string;   // Time when menu stops being available
  available_days: number[]; // 0-6 (Sunday-Saturday)
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  tenant_id: string;
  menu_id: string;
  name: string;
  description?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number; // in cents
  cost_to_make?: number; // in cents for profit margin calculation
  prep_time_minutes: number;
  calories?: number;
  dietary_restrictions: DietaryRestriction[];
  allergens: string[];
  ingredients: string[];
  image_url?: string;
  status: MenuItemStatus;
  display_order: number;
  available: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: MenuCategory;
  menu?: RestaurantMenu;
}

// ===== ORDER MANAGEMENT SYSTEM =====

export interface RestaurantOrder {
  id: string;
  tenant_id: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  order_type: "dine_in" | "takeout" | "delivery";
  status: OrderStatus;
  subtotal: number; // in cents
  tax_amount: number; // in cents
  tip_amount?: number; // in cents
  total_amount: number; // in cents
  payment_method?: string;
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  special_instructions?: string;
  estimated_ready_time?: string;
  actual_ready_time?: string;
  served_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  items?: OrderItem[];
  table?: any; // Reference to table
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number; // in cents
  total_price: number; // in cents
  special_instructions?: string;
  kitchen_status: KitchenDisplayStatus;
  prep_started_at?: string;
  ready_at?: string;
  served_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  menu_item?: MenuItem;
}

// ===== KITCHEN DISPLAY SYSTEM =====

export interface KitchenTicket {
  id: string;
  order_id: string;
  table_number?: string;
  customer_name?: string;
  status: KitchenDisplayStatus;
  priority: "low" | "normal" | "high" | "urgent";
  estimated_completion: string;
  special_instructions?: string;
  items: KitchenTicketItem[];
  created_at: string;
  updated_at: string;
}

export interface KitchenTicketItem {
  id: string;
  ticket_id: string;
  menu_item_name: string;
  quantity: number;
  special_instructions?: string;
  status: KitchenDisplayStatus;
  prep_time_minutes: number;
  started_at?: string;
  completed_at?: string;
}

// ===== STAFF MANAGEMENT SYSTEM =====

export interface Employee {
  id: string;
  tenant_id: string;
  user_id?: string; // Reference to auth.users
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  hourly_rate?: number; // in cents
  hire_date: string;
  status: "active" | "inactive" | "terminated";
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  employee_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  break_start?: string;
  break_end?: string;
  status: ShiftStatus;
  hourly_rate: number; // in cents
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  employee?: Employee;
}

export interface TimeClockEntry {
  id: string;
  employee_id: string;
  shift_id?: string;
  clock_in: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_hours?: number;
  overtime_hours?: number;
  created_at: string;
  updated_at: string;
}

// ===== INVENTORY MANAGEMENT SYSTEM =====

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  category: InventoryCategory;
  sku: string;
  current_quantity: number;
  unit: InventoryUnit;
  cost_per_unit?: number; // in cents
  reorder_point?: number;
  max_quantity?: number;
  supplier: string;
  storage_location?: string;
  expiration_date?: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export type InventoryCategory =
  | "protein"
  | "produce"
  | "dairy"
  | "dry_goods"
  | "beverages"
  | "oils_condiments"
  | "spices"
  | "cleaning"
  | "disposables";

export type InventoryUnit =
  | "lb"
  | "kg"
  | "oz"
  | "g"
  | "piece"
  | "case"
  | "bottle"
  | "can"
  | "box"
  | "bag";

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  supplier: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery: string;
  actual_delivery?: string;
  total_amount: number; // in cents
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus =
  | "pending"
  | "approved"
  | "ordered"
  | "delivered"
  | "cancelled";

export interface CreateInventoryItemRequest {
  name: string;
  category: InventoryCategory;
  sku: string;
  current_quantity?: number;
  unit: InventoryUnit;
  cost_per_unit?: number; // in dollars (will be converted to cents)
  reorder_point?: number;
  max_quantity?: number;
  supplier: string;
  storage_location?: string;
  expiration_date?: string;
}

export interface CreatePurchaseOrderRequest {
  supplier: string;
  expected_delivery: string;
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  type: InventoryAlertType;
  item_id: string;
  message: string;
  severity: AlertSeverity;
  created_at: string;
}

export type InventoryAlertType =
  | "low_stock"
  | "out_of_stock"
  | "expiring_soon"
  | "expired";

export type AlertSeverity =
  | "info"
  | "warning"
  | "critical";

export interface StockTransaction {
  id: string;
  tenant_id: string;
  inventory_item_id: string;
  transaction_type: "purchase" | "usage" | "waste" | "adjustment";
  quantity: number;
  unit_cost?: number; // in cents
  total_cost?: number; // in cents
  reference_order_id?: string; // If usage is from an order
  notes?: string;
  created_at: string;
  
  // Relations
  inventory_item?: InventoryItem;
}

// ===== ANALYTICS & REPORTING =====

export interface RestaurantAnalytics {
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  orders: {
    total_orders: number;
    avg_order_value: number;
    orders_by_type: Record<string, number>;
  };
  menu_performance: {
    top_selling_items: Array<{
      item_name: string;
      quantity_sold: number;
      revenue: number;
    }>;
    least_popular_items: Array<{
      item_name: string;
      quantity_sold: number;
    }>;
  };
  kitchen_efficiency: {
    avg_prep_time: number;
    orders_on_time: number;
    orders_late: number;
  };
  staff_performance: {
    total_hours_worked: number;
    labor_cost_percentage: number;
    overtime_hours: number;
  };
  inventory_status: {
    low_stock_items: number;
    out_of_stock_items: number;
    inventory_value: number;
  };
}

// ===== CUSTOMER MANAGEMENT =====

export interface Customer {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  anniversary?: string;
  dietary_restrictions: DietaryRestriction[];
  allergies?: string[];
  preferences?: string;
  total_visits: number;
  total_spent: number; // in cents
  avg_order_value: number; // in cents
  last_visit?: string;
  loyalty_points?: number;
  vip_status: boolean;
  marketing_consent: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgram {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  points_per_dollar: number;
  dollars_per_point: number; // How much $1 point is worth
  welcome_bonus: number;
  birthday_bonus?: number;
  referral_bonus?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id?: string;
  transaction_type: "earned" | "redeemed" | "bonus" | "adjustment";
  points: number;
  description?: string;
  created_at: string;
}

// ===== NOTIFICATION SYSTEM =====

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  name: string;
  type: "sms" | "email" | "push";
  trigger: "booking_confirmed" | "order_ready" | "table_ready" | "birthday" | "loyalty_milestone";
  subject?: string;
  message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  tenant_id: string;
  customer_id?: string;
  template_id: string;
  type: "sms" | "email" | "push";
  recipient: string;
  subject?: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed";
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  created_at: string;
}

// ===== FORM INTERFACES =====

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  category_id: string;
  price: number;
  cost_to_make?: number;
  prep_time_minutes: number;
  dietary_restrictions: DietaryRestriction[];
  allergens: string[];
  ingredients: string[];
  image_url?: string;
}

export interface CreateOrderRequest {
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  order_type: "dine_in" | "takeout" | "delivery";
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
  }>;
  special_instructions?: string;
}

export interface CreateEmployeeRequest {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  hourly_rate?: number;
  hire_date: string;
}

// ===== UTILITY TYPES =====

export type CreateMenuRequest = Omit<RestaurantMenu, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMenuRequest = Partial<CreateMenuRequest>;
export type CreateCategoryRequest = Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;
