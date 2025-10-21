// Comprehensive Catering system types for client dashboard
export type CateringServiceType =
  | "pickup"
  | "delivery"
  | "drop_off"
  | "full_service";
export type CateringOrderStatus =
  | "inquiry"
  | "quoted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "kosher"
  | "halal"
  | "keto"
  | "paleo";
export type CateringDietaryAccommodation = DietaryRestriction;

// Pricing models for catering packages
export type CateringPricingType = 
  | "per_person"  // Price multiplied by guest count (e.g., $15/person)
  | "per_tray"    // Fixed price per tray/batch (e.g., $80/tray serves 8-10)
  | "fixed";      // One-time flat fee (e.g., $500 total)

// Core interfaces
export interface CateringEventType {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringMenuCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
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
  base_price: number;
  unit: string;
  dietary_restrictions: DietaryRestriction[];
  allergen_info?: string;
  image_url?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringEquipment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  quantity_available: number;
  rental_price_per_day: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  
  // Pricing fields
  pricing_type: CateringPricingType;  // Determines which pricing model to use
  price_per_person: number;           // Used when pricing_type = 'per_person' (in cents)
  base_price?: number;                // Used when pricing_type = 'per_tray' or 'fixed' (in cents)
  serves_count?: number;              // For per_tray: how many people one tray serves
  tray_description?: string;          // For per_tray: e.g., "Each tray serves 8-10 guests"
  
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
}

export interface CateringPackageItem {
  id: string;
  package_id: string;
  menu_item_id: string;
  quantity_per_person: number;
  is_included: boolean;
  additional_cost_per_person?: number;
  created_at: string;
}

export interface CateringOrder {
  id: string;
  tenant_id: string;
  package_id?: string;
  event_type_id?: string;
  user_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  service_type: CateringServiceType;
  status: CateringOrderStatus;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements: DietaryRestriction[];
  subtotal?: number;
  tax_amount?: number;
  service_fee?: number;
  delivery_fee?: number;
  total_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  balance_due?: number;
  payment_terms?: string;
  setup_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  catering_packages?: CateringPackage;
  catering_feedback?: CateringFeedback[];
}

export interface CateringOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  created_at: string;
}

export interface CateringOrderHistory {
  id: string;
  order_id: string;
  status: CateringOrderStatus;
  notes?: string;
  changed_by?: string;
  created_at: string;
}

export interface CateringQuote {
  id: string;
  order_id: string;
  quote_number: string;
  subtotal: number;
  tax_amount: number;
  service_fee: number;
  delivery_fee: number;
  total_amount: number;
  deposit_amount: number;
  valid_until: string;
  terms_and_conditions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CateringOrderEquipment {
  id: string;
  order_id: string;
  equipment_id: string;
  quantity: number;
  rental_days: number;
  unit_price: number;
  total_price: number;
  delivery_date: string;
  pickup_date: string;
  created_at: string;
}

export interface CateringStaffAssignment {
  id: string;
  order_id: string;
  staff_user_id: string;
  role: string;
  start_time: string;
  end_time: string;
  hourly_rate?: number;
  total_hours?: number;
  total_cost?: number;
  notes?: string;
  created_at: string;
}

export interface CateringFeedback {
  id: string;
  order_id: string;
  customer_id?: string;
  overall_rating: number;
  food_quality_rating: number;
  service_rating: number;
  presentation_rating: number;
  comments?: string;
  would_recommend: boolean;
  improvements_suggested?: string;
  created_at: string;
  rating: number; // Alias for overall_rating
}

// Form interfaces
export interface CreateCateringOrderRequest {
  package_id?: string;
  event_type_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  service_type: CateringServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string | { street: string; city: string; state: string; zip_code: string; country: string };
  special_instructions?: string;
  dietary_requirements?: DietaryRestriction[] | string;
}

export interface UpdateCateringOrderRequest {
  status?: CateringOrderStatus;
  event_name?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  guest_count?: number;
  service_type?: CateringServiceType;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements?: DietaryRestriction[];
  subtotal?: number;
  tax_amount?: number;
  service_fee?: number;
  delivery_fee?: number;
  total_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  balance_due?: number;
  payment_terms?: string;
  setup_time?: string;
  notes?: string;
}

export interface CreateCateringPackageRequest {
  name: string;
  description?: string;
  price_per_person: number;
  min_guests: number;
  max_guests?: number;
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  dietary_accommodations: DietaryRestriction[];
  image_url?: string;
  popular?: boolean;
}

export interface UpdateCateringPackageRequest {
  name?: string;
  description?: string;
  price_per_person?: number;
  min_guests?: number;
  max_guests?: number;
  includes_setup?: boolean;
  includes_service?: boolean;
  includes_cleanup?: boolean;
  dietary_accommodations?: DietaryRestriction[];
  image_url?: string;
  popular?: boolean;
  active?: boolean;
}

// Filter interfaces
export interface CateringOrderFilters {
  status: CateringOrderStatus[];
  service_type: CateringServiceType[];
  date_range: {
    start: string;
    end: string;
  };
  search: string;
}

// Analytics interfaces
export interface CateringOrderMetrics {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  inquiry: number;
  quoted: number;
  conversion_rate: number;
  average_lead_time: number;
  guest_count_total: number;
  average_guest_count: number;
}

export interface CateringRevenueMetrics {
  total: number;
  confirmed: number;
  completed: number;
  pending: number;
  average_order_value: number;
  deposits_collected: number;
  deposits_pending: number;
  revenue_by_service_type: Record<CateringServiceType, number>;
}

export interface CateringPerformanceMetrics {
  popular_packages: Array<{
    package_id: string;
    name: string;
    count: number;
    revenue: number;
  }>;
  busiest_days: Array<{
    day: string;
    count: number;
  }>;
  service_type_distribution: Record<CateringServiceType, number>;
  monthly_trend: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
  customer_satisfaction: number;
  repeat_customer_rate: number;
}

export interface CateringAnalytics {
  orders: CateringOrderMetrics;
  revenue: CateringRevenueMetrics;
  performance: CateringPerformanceMetrics;
}

export interface CateringPopularPackage {
  package_id: string;
  package_name: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  avg_guest_count: number;
}

export interface CateringPackageMetric {
  package_id: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  conversion_rate: number;
}

// Constants
export const CATERING_SERVICE_TYPE_LABELS: Record<CateringServiceType, string> =
  {
    pickup: "Customer Pickup",
    delivery: "Delivery Only",
    drop_off: "Drop-off Service",
    full_service: "Full Service with Staff",
  };

export const CATERING_STATUS_COLORS: Record<CateringOrderStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  quoted: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export const DIETARY_ACCOMMODATIONS: {
  value: DietaryRestriction;
  label: string;
}[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "kosher", label: "Kosher" },
  { value: "halal", label: "Halal" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
];
