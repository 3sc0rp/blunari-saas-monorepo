import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantSettings, BrandingSettings, OperationalSettings, IntegrationSettings, NotificationSettings } from '@/types/settings';
import { useTenant } from './useTenant';
import { toast } from '@/hooks/use-toast';

export const useSettings = () => {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  // Fetch tenant settings from database
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['tenant-settings', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) {
        throw new Error('No tenant ID available');
      }

      try {
        // Fetch all settings for this tenant
        const { data, error } = await supabase
          .from('tenant_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', tenant.id);

        if (error) {
          console.error('Error fetching settings:', error);
          throw error;
        }

        // Convert array to settings object
        const settingsMap = data?.reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, any>) || {};

        // Return settings with defaults for missing values
        const defaultSettings = getDefaultSettings(tenant);
        
        return {
          branding: { ...defaultSettings.branding, ...(settingsMap.branding || {}) },
          operational: { ...defaultSettings.operational, ...(settingsMap.operational || {}) },
          integrations: { ...defaultSettings.integrations, ...(settingsMap.integrations || {}) },
          notifications: { ...defaultSettings.notifications, ...(settingsMap.notifications || {}) },
          lastUpdated: new Date().toISOString()
        } as TenantSettings;
      } catch (err) {
        console.error('Settings fetch error:', err);
        // Return default settings as fallback
        const defaultSettings = getDefaultSettings(tenant);
        return {
          ...defaultSettings,
          lastUpdated: new Date().toISOString()
        };
      }
    },
    enabled: !!tenant?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Helper function to upsert settings
  const upsertSetting = async (key: string, value: any) => {
    if (!tenant?.id) throw new Error('No tenant found');

    const { error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenant.id,
        setting_key: key,
        setting_value: value
      }, {
        onConflict: 'tenant_id,setting_key'
      });

    if (error) {
      console.error(`Error updating ${key} settings:`, error);
      throw error;
    }
  };

  // Update branding settings with database persistence
  const updateBrandingMutation = useMutation({
    mutationFn: async (branding: Partial<BrandingSettings>) => {
      const currentBranding = (settings?.branding || {}) as BrandingSettings;
      const updatedBranding = { ...currentBranding, ...branding };
      
      await upsertSetting('branding', updatedBranding);

      // Also update tenant table for immediate branding updates
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: branding.restaurantName || currentBranding.restaurantName,
          logo_url: branding.logoUrl || currentBranding.logoUrl,
          primary_color: branding.primaryColor || currentBranding.primaryColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant?.id);

      if (tenantError) {
        console.error('Error updating tenant branding:', tenantError);
      }

      return updatedBranding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({
        title: 'Branding Updated',
        description: 'Your branding settings have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Branding update error:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update branding settings. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Update operational settings
  const updateOperationalMutation = useMutation({
    mutationFn: async (operational: Partial<OperationalSettings>) => {
      const currentOperational = settings?.operational || {};
      const updatedOperational = { ...currentOperational, ...operational };
      
      await upsertSetting('operational', updatedOperational);

      return updatedOperational;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', tenant?.id] });
      toast({
        title: "Operational Settings Updated",
        description: "Your operational settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Operational update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update operational settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update integration settings
  const updateIntegrationMutation = useMutation({
    mutationFn: async (integrations: Partial<IntegrationSettings>) => {
      const currentIntegrations = settings?.integrations || {};
      const updatedIntegrations = { ...currentIntegrations, ...integrations };
      
      await upsertSetting('integrations', updatedIntegrations);

      return updatedIntegrations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', tenant?.id] });
      toast({
        title: "Integration Settings Updated",
        description: "Your integration settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Integration update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update notification settings
  const updateNotificationMutation = useMutation({
    mutationFn: async (notifications: Partial<NotificationSettings>) => {
      const currentNotifications = settings?.notifications || {};
      const updatedNotifications = { ...currentNotifications, ...notifications };
      
      await upsertSetting('notifications', updatedNotifications);

      return updatedNotifications;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', tenant?.id] });
      toast({
        title: "Notification Settings Updated",
        description: "Your notification settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Notification update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateBranding: updateBrandingMutation.mutate,
    updateOperational: updateOperationalMutation.mutate,
    updateIntegrations: updateIntegrationMutation.mutate,
    updateNotifications: updateNotificationMutation.mutate,
    isUpdatingBranding: updateBrandingMutation.isPending,
    isUpdatingOperational: updateOperationalMutation.isPending,
    isUpdatingIntegrations: updateIntegrationMutation.isPending,
    isUpdatingNotifications: updateNotificationMutation.isPending,
  };
};

// Helper function to get default settings
const getDefaultSettings = (tenant: any): TenantSettings => ({
  branding: {
    restaurantName: tenant?.name || '',
    tagline: '',
    logoUrl: tenant?.logo_url || '',
    faviconUrl: '',
    primaryColor: tenant?.primary_color || '#1e3a8a',
    secondaryColor: '#f59e0b',
    accentColor: '#059669',
    customDomain: '',
    domainStatus: 'pending'
  },
  operational: {
    timezone: tenant?.timezone || 'America/New_York',
    businessHours: {
      '0': { isOpen: false, openTime: '09:00', closeTime: '22:00' },
      '1': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      '2': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      '3': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      '4': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      '5': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      '6': { isOpen: false, openTime: '09:00', closeTime: '22:00' }
    },
    defaultServiceDuration: 90,
    tableCapacities: {},
    advanceBookingDays: 30,
    cancellationPolicy: 'Cancellations must be made at least 24 hours in advance.',
    depositPolicy: {
      enabled: false,
      defaultAmount: 25.00,
      largePartyThreshold: 8,
      largePartyAmount: 50.00
    }
  },
  integrations: {
    sms: { enabled: false, provider: 'twilio' },
    email: { enabled: true, provider: 'resend' },
    pos: { enabled: false, provider: 'square' },
    analytics: { enabled: true }
  },
  notifications: {
    email: {
      confirmations: true,
      reminders: true,
      cancellations: true,
      noshowAlerts: true,
      reminderHours: 24
    },
    sms: {
      confirmations: false,
      reminders: false,
      cancellations: false,
      reminderHours: 2
    },
    staff: {
      overbookingAlerts: true,
      noshowAlerts: true,
      cancellationAlerts: true,
      dailySummary: true,
      summaryTime: '08:00'
    },
    customer: {
      waitlistUpdates: true,
      promotionalEmails: false,
      birthdayReminders: true
    }
  },
  lastUpdated: new Date().toISOString()
});

export { getDefaultSettings };
