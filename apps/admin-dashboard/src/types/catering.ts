// Comprehensive TypeScript types for Blunari Catering System

// Database enums
export type CateringStatus =
  | "inquiry"
  | "quoted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type CateringServiceType =
  | "pickup"
  | "delivery"
  | "full_service"
  | "drop_off";
export type MenuItemCategory =
  | "appetizers"
  | "mains"
  | "desserts"
  | "beverages"
  | "salads"
  | "sides"
  | "packages";
export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "kosher"
  | "halal";

// Core catering interfaces
export interface CateringEventType {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  min_guests: number;
  max_guests: number;
  advance_notice_days: number;
  base_price_per_person: number; // in cents
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringMenuCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category_type: MenuItemCategory;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringMenuItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price_per_person?: number; // in cents
  price_per_item?: number; // in cents
  minimum_quantity: number;
  serves_people?: number;
  dietary_restrictions: DietaryRestriction[];
  ingredients?: string[];
  allergens?: string[];
  preparation_time_minutes: number;
  image_url?: string;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  category?: CateringMenuCategory;
}

export interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price_per_person: number; // in cents
  min_guests: number;
  max_guests?: number;
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  dietary_accommodations: DietaryRestriction[];
  image_url?: string;
  popular: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  items?: CateringPackageItem[];
}

export interface CateringPackageItem {
  id: string;
  package_id: string;
  menu_item_id: string;
  quantity_per_person: number;
  is_included: boolean;
  additional_cost_per_person: number; // in cents
  created_at: string;
  // Relations
  menu_item?: CateringMenuItem;
}

export interface CateringOrder {
  id: string;
  tenant_id: string;
  event_type_id?: string;
  package_id?: string;
  customer_id?: string;

  // Event details
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  event_duration_hours: number;
  guest_count: number;

  // Customer information
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name?: string;

  // Event location
  venue_name?: string;
  venue_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  delivery_instructions?: string;

  // Service details
  service_type: CateringServiceType;
  setup_required: boolean;
  service_staff_required: number;
  equipment_needed: string[];

  // Pricing
  subtotal: number; // in cents
  tax_amount: number;
  service_fee: number;
  delivery_fee: number;
  total_amount: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at?: string;

  // Order status and tracking
  status: CateringStatus;
  quoted_at?: string;
  confirmed_at?: string;

  // Additional information
  special_instructions?: string;
  dietary_requirements?: string;
  occasion?: string;
  referral_source?: string;
  marketing_consent: boolean;

  // Internal notes and tracking
  internal_notes?: string;
  assigned_chef_id?: string;
  prep_start_time?: string;
  ready_time?: string;
  delivered_at?: string;
  completed_at?: string;

  created_at: string;
  updated_at: string;

  // Relations
  event_type?: CateringEventType;
  package?: CateringPackage;
  items?: CateringOrderItem[];
  history?: CateringOrderHistory[];
  quotes?: CateringQuote[];
  feedback?: CateringFeedback;
  staff_assignments?: CateringStaffAssignment[];
  equipment?: CateringOrderEquipment[];
}

export interface CateringOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number; // in cents
  total_price: number; // in cents
  special_instructions?: string;
  created_at: string;
  // Relations
  menu_item?: CateringMenuItem;
}

export interface CateringOrderHistory {
  id: string;
  order_id: string;
  status: CateringStatus;
  notes?: string;
  changed_by?: string;
  created_at: string;
  // Relations
  changed_by_user?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface CateringQuote {
  id: string;
  order_id: string;
  quote_number: string;
  valid_until: string;
  terms_conditions?: string;
  notes?: string;
  pdf_url?: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  created_by: string;
  created_at: string;
  // Relations
  created_by_user?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface CateringEquipment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  quantity_available: number;
  hourly_rate: number; // in cents
  requires_staff: boolean;
  active: boolean;
  created_at: string;
}

export interface CateringOrderEquipment {
  id: string;
  order_id: string;
  equipment_id: string;
  quantity_needed: number;
  pickup_time?: string;
  return_time?: string;
  hourly_rate: number; // in cents
  total_cost: number; // in cents
  created_at: string;
  // Relations
  equipment?: CateringEquipment;
}

export interface CateringStaffAssignment {
  id: string;
  order_id: string;
  staff_id: string;
  role: string;
  start_time: string;
  end_time: string;
  hourly_rate: number; // in cents
  total_cost: number; // in cents
  confirmed: boolean;
  notes?: string;
  created_at: string;
  // Relations
  staff?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface CateringFeedback {
  id: string;
  order_id: string;
  customer_id?: string;
  overall_rating?: number;
  food_quality_rating?: number;
  service_rating?: number;
  presentation_rating?: number;
  comments?: string;
  would_recommend?: boolean;
  improvements_suggested?: string;
  created_at: string;
}

// Form interfaces for creating/updating
export interface CreateCateringOrderRequest {
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name?: string;
  venue_name?: string;
  venue_address: CateringOrder["venue_address"];
  service_type: CateringServiceType;
  special_instructions?: string;
  dietary_requirements?: string;
  occasion?: string;
  package_id?: string;
  event_type_id?: string;
  custom_items?: {
    menu_item_id: string;
    quantity: number;
  }[];
}

export interface UpdateCateringOrderRequest {
  event_name?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  guest_count?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  venue_name?: string;
  venue_address?: Partial<CateringOrder["venue_address"]>;
  service_type?: CateringServiceType;
  special_instructions?: string;
  dietary_requirements?: string;
  status?: CateringStatus;
  internal_notes?: string;
  assigned_chef_id?: string;
}

export interface CreateCateringMenuItemRequest {
  category_id: string;
  name: string;
  description?: string;
  price_per_person?: number;
  price_per_item?: number;
  minimum_quantity?: number;
  serves_people?: number;
  dietary_restrictions?: DietaryRestriction[];
  ingredients?: string[];
  allergens?: string[];
  preparation_time_minutes?: number;
  image_url?: string;
}

export interface CreateCateringPackageRequest {
  name: string;
  description?: string;
  price_per_person: number;
  min_guests: number;
  max_guests?: number;
  includes_setup?: boolean;
  includes_service?: boolean;
  includes_cleanup?: boolean;
  dietary_accommodations?: DietaryRestriction[];
  image_url?: string;
  items: {
    menu_item_id: string;
    quantity_per_person: number;
    is_included: boolean;
    additional_cost_per_person?: number;
  }[];
}

// Analytics and reporting interfaces
export interface CateringAnalytics {
  total_orders: number;
  total_revenue: number; // in cents
  average_order_value: number; // in cents
  orders_by_status: Record<CateringStatus, number>;
  orders_by_service_type: Record<CateringServiceType, number>;
  popular_packages: {
    package_id: string;
    package_name: string;
    order_count: number;
  }[];
  popular_items: {
    item_id: string;
    item_name: string;
    order_count: number;
  }[];
  monthly_revenue: {
    month: string;
    revenue: number;
    order_count: number;
  }[];
  customer_satisfaction: {
    average_rating: number;
    total_reviews: number;
    recommendation_rate: number;
  };
}

// Search and filter interfaces
export interface CateringOrderFilters {
  status?: CateringStatus[];
  service_type?: CateringServiceType[];
  date_from?: string;
  date_to?: string;
  guest_count_min?: number;
  guest_count_max?: number;
  total_amount_min?: number;
  total_amount_max?: number;
  search?: string; // search in event name, contact name, venue
}

export interface CateringMenuFilters {
  category?: MenuItemCategory[];
  dietary_restrictions?: DietaryRestriction[];
  price_min?: number;
  price_max?: number;
  search?: string;
  active_only?: boolean;
}

// Response interfaces for API
export interface CateringOrderResponse {
  data: CateringOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface CateringMenuResponse {
  categories: CateringMenuCategory[];
  items: CateringMenuItem[];
  packages: CateringPackage[];
}

// Utility types
export type CateringStatusColor = {
  [K in CateringStatus]: string;
};

export type CateringServiceTypeLabel = {
  [K in CateringServiceType]: string;
};

export type MenuItemCategoryLabel = {
  [K in MenuItemCategory]: string;
};

export type DietaryRestrictionLabel = {
  [K in DietaryRestriction]: string;
};

// Constants
export const CATERING_STATUS_COLORS: CateringStatusColor = {
  inquiry: "text-blue-600 bg-blue-50",
  quoted: "text-amber-600 bg-amber-50",
  confirmed: "text-green-600 bg-green-50",
  in_progress: "text-purple-600 bg-purple-50",
  completed: "text-gray-600 bg-gray-50",
  cancelled: "text-red-600 bg-red-50",
};

export const CATERING_SERVICE_TYPE_LABELS: CateringServiceTypeLabel = {
  pickup: "Customer Pickup",
  delivery: "Delivery Only",
  drop_off: "Drop-off Service",
  full_service: "Full Service",
};

export const MENU_ITEM_CATEGORY_LABELS: MenuItemCategoryLabel = {
  appetizers: "Appetizers & Hors d'oeuvres",
  mains: "Main Courses",
  salads: "Salads & Fresh Options",
  sides: "Side Dishes",
  desserts: "Desserts",
  beverages: "Beverages",
  packages: "Complete Packages",
};

export const DIETARY_RESTRICTION_LABELS: DietaryRestrictionLabel = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "Gluten Free",
  dairy_free: "Dairy Free",
  nut_free: "Nut Free",
  kosher: "Kosher",
  halal: "Halal",
};
