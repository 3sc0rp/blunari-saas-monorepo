export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySettings {
  id: string;
  userId: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes: string[];
  passwordLastChanged: string;
  sessionTimeout: number;
  apiKeysEnabled: boolean;
  loginNotificationsEnabled: boolean;
  securityEmailsEnabled: boolean;
  trustedDevices: TrustedDevice[];
  updatedAt: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  location?: string;
  ipAddress: string;
  lastSeen: string;
  trusted: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: {
    bookingConfirmations: boolean;
    systemAlerts: boolean;
    weeklyReports: boolean;
    securityAlerts: boolean;
    accountUpdates: boolean;
    marketingEmails: boolean;
  };
  smsNotifications: {
    urgentAlerts: boolean;
    bookingReminders: boolean;
    systemDowntime: boolean;
    securityAlerts: boolean;
  };
  dashboardNotifications: {
    realTimeUpdates: boolean;
    showToasts: boolean;
    soundEnabled: boolean;
    desktopNotifications: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
  };
  location: {
    ip: string;
    country?: string;
    city?: string;
    region?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  actionType: 'authentication' | 'profile' | 'security' | 'data' | 'system';
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  success: boolean;
  timestamp: string;
}

export interface ThemePreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  fontSize: 'small' | 'medium' | 'large';
  animationsEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  customCss?: string;
  updatedAt: string;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  description?: string;
  keyPreview: string; // Only first 8 characters + "..."
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
}