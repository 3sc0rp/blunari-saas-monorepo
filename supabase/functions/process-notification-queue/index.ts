// Week 17-18: Smart Notifications - process-notification-queue Edge Function
// Batch processing of pending notifications with digest support
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface ProcessQueueRequest {
  limit?: number;
  process_scheduled?: boolean;
  process_digest?: boolean;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const requestData: ProcessQueueRequest = req.method === 'POST' 
      ? await req.json()
      : { limit: 100, process_scheduled: true, process_digest: false };

    console.log('Process queue request:', requestData);

    const results = {
      scheduled_processed: 0,
      scheduled_failed: 0,
      digest_processed: 0,
      digest_failed: 0,
      total_deliveries: 0,
    };

    // Process scheduled notifications
    if (requestData.process_scheduled !== false) {
      const scheduledResults = await processScheduledNotifications(
        supabase,
        requestData.limit || 100
      );
      results.scheduled_processed = scheduledResults.processed;
      results.scheduled_failed = scheduledResults.failed;
      results.total_deliveries += scheduledResults.total_deliveries;
    }

    // Process digest notifications
    if (requestData.process_digest) {
      const digestResults = await processDigestNotifications(supabase);
      results.digest_processed = digestResults.processed;
      results.digest_failed = digestResults.failed;
      results.total_deliveries += digestResults.total_deliveries;
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-notification-queue:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper: Process scheduled notifications that are due
async function processScheduledNotifications(
  supabase: any,
  limit: number
): Promise<{ processed: number; failed: number; total_deliveries: number }> {
  let processed = 0;
  let failed = 0;
  let totalDeliveries = 0;

  try {
    // Get pending notifications using RPC
    const { data: notifications, error: fetchError } = await supabase.rpc(
      'get_pending_notifications',
      { p_limit: limit }
    );

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      return { processed, failed, total_deliveries: totalDeliveries };
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to process');
      return { processed, failed, total_deliveries: totalDeliveries };
    }

    console.log(`Processing ${notifications.length} scheduled notifications`);

    // Process each notification
    for (const notification of notifications) {
      try {
        // Check if expired
        if (notification.expires_at && new Date(notification.expires_at) < new Date()) {
          await supabase
            .from('notifications')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: 'Notification expired',
            })
            .eq('id', notification.id);
          
          failed++;
          continue;
        }

        // Update status to sending
        await supabase
          .from('notifications')
          .update({ status: 'sending' })
          .eq('id', notification.id);

        // Process through channels
        const deliveryResults = await processNotificationChannels(
          supabase,
          notification
        );

        totalDeliveries += deliveryResults.length;

        // Determine final status
        const allFailed = deliveryResults.every((r) => r.status === 'failed');
        const anySent = deliveryResults.some((r) => r.status === 'sent');

        if (allFailed) {
          // Check if should retry
          if (notification.retry_count < notification.max_retries) {
            await supabase
              .from('notifications')
              .update({
                status: 'pending',
                retry_count: notification.retry_count + 1,
                scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 minutes
              })
              .eq('id', notification.id);
            console.log(`Notification ${notification.id} scheduled for retry`);
          } else {
            await supabase
              .from('notifications')
              .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                failure_reason: deliveryResults
                  .map((r) => `${r.channel}: ${r.error}`)
                  .join('; '),
              })
              .eq('id', notification.id);
            failed++;
          }
        } else {
          await supabase
            .from('notifications')
            .update({
              status: anySent ? 'sent' : 'queued',
              sent_at: anySent ? new Date().toISOString() : null,
            })
            .eq('id', notification.id);
          processed++;
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failed++;
      }
    }

    console.log(`Scheduled processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed, total_deliveries: totalDeliveries };
  } catch (error) {
    console.error('Error in processScheduledNotifications:', error);
    return { processed, failed, total_deliveries: totalDeliveries };
  }
}

// Helper: Process digest notifications
async function processDigestNotifications(
  supabase: any
): Promise<{ processed: number; failed: number; total_deliveries: number }> {
  let processed = 0;
  let failed = 0;
  let totalDeliveries = 0;

  try {
    // Get notification groups due for digest
    const { data: groups, error: groupsError } = await supabase
      .from('notification_groups')
      .select('*')
      .eq('is_active', true)
      .lte('next_digest_at', new Date().toISOString());

    if (groupsError) {
      console.error('Error fetching notification groups:', groupsError);
      return { processed, failed, total_deliveries: totalDeliveries };
    }

    if (!groups || groups.length === 0) {
      console.log('No digest groups due for processing');
      return { processed, failed, total_deliveries: totalDeliveries };
    }

    console.log(`Processing ${groups.length} digest groups`);

    for (const group of groups) {
      try {
        // Get unread notifications for this group
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('group_id', group.id)
          .eq('user_id', group.user_id)
          .is('read_at', null)
          .eq('is_digest_eligible', true)
          .order('created_at', { ascending: false });

        if (notificationsError || !notifications || notifications.length === 0) {
          console.log(`No notifications for group ${group.id}`);
          
          // Update next digest time
          await updateNextDigestTime(supabase, group);
          continue;
        }

        // Create digest notification
        const digestNotification = await createDigestNotification(
          supabase,
          group,
          notifications
        );

        if (digestNotification) {
          // Process digest
          const deliveryResults = await processNotificationChannels(
            supabase,
            digestNotification
          );

          totalDeliveries += deliveryResults.length;

          // Update group statistics
          await supabase
            .from('notification_groups')
            .update({
              last_digest_sent_at: new Date().toISOString(),
              notification_count: group.notification_count + notifications.length,
            })
            .eq('id', group.id);

          // Update next digest time
          await updateNextDigestTime(supabase, group);

          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing digest group ${group.id}:`, error);
        failed++;
      }
    }

    console.log(`Digest processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed, total_deliveries: totalDeliveries };
  } catch (error) {
    console.error('Error in processDigestNotifications:', error);
    return { processed, failed, total_deliveries: totalDeliveries };
  }
}

// Helper: Process notification through channels
async function processNotificationChannels(
  supabase: any,
  notification: any
): Promise<any[]> {
  const deliveryResults = [];

  for (const channel of notification.channels) {
    try {
      // Check channel capacity
      const { data: canSend } = await supabase.rpc('can_send_via_channel', {
        p_tenant_id: notification.tenant_id,
        p_channel: channel,
      });

      if (!canSend) {
        deliveryResults.push({
          channel,
          status: 'failed',
          error: 'Rate limit exceeded',
        });
        continue;
      }

      // Get channel config
      const { data: channelConfig, error: configError } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('tenant_id', notification.tenant_id)
        .eq('channel', channel)
        .eq('is_enabled', true)
        .single();

      if (configError || !channelConfig) {
        deliveryResults.push({
          channel,
          status: 'failed',
          error: 'Channel not configured',
        });
        continue;
      }

      // Simulate sending (in production, call actual provider APIs)
      const deliveryResult = {
        channel,
        status: 'sent',
        external_id: `${channel}_${Date.now()}`,
        metadata: {},
      };

      // Create delivery record
      await supabase.from('notification_deliveries').insert({
        notification_id: notification.id,
        tenant_id: notification.tenant_id,
        channel,
        status: deliveryResult.status,
        external_id: deliveryResult.external_id,
        sent_at: new Date().toISOString(),
        metadata: deliveryResult.metadata,
      });

      // Update channel statistics
      await supabase
        .from('notification_channels')
        .update({
          total_sent: channelConfig.total_sent + 1,
          total_delivered: channelConfig.total_delivered + 1,
          current_hour_count: channelConfig.current_hour_count + 1,
          current_day_count: channelConfig.current_day_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', channelConfig.id);

      deliveryResults.push(deliveryResult);
    } catch (error) {
      console.error(`Error processing channel ${channel}:`, error);
      deliveryResults.push({
        channel,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return deliveryResults;
}

// Helper: Create digest notification
async function createDigestNotification(
  supabase: any,
  group: any,
  notifications: any[]
): Promise<any> {
  try {
    // Build digest content
    const title = `${group.name} Digest - ${notifications.length} notifications`;
    const body = notifications
      .map((n, i) => `${i + 1}. ${n.title}: ${n.body}`)
      .join('\n\n');

    // Create digest notification
    const { data: digestNotification, error: createError } = await supabase
      .from('notifications')
      .insert({
        tenant_id: group.tenant_id,
        user_id: group.user_id,
        category: group.category || 'system',
        priority: 'normal',
        title,
        body,
        data: {
          is_digest: true,
          notification_ids: notifications.map((n) => n.id),
        },
        channels: ['email', 'in_app'],
        status: 'queued',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating digest notification:', createError);
      return null;
    }

    return digestNotification;
  } catch (error) {
    console.error('Error in createDigestNotification:', error);
    return null;
  }
}

// Helper: Update next digest time
async function updateNextDigestTime(supabase: any, group: any) {
  const now = new Date();
  let nextDigestAt: Date;

  if (group.digest_frequency === 'daily') {
    nextDigestAt = new Date(now);
    nextDigestAt.setDate(nextDigestAt.getDate() + 1);
  } else if (group.digest_frequency === 'weekly') {
    nextDigestAt = new Date(now);
    nextDigestAt.setDate(nextDigestAt.getDate() + 7);
  } else {
    console.error(`Unknown digest frequency: ${group.digest_frequency}`);
    return;
  }

  await supabase
    .from('notification_groups')
    .update({ next_digest_at: nextDigestAt.toISOString() })
    .eq('id', group.id);
}
