/**
 * Booking Validation Schemas
 * Production-grade validation using Zod
 */

import { z } from 'zod';

// Phone number validation (E.164 format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Email validation (more strict than HTML5)
const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(100, 'Email must not exceed 100 characters')
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  );

// Phone number validation
const phoneSchema = z.string()
  .regex(phoneRegex, 'Invalid phone number. Use format: +1234567890')
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits');

// Party size validation
const partySizeSchema = z.number()
  .int('Party size must be a whole number')
  .min(1, 'Party size must be at least 1')
  .max(50, 'Party size cannot exceed 50 guests');

// Special requests validation (XSS protection)
const specialRequestsSchema = z.string()
  .max(500, 'Special requests must not exceed 500 characters')
  .refine(
    (text) => !/<script|javascript:|onerror=|onclick=/i.test(text),
    'Special requests contain invalid characters'
  )
  .optional();

// Guest name validation
const guestNameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Date validation (must be future date)
const futureDateSchema = z.string()
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      return date >= now;
    },
    'Booking date must be today or in the future'
  );

// Time validation (HH:MM format)
const timeSchema = z.string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM')
  .refine(
    (time) => {
      const [hours] = time.split(':').map(Number);
      return hours >= 0 && hours < 24;
    },
    'Time must be between 00:00 and 23:59'
  );

// Duration validation
const durationSchema = z.number()
  .int('Duration must be a whole number')
  .min(15, 'Duration must be at least 15 minutes')
  .max(360, 'Duration cannot exceed 6 hours (360 minutes)')
  .optional();

// Booking source validation
const sourceSchema = z.enum(['phone', 'walk_in', 'website', 'social', 'partner']);

// Deposit validation
const depositAmountSchema = z.number()
  .nonnegative('Deposit amount cannot be negative')
  .max(10000, 'Deposit amount cannot exceed $10,000')
  .optional();

/**
 * Complete Booking Form Validation Schema
 */
export const bookingFormSchema = z.object({
  customerName: guestNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  partySize: partySizeSchema,
  date: futureDateSchema,
  time: timeSchema,
  duration: durationSchema,
  tablePreference: z.string().optional(),
  specialRequests: specialRequestsSchema,
  source: sourceSchema,
  depositRequired: z.boolean().optional(),
  depositAmount: depositAmountSchema,
  depositPaid: z.boolean().optional(),
  payment_intent_id: z.string().optional(),
});

/**
 * Booking Update Schema (partial updates allowed)
 */
export const bookingUpdateSchema = bookingFormSchema.partial();

/**
 * Search/Filter Validation
 */
export const bookingSearchSchema = z.string()
  .max(100, 'Search query too long')
  .refine(
    (text) => !/[<>]/.test(text),
    'Search query contains invalid characters'
  );

/**
 * Bulk Operation Validation
 */
export const bulkOperationSchema = z.object({
  bookingIds: z.array(z.string().uuid()).min(1, 'At least one booking must be selected').max(100, 'Cannot bulk update more than 100 bookings at once'),
  operation: z.enum(['status_update', 'send_notification', 'export', 'delete']),
  data: z.record(z.string(), z.any()).optional()
});

/**
 * Sanitize text input (additional layer of XSS protection)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format (additional check)
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone format (additional check)
 */
export function isValidPhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format phone number to E.164
 */
export function formatPhoneE164(phone: string, countryCode: string = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If no country code, add default
  if (!phone.startsWith('+')) {
    return `${countryCode}${digits}`;
  }
  
  return `+${digits}`;
}

/**
 * Validate booking time slot (business hours)
 */
export function isValidBookingTime(time: string, businessHours?: { open: string; close: string }): boolean {
  if (!businessHours) return true;
  
  const [hours, minutes] = time.split(':').map(Number);
  const timeValue = hours * 60 + minutes;
  
  const [openHours, openMinutes] = businessHours.open.split(':').map(Number);
  const openValue = openHours * 60 + openMinutes;
  
  const [closeHours, closeMinutes] = businessHours.close.split(':').map(Number);
  const closeValue = closeHours * 60 + closeMinutes;
  
  return timeValue >= openValue && timeValue <= closeValue;
}

/**
 * Validate party size against table capacity
 */
export function isValidPartySize(partySize: number, tableCapacity?: number): boolean {
  if (!tableCapacity) return true;
  return partySize <= tableCapacity;
}

// Export types
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type BookingUpdateData = z.infer<typeof bookingUpdateSchema>;
export type BulkOperationData = z.infer<typeof bulkOperationSchema>;
