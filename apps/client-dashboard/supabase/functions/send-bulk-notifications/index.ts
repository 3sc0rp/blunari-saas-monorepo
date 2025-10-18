import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingIds: string[];
  type: "reminder" | "confirmation" | "cancellation" | "custom";
  template: string;
  customMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { bookingIds, type, template, customMessage }: NotificationRequest =
      await req.json();

    // Get booking details
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .in("id", bookingIds);

    if (bookingsError) throw bookingsError;

    console.log(`Processing ${bookings.length} notifications of type: ${type}`);

    // Process each booking for notification
    const notifications = bookings.map((booking) => {
      let message = "";
      let subject = "";

      switch (type) {
        case "reminder":
          subject = "Booking Reminder";
          message = `Hi ${booking.guest_name}, this is a reminder for your reservation on ${new Date(booking.booking_time).toLocaleDateString()} at ${new Date(booking.booking_time).toLocaleTimeString()}. Party size: ${booking.party_size}. Looking forward to seeing you!`;
          break;
        case "confirmation":
          subject = "Booking Confirmed";
          message = `Hi ${booking.guest_name}, your reservation has been confirmed for ${new Date(booking.booking_time).toLocaleDateString()} at ${new Date(booking.booking_time).toLocaleTimeString()}. Party size: ${booking.party_size}. Thank you for choosing us!`;
          break;
        case "cancellation":
          subject = "Booking Cancelled";
          message = `Hi ${booking.guest_name}, your reservation for ${new Date(booking.booking_time).toLocaleDateString()} has been cancelled as requested. We hope to see you again soon!`;
          break;
        case "custom":
          subject = "Update on Your Reservation";
          message =
            customMessage || "We have an update regarding your reservation.";
          break;
        default:
          subject = "Booking Update";
          message = "We have an update regarding your reservation.";
      }

      return {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        subject,
        message,
        type,
      };
    });

    // Log the notifications (in a real implementation, you would send emails/SMS here)
    console.log(
      "Notifications to send:",
      JSON.stringify(notifications, null, 2),
    );

    // In a real implementation, you would integrate with email/SMS services like:
    // - Resend for emails
    // - Twilio for SMS
    // - Push notifications for mobile apps

    // For now, we'll simulate successful notification sending
    const results = notifications.map((notification, index) => ({
      booking_id: notification.booking_id,
      status: "sent",
      message: `Notification sent to ${notification.guest_name}`,
      timestamp: new Date().toISOString(),
    }));

    // Store notification logs in the database (optional)
    const { error: logError } = await supabaseClient
      .from("notification_queue")
      .insert(
        notifications.map((n) => ({
          tenant_id: bookings[0]?.tenant_id,
          user_id: user.id,
          notification_type: n.type,
          title: n.subject,
          message: n.message,
          data: {
            booking_id: n.booking_id,
            guest_name: n.guest_name,
            delivery_method: ["email", "sms"],
          },
          status: "sent",
        })),
      );

    if (logError) {
      console.error("Error logging notifications:", logError);
      // Don't fail the entire operation for logging errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${notifications.length} notifications`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in send-bulk-notifications function:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
