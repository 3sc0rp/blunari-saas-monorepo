import { WidgetConfig, ValidationError } from './types';

const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function validateConfig(config: WidgetConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required text fields
  if (!config.welcomeMessage?.trim()) {
    errors.push({ field: 'welcomeMessage', message: 'Welcome message is required' });
  }
  if (!config.buttonText?.trim()) {
    errors.push({ field: 'buttonText', message: 'Button text is required' });
  }

  // Numeric validations
  if (!config.width || config.width < 300 || config.width > 800) {
    errors.push({ field: 'width', message: 'Width must be between 300 and 800 pixels' });
  }
  if (!config.height || config.height < 400 || config.height > 1000) {
    errors.push({ field: 'height', message: 'Height must be between 400 and 1000 pixels' });
  }
  if (!config.fontSize || config.fontSize < 10 || config.fontSize > 24) {
    errors.push({ field: 'fontSize', message: 'Font size must be between 10 and 24 pixels' });
  }

  // Color validations
  if (!colorRegex.test(config.primaryColor)) {
    errors.push({ field: 'primaryColor', message: 'Primary color must be a valid hex color' });
  }
  if (!colorRegex.test(config.secondaryColor)) {
    errors.push({ field: 'secondaryColor', message: 'Secondary color must be a valid hex color' });
  }
  if (!colorRegex.test(config.backgroundColor)) {
    errors.push({ field: 'backgroundColor', message: 'Background color must be a valid hex color' });
  }
  if (!colorRegex.test(config.textColor)) {
    errors.push({ field: 'textColor', message: 'Text color must be a valid hex color' });
  }

  // Booking-specific validations
  if (!config.maxPartySize || config.maxPartySize < 1 || config.maxPartySize > 100) {
    errors.push({ field: 'maxPartySize', message: 'Max party size must be between 1 and 100' });
  }
  if (config.minAdvanceBooking < 0 || config.minAdvanceBooking > 48) {
    errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be between 0 and 48 hours' });
  }
  if (!config.maxAdvanceBooking || config.maxAdvanceBooking < 1 || config.maxAdvanceBooking > 365) {
    errors.push({ field: 'maxAdvanceBooking', message: 'Max advance booking must be between 1 and 365 days' });
  }

  if (config.minAdvanceBooking >= (config.maxAdvanceBooking * 24)) {
    errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be less than max advance booking' });
  }

  return errors;
}
