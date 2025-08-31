import { z } from 'zod';

// Live API Response Schemas - no mocks, only what comes from real endpoints
export const TenantInfoSchema = z.object({
  tenant_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  timezone: z.string(),
  currency: z.string().optional(),
  branding: z.object({
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
    logo_url: z.string().optional(),
  }).optional(),
  features: z.object({
    deposit_enabled: z.boolean().optional(),
    revenue_optimization: z.boolean().optional(),
  }).optional(),
});

export const TimeSlotSchema = z.object({
  time: z.string(), // ISO string
  available_tables: z.number(),
  revenue_projection: z.number().optional(), // Only if API provides it
  optimal: z.boolean().optional(), // Only if API provides it
});

export const AvailabilityResponseSchema = z.object({
  slots: z.array(TimeSlotSchema),
  alternatives: z.array(TimeSlotSchema).optional(), // Only if API provides alternatives
});

export const SearchRequestSchema = z.object({
  tenant_id: z.string().uuid(),
  party_size: z.number().min(1),
  service_date: z.string(), // ISO date
  time_window: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  preferences: z.object({
    table_type: z.string().optional(),
    accessibility: z.boolean().optional(),
  }).optional(),
});

export const HoldRequestSchema = z.object({
  tenant_id: z.string().uuid(),
  party_size: z.number(),
  slot: TimeSlotSchema,
  policy_params: z.record(z.string(), z.any()).optional(),
});

export const HoldResponseSchema = z.object({
  hold_id: z.string().uuid(),
  expires_at: z.string(), // ISO string
  table_identifiers: z.array(z.string()).optional(),
});

export const GuestDetailsSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  special_requests: z.string().optional(),
});

export const ReservationRequestSchema = z.object({
  tenant_id: z.string().uuid(),
  hold_id: z.string().uuid(),
  guest_details: GuestDetailsSchema,
});

export const ReservationResponseSchema = z.object({
  reservation_id: z.string().uuid(),
  confirmation_number: z.string(),
  status: z.enum(['confirmed', 'pending', 'waitlisted']),
  summary: z.object({
    date: z.string(),
    time: z.string(),
    party_size: z.number(),
    table_info: z.string().optional(),
    deposit_required: z.boolean().optional(),
    deposit_amount: z.number().optional(),
  }),
});

export const DepositPolicySchema = z.object({
  enabled: z.boolean(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
});

export const PolicyResponseSchema = z.object({
  deposit: DepositPolicySchema,
  cancellation: z.object({
    allowed_hours: z.number().optional(),
    fee_percentage: z.number().optional(),
  }).optional(),
});

export const ROIMetricsSchema = z.object({
  fees_avoided: z.number().optional(),
  additional_covers: z.number().optional(),
  experience_score: z.number().optional(),
  total_value: z.number().optional(),
});

// Type exports
export type TenantInfo = z.infer<typeof TenantInfoSchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type HoldRequest = z.infer<typeof HoldRequestSchema>;
export type HoldResponse = z.infer<typeof HoldResponseSchema>;
export type GuestDetails = z.infer<typeof GuestDetailsSchema>;
export type ReservationRequest = z.infer<typeof ReservationRequestSchema>;
export type ReservationResponse = z.infer<typeof ReservationResponseSchema>;
export type DepositPolicy = z.infer<typeof DepositPolicySchema>;
export type PolicyResponse = z.infer<typeof PolicyResponseSchema>;
export type ROIMetrics = z.infer<typeof ROIMetricsSchema>;

// Booking Flow State
export interface BookingState {
  step: 1 | 2 | 3 | 4;
  tenant: TenantInfo | null;
  party_size: number | null;
  selected_slot: TimeSlot | null;
  hold: HoldResponse | null;
  guest_details: GuestDetails | null;
  policies: PolicyResponse | null;
  start_time: number; // For timing gamification
  step_times: number[]; // Time spent on each step
}

// Error types for live API failures
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}