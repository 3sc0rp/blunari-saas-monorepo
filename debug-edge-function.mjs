#!/usr/bin/env node

/**
 * Quick test to diagnose the 400 error
 */

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function with direct fetch...');
  
  const testBody = {
    tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    widgetType: 'booking',
    timeRange: '7d'
  };
  
  console.log('Request body:', JSON.stringify(testBody, null, 2));
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/widget-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(testBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Success!');
    } else {
      console.log('❌ Failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testEdgeFunction();