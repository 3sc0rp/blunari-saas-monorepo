import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");
    const provider = url.searchParams.get("provider");

    if (!integrationId) {
      throw new Error("integration_id parameter is required");
    }

    console.log(
      `Processing webhook for integration: ${integrationId}, provider: ${provider}`,
    );

    // Get request body and headers
    const body = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let eventData: any;
    try {
      eventData = JSON.parse(body);
    } catch {
      eventData = { raw_body: body };
    }

    // Log the webhook
    const { error: logError } = await supabase.from("pos_webhook_logs").insert({
      integration_id: integrationId,
      tenant_id: eventData.tenant_id || null,
      webhook_url: req.url,
      method: req.method,
      headers,
      payload: eventData,
      response_status: 200,
      verified: true,
    });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    // Process different provider webhooks
    let processedEvent;
    switch (provider) {
      case "toast":
        processedEvent = await processToastWebhook(integrationId, eventData);
        break;
      case "square":
        processedEvent = await processSquareWebhook(integrationId, eventData);
        break;
      case "clover":
        processedEvent = await processCloverWebhook(integrationId, eventData);
        break;
      case "resy":
        processedEvent = await processResyWebhook(integrationId, eventData);
        break;
      case "opentable":
        processedEvent = await processOpenTableWebhook(
          integrationId,
          eventData,
        );
        break;
      case "custom":
        processedEvent = await processCustomWebhook(integrationId, eventData);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log(`Successfully processed ${provider} webhook:`, processedEvent);

    return new Response(
      JSON.stringify({
        success: true,
        event_id: processedEvent.event_id,
        processed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

async function processToastWebhook(integrationId: string, data: any) {
  console.log("Processing Toast webhook:", data);

  let eventType = "unknown";
  let processedData = data;

  // Determine event type based on Toast webhook structure
  if (data.eventType) {
    switch (data.eventType) {
      case "OrderCreated":
        eventType = "order_created";
        processedData = {
          order_id: data.order?.id,
          table_number: data.order?.table?.number,
          guest_count: data.order?.guestCount,
          total_amount: data.order?.total,
          status: data.order?.status,
          original_data: data,
        };
        break;
      case "OrderClosed":
        eventType = "check_close";
        processedData = {
          order_id: data.order?.id,
          final_amount: data.order?.total,
          payment_method: data.order?.payments?.[0]?.type,
          closed_at: data.order?.closedAt,
          original_data: data,
        };
        break;
      case "MenuItemUpdated":
        eventType = "menu_change";
        // Sync menu item
        if (data.menuItem) {
          await syncMenuItemFromToast(integrationId, data.menuItem);
        }
        break;
    }
  }

  return await processEvent(integrationId, eventType, processedData, data.id);
}

async function processSquareWebhook(integrationId: string, data: any) {
  console.log("Processing Square webhook:", data);

  let eventType = "unknown";
  let processedData = data;

  if (data.type) {
    switch (data.type) {
      case "payment.created":
        eventType = "payment_created";
        processedData = {
          payment_id: data.data?.object?.payment?.id,
          amount: data.data?.object?.payment?.amount_money?.amount,
          currency: data.data?.object?.payment?.amount_money?.currency,
          status: data.data?.object?.payment?.status,
          original_data: data,
        };
        break;
      case "order.created":
        eventType = "order_created";
        processedData = {
          order_id: data.data?.object?.order?.id,
          location_id: data.data?.object?.order?.location_id,
          total_amount: data.data?.object?.order?.total_money?.amount,
          original_data: data,
        };
        break;
    }
  }

  return await processEvent(
    integrationId,
    eventType,
    processedData,
    data.data?.object?.payment?.id || data.data?.object?.order?.id,
  );
}

async function processCloverWebhook(integrationId: string, data: any) {
  console.log("Processing Clover webhook:", data);

  const eventType = data.type || "unknown";
  return await processEvent(integrationId, eventType, data, data.id);
}

async function processResyWebhook(integrationId: string, data: any) {
  console.log("Processing Resy webhook:", data);

  let eventType = "unknown";
  let processedData = data;

  if (data.event_type) {
    switch (data.event_type) {
      case "reservation.created":
        eventType = "reservation_created";
        processedData = {
          reservation_id: data.reservation?.id,
          party_size: data.reservation?.party_size,
          date_time: data.reservation?.date_time,
          guest_name: data.reservation?.guest?.name,
          original_data: data,
        };
        break;
      case "reservation.updated":
        eventType = "reservation_updated";
        break;
      case "reservation.cancelled":
        eventType = "reservation_cancelled";
        break;
    }
  }

  return await processEvent(
    integrationId,
    eventType,
    processedData,
    data.reservation?.id,
  );
}

async function processOpenTableWebhook(integrationId: string, data: any) {
  console.log("Processing OpenTable webhook:", data);

  const eventType = data.event_type || "unknown";
  return await processEvent(
    integrationId,
    eventType,
    data,
    data.reservation_id,
  );
}

async function processCustomWebhook(integrationId: string, data: any) {
  console.log("Processing Custom webhook:", data);

  const eventType = data.event_type || "custom_event";
  return await processEvent(integrationId, eventType, data, data.id);
}

async function processEvent(
  integrationId: string,
  eventType: string,
  eventData: any,
  externalId?: string,
) {
  console.log(
    `Processing event: ${eventType} for integration: ${integrationId}`,
  );

  try {
    const { data: result, error } = await supabase.rpc("process_pos_event", {
      p_integration_id: integrationId,
      p_event_type: eventType,
      p_event_data: eventData,
      p_external_id: externalId,
    });

    if (error) {
      throw error;
    }

    return { event_id: result, event_type: eventType };
  } catch (error) {
    console.error("Error processing event:", error);
    throw error;
  }
}

async function syncMenuItemFromToast(integrationId: string, menuItem: any) {
  try {
    const itemData = {
      name: menuItem.name,
      description: menuItem.description,
      category: menuItem.category?.name,
      price: Math.round(menuItem.price * 100), // Convert to cents
      currency: "USD",
      available: menuItem.isAvailable,
      modifiers: menuItem.modifiers || [],
      allergens: menuItem.allergens || [],
      image_url: menuItem.imageUrl,
      metadata: {
        toast_guid: menuItem.guid,
        last_modified: menuItem.lastModified,
      },
    };

    const { data: result, error } = await supabase.rpc("sync_pos_menu_item", {
      p_integration_id: integrationId,
      p_external_id: menuItem.guid,
      p_item_data: itemData,
    });

    if (error) {
      throw error;
    }

    console.log(`Synced menu item: ${menuItem.name}`);
    return result;
  } catch (error) {
    console.error("Error syncing menu item:", error);
    throw error;
  }
}
