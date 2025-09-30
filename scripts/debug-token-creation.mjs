#!/usr/bin/env node

// Debug token creation specifically

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function debugTokenCreation() {
  console.log('🔍 DEBUGGING TOKEN CREATION');
  console.log('===========================');
  
  console.log('Testing token creation endpoint...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      slug: 'demo',
      widgetType: 'booking'
    })
  });
  
  console.log(`Response status: ${response.status}`);
  console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
  
  const responseText = await response.text();
  console.log(`Response body: ${responseText}`);
  
  if (!response.ok) {
    console.log('\n❌ Token creation failed!');
    console.log('This explains why widget bookings are failing.');
    console.log('The widget needs a valid token to make booking API calls.');
    
    // Check if the edge function exists
    console.log('\nChecking if edge function exists...');
    const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'OPTIONS'
    });
    console.log(`OPTIONS response: ${testResponse.status}`);
  }
}

debugTokenCreation();