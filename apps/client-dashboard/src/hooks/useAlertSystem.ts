import { useState, useEffect, useMemo } from 'react';
import { AlertNotification } from '@/types/dashboard';
import { useTodaysBookings } from './useRealtimeBookings';

export const useAlertSystem = (tenantId?: string) => {
  const { bookings } = useTodaysBookings(tenantId);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const alerts: AlertNotification[] = useMemo(() => {
    if (!bookings) return [];
    
    const generatedAlerts: AlertNotification[] = [];
    const now = new Date();
    
    // Check for overbookings
    const currentHour = now.getHours();
    const currentBookings = bookings.filter(b => {
      const bookingTime = new Date(b.booking_time);
      return bookingTime.getHours() === currentHour && 
             ['confirmed', 'seated'].includes(b.status);
    });
    
    if (currentBookings.length > 15) { // Assuming 15 tables max capacity
      generatedAlerts.push({
        id: 'overbooking-' + currentHour,
        type: 'critical',
        title: 'Overbooking Alert',
        message: `${currentBookings.length} reservations for ${currentHour}:00. Capacity may be exceeded.`,
        time: 'Now',
        action: {
          label: 'View Schedule',
          handler: () => console.log('Navigate to schedule')
        },
        dismissible: true
      });
    }
    
    // Check for long table occupancy
    const longOccupiedTables = bookings.filter(b => {
      if (b.status !== 'seated') return false;
      const seatTime = new Date(b.booking_time);
      const hoursDiff = (now.getTime() - seatTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 2.5; // More than 2.5 hours
    });
    
    longOccupiedTables.forEach(booking => {
      generatedAlerts.push({
        id: 'long-occupied-' + booking.id,
        type: 'warning',
        title: 'Long Table Occupancy',
        message: `Table ${booking.table_id} occupied for 2+ hours`,
        time: '15 minutes ago',
        action: {
          label: 'Check Table',
          handler: () => console.log(`Check table ${booking.table_id}`)
        },
        dismissible: true
      });
    });
    
    // Check for upcoming peak times
    const upcomingBookings = bookings.filter(b => {
      const bookingTime = new Date(b.booking_time);
      const timeDiff = bookingTime.getTime() - now.getTime();
      return timeDiff > 0 && timeDiff < 60 * 60 * 1000 && // Next hour
             b.status === 'confirmed';
    });
    
    if (upcomingBookings.length > 10) {
      generatedAlerts.push({
        id: 'peak-time-warning',
        type: 'info',
        title: 'Peak Time Approaching',
        message: `${upcomingBookings.length} reservations in the next hour. Ensure staff readiness.`,
        time: 'Now',
        action: {
          label: 'Staff Alert',
          handler: () => console.log('Send staff notification')
        },
        dismissible: true
      });
    }
    
    // Success alerts for good performance
    const completedToday = bookings.filter(b => b.status === 'completed').length;
    if (completedToday > 0 && completedToday % 10 === 0) {
      generatedAlerts.push({
        id: 'milestone-' + completedToday,
        type: 'success',
        title: 'Service Milestone',
        message: `Great job! ${completedToday} successful services completed today.`,
        time: '5 minutes ago',
        dismissible: true
      });
    }
    
    return generatedAlerts.filter(alert => !dismissedAlerts.has(alert.id));
  }, [bookings, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const clearAllAlerts = () => {
    setDismissedAlerts(new Set(alerts.map(alert => alert.id)));
  };

  return {
    alerts,
    dismissAlert,
    clearAllAlerts,
    hasAlerts: alerts.length > 0,
    criticalAlertsCount: alerts.filter(a => a.type === 'critical').length
  };
};