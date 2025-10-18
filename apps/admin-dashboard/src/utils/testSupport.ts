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
    console.log("Creating test support ticket using admin function...");
    
    const { data, error } = await supabase
      .rpc('create_support_ticket_admin' as any, {
        p_subject: 'Test Ticket - Admin Function',
        p_description: 'This is a test ticket created using the admin RPC function to bypass RLS restrictions.',
        p_contact_name: 'Test Admin User',
        p_contact_email: 'admin.test@example.com',
        p_contact_phone: '+1234567890',
        p_priority: 'medium'
      });

    if (error) {
      console.error("Create ticket RPC error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Test ticket created successfully with ID:", data);
    return { success: true, data: { id: data }, ticketId: data };
  } catch (error: any) {
    console.error("Create test ticket failed:", error);
    return { success: false, error: error.message };
  }
};
