export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  restaurantName: string;
  tagline?: string;
  customDomain?: string;
  domainStatus: 'pending' | 'verified' | 'failed';
}

export interface OperationalSettings {
  businessHours: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };
  timezone: string;
  defaultServiceDuration: number;
  tableCapacities: { [tableId: string]: number };
  depositPolicy: {
    enabled: boolean;
    defaultAmount: number;
    largePartyThreshold: number;
    largePartyAmount: number;
  };
  advanceBookingDays: number;
  cancellationPolicy: string;
}

export interface IntegrationSettings {
  sms: {
    provider: 'twilio' | 'disabled';
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    fromNumber?: string;
    enabled: boolean;
  };
  email: {
    provider: 'resend' | 'disabled';
    resendApiKey?: string;
    fromEmail?: string;
    fromName?: string;
    enabled: boolean;
  };
  pos: {
    provider: 'square' | 'toast' | 'disabled';
    apiKey?: string;
    webhookUrl?: string;
    enabled: boolean;
  };
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    enabled: boolean;
  };
}

export interface NotificationSettings {
  email: {
    confirmations: boolean;
    reminders: boolean;
    reminderHours: number;
    cancellations: boolean;
    noshowAlerts: boolean;
  };
  sms: {
    confirmations: boolean;
    reminders: boolean;
    reminderHours: number;
    cancellations: boolean;
  };
  staff: {
    overbookingAlerts: boolean;
    noshowAlerts: boolean;
    cancellationAlerts: boolean;
    dailySummary: boolean;
    summaryTime: string;
  };
  customer: {
    waitlistUpdates: boolean;
    promotionalEmails: boolean;
    birthdayReminders: boolean;
  };
}

export interface TenantSettings {
  branding: BrandingSettings;
  operational: OperationalSettings;
  integrations: IntegrationSettings;
  notifications: NotificationSettings;
  lastUpdated: string;
}