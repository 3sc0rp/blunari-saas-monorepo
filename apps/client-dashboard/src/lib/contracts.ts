import { z } from 'zod';

// Core business object schemas
export const ReservationZ = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tableId: z.string(),
  section: z.enum(['Patio', 'Bar', 'Main']),
  start: z.string().datetime(),
  end: z.string().datetime(),
  partySize: z.number().int().min(1).max(20),
  channel: z.enum(['WEB', 'PHONE', 'WALKIN']),
  vip: z.boolean().default(false),
  guestName: z.string().min(1),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
  status: z.enum(['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('CONFIRMED'),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().optional(),
  specialRequests: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const TableRowZ = z.object({
  id: z.string(),
  name: z.string(),
  section: z.enum(['Patio', 'Bar', 'Main']),
  seats: z.number().int().min(1).max(20),
  status: z.enum(['AVAILABLE', 'SEATED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const PolicyZ = z.object({
  tenantId: z.string().uuid(),
  depositsEnabled: z.boolean().default(false),
  depositAmount: z.number().default(25),
  minPartyForDeposit: z.number().int().min(1).max(20).default(6),
  advanceBookingDays: z.number().int().min(1).max(365).default(30),
  cancellationPolicy: z.string().optional(),
  businessHours: z.array(z.object({
    day: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string()
  })).optional()
});

export const KpiCardZ = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  tone: z.enum(['default', 'success', 'warning', 'danger']).default('default'),
  spark: z.array(z.number()).optional(),
  hint: z.string().optional(),
  format: z.enum(['number', 'percentage', 'currency']).default('number')
});

// API request/response schemas
export const CreateReservationRequestZ = z.object({
  tableId: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  partySize: z.number().int().min(1).max(20),
  guestName: z.string().min(1),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
  specialRequests: z.string().optional(),
  channel: z.enum(['WEB', 'PHONE', 'WALKIN']).default('WEB')
});

export const MoveReservationRequestZ = z.object({
  reservationId: z.string().uuid(),
  tableId: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
}).refine(data => data.tableId || data.start || data.end, {
  message: "At least one field (tableId, start, or end) must be provided"
});

export const CancelReservationRequestZ = z.object({
  reservationId: z.string().uuid(),
  reason: z.string().optional()
});

// Error handling schema
export const ErrorEnvelopeZ = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  issues: z.array(z.object({ 
    path: z.string(), 
    message: z.string() 
  })).optional()
});

// API response wrappers
export const ApiResponseZ = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema.optional(),
  error: ErrorEnvelopeZ.optional()
});

// Filters schema
export const FiltersZ = z.object({
  section: z.enum(['all', 'Patio', 'Bar', 'Main']).default('all'),
  status: z.enum(['all', 'CONFIRMED', 'SEATED', 'COMPLETED']).default('all'),
  channel: z.enum(['all', 'WEB', 'PHONE', 'WALKIN']).default('all'),
  partySize: z.object({
    min: z.number().int().min(1).optional(),
    max: z.number().int().max(20).optional()
  }).optional(),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional()
});

// Tenant info schema
export const TenantInfoZ = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string().default('America/New_York'),
  currency: z.string().default('USD')
});

// Export inferred types
export type Reservation = z.infer<typeof ReservationZ>;
export type TableRow = z.infer<typeof TableRowZ>;
export type Policy = z.infer<typeof PolicyZ>;
export type KpiCard = z.infer<typeof KpiCardZ>;
export type CreateReservationRequest = z.infer<typeof CreateReservationRequestZ>;
export type MoveReservationRequest = z.infer<typeof MoveReservationRequestZ>;
export type CancelReservationRequest = z.infer<typeof CancelReservationRequestZ>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeZ>;
export type ApiResponse<T> = {
  data?: T;
  error?: ErrorEnvelope;
};
export type Filters = z.infer<typeof FiltersZ>;
export type TenantInfo = z.infer<typeof TenantInfoZ>;

// Validation helpers
export const validateReservation = (data: unknown) => ReservationZ.parse(data);
export const validateTableRow = (data: unknown) => TableRowZ.parse(data);
export const validatePolicy = (data: unknown) => PolicyZ.parse(data);
export const validateKpiCard = (data: unknown) => KpiCardZ.parse(data);
export const validateCreateReservationRequest = (data: unknown) => CreateReservationRequestZ.parse(data);
export const validateMoveReservationRequest = (data: unknown) => MoveReservationRequestZ.parse(data);
export const validateCancelReservationRequest = (data: unknown) => CancelReservationRequestZ.parse(data);
export const validateFilters = (data: unknown) => FiltersZ.parse(data);

// Mock data guards
export const isDevelopment = () => import.meta.env.VITE_APP_ENV === 'development';
export const isMockDataEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
export const shouldUseMocks = () => isDevelopment() && isMockDataEnabled();
