// Test utilities for support ticket functionality
import { supabase } from "@/integrations/supabase/client";

export const testSupportTicketConnection = async () => {
  try {
    console.log("Testing support ticket database connection...");
    
    // Test 1: Check if we can connect to the database
    const { data: categories, error: categoriesError } = await supabase
      .from("support_categories")
      .select("id, name")
      .limit(5);
    
    if (categoriesError) {
      console.error("Categories query error:", categoriesError);
      return { success: false, error: categoriesError.message };
    }
    
    console.log("✅ Support categories loaded:", categories?.length || 0);
    
    // Test 2: Check if we can query support tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(`
        id,
        ticket_number,
        subject,
        status,
        priority,
        created_at,
        category:support_categories!category_id(name,color),
        tenant:tenants!tenant_id(name)
      `)
      .limit(5);
    
    if (ticketsError) {
      console.error("Tickets query error:", ticketsError);
      return { success: false, error: ticketsError.message };
    }
    
    console.log("✅ Support tickets loaded:", tickets?.length || 0);
    
    // Test 3: Check tenants table
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .limit(5);
    
    if (tenantsError) {
      console.error("Tenants query error:", tenantsError);
      return { success: false, error: tenantsError.message };
    }
    
    console.log("✅ Tenants loaded:", tenants?.length || 0);
    
    return {
      success: true,
      data: {
        categories: categories?.length || 0,
        tickets: tickets?.length || 0,
        tenants: tenants?.length || 0,
      }
    };
  } catch (error: any) {
    console.error("Test failed:", error);
    return { success: false, error: error.message };
  }
};

export const createTestTicket = async () => {
  try {
    console.log("Creating test support ticket...");
    
    const ticketNumber = `TEST-${Date.now().toString().slice(-8)}`;
    const ticketData = {
      ticket_number: ticketNumber,
      subject: "Test Ticket - Database Connection",
      description: "This is a test ticket to verify database connectivity and ticket creation functionality.",
      priority: "medium" as const,
      status: "open" as const,
      contact_name: "Test User",
      contact_email: "test@example.com",
      contact_phone: "+1234567890",
      source: "web" as const,
    };

    const { data, error } = await supabase
      .from("support_tickets")
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      console.error("Create ticket error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Test ticket created successfully:", data);
    return { success: true, data, ticketNumber };
  } catch (error: any) {
    console.error("Create test ticket failed:", error);
    return { success: false, error: error.message };
  }
};
