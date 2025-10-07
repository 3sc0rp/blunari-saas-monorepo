import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4MzgyMzIsImV4cCI6MjA0MDQxNDIzMn0.T7iYmxL7F-_cVKvNFWYnHsjZ8VNFy6LqvWMG3-PzYuE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCredentialUpdate() {
  try {
    console.log('Testing credential update...');
    
    // You'll need to replace these with actual values
    const testTenantId = 'YOUR_TENANT_ID';
    const testNewEmail = 'test@example.com';
    
    const { data, error } = await supabase.functions.invoke(
      'manage-tenant-credentials',
      {
        body: {
          tenantId: testTenantId,
          action: 'update_email',
          newEmail: testNewEmail,
        },
      }
    );

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testCredentialUpdate();
