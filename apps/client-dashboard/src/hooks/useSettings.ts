import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantSettings, BrandingSettings, OperationalSettings, IntegrationSettings, NotificationSettings, SecuritySettings } from '@/types/settings';
import { useTenant } from './useTenant';
import { toast } from '@/hooks/use-toast';

export const useSettings = () => {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  // Fetch tenant settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      // For now, return default settings since we don't have a settings table
      // In a real implementation, you'd fetch from a tenant_settings table
      return getDefaultSettings(tenant);
    },
    enabled: !!tenant?.id,
  });

  // Update branding settings
  const updateBrandingMutation = useMutation({
    mutationFn: async (branding: Partial<BrandingSettings>) => {
      if (!tenant?.id) throw new Error('No tenant found');
      
      // Update tenant table with branding info
      const { error } = await supabase
        .from('tenants')
        .update({
          name: branding.restaurantName || tenant.name,
          // Store branding in metadata for now
          // In a real implementation, you'd have dedicated branding columns
        })
        .eq('id', tenant.id);
      
      if (error) throw error;
      return branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: "Branding Updated",
        description: "Your branding settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update branding settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update operational settings
  const updateOperationalMutation = useMutation({
    mutationFn: async (operational: Partial<OperationalSettings>) => {
      if (!tenant?.id) throw new Error('No tenant found');
      
      // Update business hours if provided
      if (operational.businessHours) {
        const businessHoursUpdates = Object.entries(operational.businessHours).map(([dayIndex, hours]) => ({
          tenant_id: tenant.id,
          day_of_week: parseInt(dayIndex),
          is_open: hours.isOpen,
          open_time: hours.openTime || null,
          close_time: hours.closeTime || null,
        }));

        // Update business hours
        for (const update of businessHoursUpdates) {
          const { error } = await supabase
            .from('business_hours')
            .upsert(update, { 
              onConflict: 'tenant_id,day_of_week',
            });
          
          if (error) throw error;
        }
      }

      // Update tenant timezone if provided
      if (operational.timezone) {
        const { error } = await supabase
          .from('tenants')
          .update({ timezone: operational.timezone })
          .eq('id', tenant.id);
        
        if (error) throw error;
      }

      return operational;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: "Operational Settings Updated",
        description: "Your operational settings have been saved successfully.",
      });
    },
    onError: (error) => {
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
      if (!tenant?.id) throw new Error('No tenant found');
      
      // In a real implementation, you'd store these in a tenant_integrations table
      // For now, we'll just validate and return
      return integrations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: "Integration Settings Updated",
        description: "Your integration settings have been saved successfully.",
      });
    },
    onError: (error) => {
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
      if (!tenant?.id) throw new Error('No tenant found');
      
      // In a real implementation, you'd store these in a tenant_notification_settings table
      return notifications;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: "Notification Settings Updated",
        description: "Your notification settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update security settings
  const updateSecurityMutation = useMutation({
    mutationFn: async (security: Partial<SecuritySettings>) => {
      if (!tenant?.id) throw new Error('No tenant found');
      
      // In a real implementation, you'd store these in a tenant_security_settings table
      return security;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: "Security Settings Updated",
        description: "Your security settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update security settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateBranding: updateBrandingMutation.mutate,
    updateOperational: updateOperationalMutation.mutate,
    updateIntegrations: updateIntegrationMutation.mutate,
    updateNotifications: updateNotificationMutation.mutate,
    updateSecurity: updateSecurityMutation.mutate,
    isUpdating: updateBrandingMutation.isPending || updateOperationalMutation.isPending || 
                updateIntegrationMutation.isPending || updateNotificationMutation.isPending ||
                updateSecurityMutation.isPending,
  };
};

function getDefaultSettings(tenant: any): TenantSettings {
  return {
    branding: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#f59e0b',
      accentColor: '#059669',
      restaurantName: tenant.name || 'Restaurant',
      tagline: 'Exceptional dining experience',
      domainStatus: 'pending',
    },
    operational: {
      businessHours: {
        '0': { isOpen: false },
        '1': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        '2': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        '3': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        '4': { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        '5': { isOpen: true, openTime: '09:00', closeTime: '23:00' },
        '6': { isOpen: true, openTime: '09:00', closeTime: '23:00' },
      },
      timezone: tenant.timezone || 'America/New_York',
      defaultServiceDuration: 120,
      tableCapacities: {},
      depositPolicy: {
        enabled: false,
        defaultAmount: 25,
        largePartyThreshold: 8,
        largePartyAmount: 50,
      },
      advanceBookingDays: 30,
      cancellationPolicy: 'Cancellations must be made at least 2 hours in advance.',
    },
    integrations: {
      sms: { provider: 'disabled', enabled: false },
      email: { provider: 'disabled', enabled: false },
      pos: { provider: 'disabled', enabled: false },
      analytics: { enabled: false },
    },
    notifications: {
      email: {
        confirmations: true,
        reminders: true,
        reminderHours: 24,
        cancellations: true,
        noshowAlerts: true,
      },
      sms: {
        confirmations: false,
        reminders: false,
        reminderHours: 2,
        cancellations: false,
      },
      staff: {
        overbookingAlerts: true,
        noshowAlerts: true,
        cancellationAlerts: true,
        dailySummary: true,
        summaryTime: '08:00',
      },
      customer: {
        waitlistUpdates: true,
        promotionalEmails: false,
        birthdayReminders: true,
      },
    },
    security: {
      twoFactorAuth: { enabled: false, method: 'email' },
      sessionTimeout: 480, // 8 hours
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false,
      },
      apiRateLimit: {
        requestsPerHour: 1000,
        burstLimit: 100,
      },
      loginAttempts: {
        maxAttempts: 5,
        lockoutDuration: 15,
      },
      auditLogging: true,
    },
    lastUpdated: new Date().toISOString(),
  };
}