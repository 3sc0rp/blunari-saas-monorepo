// Centralized types for Widget Management
export type WidgetTheme = 'light' | 'dark' | 'auto';
export type WidgetFontFamily = 'system' | 'inter' | 'roboto' | 'open-sans' | 'lato';
export type WidgetFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type WidgetAlignment = 'left' | 'center' | 'right';
export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetAnimationType = 'none' | 'fade' | 'slide' | 'bounce' | 'scale';
export type WidgetType = 'booking' | 'catering';
export type BookingSource = 'widget' | 'website' | 'social' | 'partner';

export interface WidgetConfig {
  // Appearance
  theme: WidgetTheme;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadowIntensity: number;

  // Typography
  fontFamily: WidgetFontFamily;
  fontSize: number;
  fontWeight: WidgetFontWeight;
  lineHeight: number;

  // Content
  welcomeMessage: string;
  description: string;
  buttonText: string;
  footerText: string;

  // Layout
  width: number;
  height: number;
  padding: number;
  spacing: number;
  alignment: WidgetAlignment;
  size: WidgetSize;

  // Features
  showLogo: boolean;
  showDescription: boolean;
  showFooter: boolean;
  compactMode: boolean;
  enableAnimations: boolean;
  animationType: WidgetAnimationType;

  // Booking-specific features
  enableTableOptimization: boolean;
  showAvailabilityIndicator: boolean;
  requireDeposit: boolean;
  enableSpecialRequests: boolean;
  showDurationSelector: boolean;
  enablePhoneBooking: boolean;
  maxPartySize: number;
  minAdvanceBooking: number; // hours
  maxAdvanceBooking: number; // days

  // Advanced
  customCss: string;
  customJs: string;
  isEnabled: boolean;
  bookingSource: BookingSource;

  // Behavior
  autoFocus: boolean;
  closeOnOutsideClick: boolean;
  showCloseButton: boolean;

  // Embedding
  safeArea: boolean; // Apply safe area padding for mobile devices with notches/status bars
}

export interface WidgetAnalytics {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  avgSessionDuration: number;
  totalBookings?: number;
  completionRate?: number;
  avgPartySize?: number;
  avgOrderValue?: number; // For catering widgets
  peakHours?: Array<{ hour: number; bookings: number }> | null;
  topSources: Array<{ source: string; count: number }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
    bookings?: number;
    revenue?: number;
  }>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PersistedConfigMeta {
  lastSaved: string;
  version: string;
}

export interface PersistedWidgetConfig extends WidgetConfig, PersistedConfigMeta {}

// Centralized constraints for Widget Management forms
export const WIDGET_CONFIG_LIMITS = {
  welcomeMessage: { max: 120 },
  description: { max: 240 },
  buttonText: { max: 40 },
  footerText: { max: 120 },
  customCss: { max: 4000 },
  customJs: { max: 4000 },
  width: { min: 300, max: 1200, default: 400 },
  height: { min: 300, max: 1200, default: 600 },
  borderRadius: { min: 0, max: 32 },
  shadowIntensity: { min: 0, max: 20 },
  fontSize: { min: 10, max: 28 },
  lineHeight: { min: 1, max: 2 },
  maxPartySize: { min: 1, max: 20 },
  minAdvanceBooking: { min: 0, max: 720 }, // hours
  maxAdvanceBooking: { min: 1, max: 180 }  // days
} as const;