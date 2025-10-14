import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export const createTestReservationNotification = async (tenantId?: string) => {
  if (!tenantId) {
    console.error('No tenant ID provided for test notification');
    return;
  }

  try {
    const testNotification = {
      tenant_id: tenantId,
      notification_type: 'new_reservation',
      title: 'Test Reservation',
      message: `Test reservation for 4 guests on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - This is a test notification`,
      data: {
        reservation_id: 'test-' + Date.now(),
        confirmation_number: 'TEST' + Date.now().toString().slice(-6),
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        party_size: 4,
        booking_time: new Date().toISOString(),
        table_id: 'test-table-1',
        status: 'confirmed'
      },
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notification_queue')
      .insert(testNotification);

    if (error) {
      console.error('Failed to create test notification:', error);
      throw error;
    }    return testNotification;
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw error;
  }
};
