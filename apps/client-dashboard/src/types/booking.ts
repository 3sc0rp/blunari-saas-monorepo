export type BookingStatus = 'confirmed' | 'pending' | 'seated' | 'completed' | 'cancelled' | 'noshow';
export type BookingSource = 'phone' | 'walk_in' | 'website' | 'social' | 'partner';

export interface BookingFormData {
  customerName: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  duration?: number;
  tablePreference?: string;
  specialRequests?: string;
  source: BookingSource;
  depositRequired?: boolean;
  depositAmount?: number;
}

export interface BookingFilters {
  status: BookingStatus[];
  dateRange: { start: string; end: string };
  sources: BookingSource[];
  partySize?: { min: number; max: number };
  search?: string;
  staffMember?: string;
}

export interface ExtendedBooking {
  id: string;
  tenant_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  party_size: number;
  booking_time: string;
  duration_minutes: number;
  status: BookingStatus;
  table_id?: string;
  special_requests?: string;
  source?: BookingSource;
  deposit_required?: boolean;
  deposit_amount?: number;
  deposit_paid?: boolean;
  eta_prediction?: number;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface TableOptimization {
  tableId: string;
  tableName: string;
  capacity: number;
  utilization: number;
  recommendationScore: number;
  conflicts: number;
}

export interface BulkOperation {
  type: 'status_update' | 'send_notification' | 'export' | 'delete';
  bookingIds: string[];
  data?: any;
}