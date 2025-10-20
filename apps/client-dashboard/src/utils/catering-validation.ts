/**
 * Catering Order Validation Schemas and Utilities
 * 
 * This file provides robust validation and input sanitization for the catering widget.
 * Prevents XSS attacks and ensures data integrity.
 */

import * as yup from 'yup';
import DOMPurify from 'dompurify';
import { CateringServiceType, DietaryRestriction } from '@/types/catering';

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes text input to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 */
export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] // No attributes allowed
  }).trim();
};

/**
 * Sanitizes email input
 * Removes dangerous characters while preserving email format
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  // Remove any HTML and dangerous characters, but keep email-valid characters
  return DOMPurify.sanitize(email, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim().toLowerCase();
};

/**
 * Sanitizes phone number input
 * Keeps only numbers, spaces, dashes, parentheses, and plus sign
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^\d\s\-()+]/g, '').trim();
};

/**
 * Sanitizes multiline text (addresses, special instructions)
 * Allows basic structure but removes dangerous content
 */
export const sanitizeMultilineText = (text: string): string => {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML
    ALLOWED_ATTR: []
  }).trim();
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Email validation with comprehensive checks
 */
export const emailSchema = yup
  .string()
  .required('Email is required')
  .email('Please enter a valid email address')
  .matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    'Email format is invalid'
  )
  .max(255, 'Email is too long');

/**
 * Phone number validation (optional but must be valid if provided)
 */
export const phoneSchema = yup
  .string()
  .nullable()
  .notRequired()
  .matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    'Please enter a valid phone number'
  );

/**
 * Name validation (contact name, venue name, event name)
 */
export const nameSchema = yup
  .string()
  .required('This field is required')
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .matches(
    /^[a-zA-Z0-9\s\-',.&()]+$/,
    'Name contains invalid characters'
  );

/**
 * Optional name validation (for optional fields)
 */
export const optionalNameSchema = yup
  .string()
  .nullable()
  .notRequired()
  .max(100, 'Name is too long')
  .matches(
    /^[a-zA-Z0-9\s\-',.&()]*$/,
    'Name contains invalid characters'
  );

/**
 * Guest count validation
 */
export const guestCountSchema = (min: number, max?: number) =>
  yup
    .number()
    .required('Guest count is required')
    .min(min, `Minimum ${min} guests required`)
    .max(max || 10000, `Maximum ${max || 10000} guests allowed`)
    .integer('Guest count must be a whole number');

/**
 * Date validation (must be in the future)
 */
export const eventDateSchema = yup
  .string()
  .required('Event date is required')
  .test('is-future-date', 'Event date must be in the future', (value) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  });

/**
 * Time validation (HH:MM format)
 */
export const timeSchema = yup
  .string()
  .required('Time is required')
  .matches(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Time must be in HH:MM format'
  );

/**
 * Service type validation
 */
export const serviceTypeSchema = yup
  .string()
  .required('Service type is required')
  .oneOf(
    ['pickup', 'delivery', 'drop_off', 'full_service'],
    'Invalid service type'
  );

/**
 * Address validation
 */
export const addressSchema = yup
  .string()
  .nullable()
  .notRequired()
  .max(500, 'Address is too long');

/**
 * Special instructions validation
 */
export const specialInstructionsSchema = yup
  .string()
  .nullable()
  .notRequired()
  .max(1000, 'Special instructions are too long');

/**
 * Complete order form validation schema
 */
export const cateringOrderSchema = (
  packageMinGuests: number,
  packageMaxGuests?: number
) =>
  yup.object({
    event_name: nameSchema,
    event_date: eventDateSchema,
    event_start_time: timeSchema,
    event_end_time: timeSchema.nullable().notRequired(),
    guest_count: guestCountSchema(packageMinGuests, packageMaxGuests),
    service_type: serviceTypeSchema,
    contact_name: nameSchema,
    contact_email: emailSchema,
    contact_phone: phoneSchema,
    venue_name: optionalNameSchema,
    venue_address: addressSchema,
    delivery_address: addressSchema,
    special_instructions: specialInstructionsSchema,
    dietary_requirements: yup
      .array()
      .of(yup.string().oneOf(['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher', 'nut_free']))
      .notRequired(),
  });

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a single field and returns error message
 */
export const validateField = async (
  fieldName: string,
  value: any,
  schema: yup.AnySchema
): Promise<string | null> => {
  try {
    await schema.validate(value);
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.message;
    }
    return 'Validation error';
  }
};

/**
 * Validates the entire form and returns all errors
 */
export const validateForm = async (
  data: any,
  schema: yup.AnySchema
): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Validation failed' } };
  }
};

/**
 * Real-time field validation with debounce support
 */
export const createFieldValidator = (schema: yup.AnySchema) => {
  let timeoutId: NodeJS.Timeout;
  
  return (value: any, callback: (error: string | null) => void, delay = 300) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(async () => {
      const error = await validateField('field', value, schema);
      callback(error);
    }, delay);
  };
};

// ============================================================================
// FORM SANITIZATION
// ============================================================================

/**
 * Sanitizes all form data before submission
 */
export interface CateringOrderFormData {
  package_id?: string;
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
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements: DietaryRestriction[];
}

export const sanitizeOrderForm = (
  form: CateringOrderFormData
): CateringOrderFormData => {
  return {
    ...form,
    event_name: sanitizeTextInput(form.event_name),
    event_date: form.event_date, // Date fields don't need sanitization
    event_start_time: form.event_start_time,
    event_end_time: form.event_end_time,
    guest_count: Number(form.guest_count), // Ensure it's a number
    service_type: form.service_type,
    contact_name: sanitizeTextInput(form.contact_name),
    contact_email: sanitizeEmail(form.contact_email),
    contact_phone: form.contact_phone ? sanitizePhone(form.contact_phone) : undefined,
    venue_name: form.venue_name ? sanitizeTextInput(form.venue_name) : undefined,
    venue_address: form.venue_address ? sanitizeMultilineText(form.venue_address) : undefined,
    delivery_address: form.delivery_address ? sanitizeMultilineText(form.delivery_address) : undefined,
    special_instructions: form.special_instructions ? sanitizeMultilineText(form.special_instructions) : undefined,
    dietary_requirements: form.dietary_requirements || [],
  };
};
