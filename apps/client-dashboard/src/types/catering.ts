// Catering system types for client dashboard
export type CateringServiceType = 'drop_off' | 'buffet_setup' | 'plated_service' | 'stationed_service';
export type CateringOrderStatus = 'inquiry' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type CateringDietaryAccommodation = 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'kosher' | 'halal' | 'keto' | 'paleo';

// Core interfaces
export interface CateringPackage {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price_per_person: number;
  min_guests: number;
  max_guests: number;
  service_types: CateringServiceType[];
  dietary_accommodations?: CateringDietaryAccommodation[];
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  popular: boolean;
  image_url?: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CateringOrder {
  id: string;
  tenant_id: string;
  package_id: string;
  user_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  guest_count: number;
  service_type: CateringServiceType;
  status: CateringOrderStatus;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  special_instructions?: string;
  dietary_requirements: CateringDietaryAccommodation[];
  subtotal?: number;
  tax_amount?: number;
  service_fee?: number;
  delivery_fee?: number;
  total_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form interfaces
export interface CateringOrderCreate {
  package_id: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  guest_count: number;
  service_type: CateringServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  special_instructions?: string;
  dietary_requirements: CateringDietaryAccommodation[];
}

export interface CateringOrderUpdate {
  status?: CateringOrderStatus;
  subtotal?: number;
  tax_amount?: number;
  service_fee?: number;
  delivery_fee?: number;
  total_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  notes?: string;
}

// Analytics interfaces
export interface CateringAnalytics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  average_guest_count: number;
  conversion_rate: number;
  revenue_growth?: number;
  popular_packages: CateringPopularPackage[];
  package_metrics: CateringPackageMetric[];
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
export const CATERING_SERVICE_TYPE_LABELS: Record<CateringServiceType, string> = {
  drop_off: 'Drop-off Service',
  buffet_setup: 'Buffet Setup & Service',
  plated_service: 'Full Plated Service',
  stationed_service: 'Stationed Service'
};

export const CATERING_STATUS_COLORS: Record<CateringOrderStatus, string> = {
  inquiry: 'bg-blue-100 text-blue-800',
  quoted: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

export const DIETARY_ACCOMMODATIONS: { value: CateringDietaryAccommodation; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'halal', label: 'Halal' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' }
];
