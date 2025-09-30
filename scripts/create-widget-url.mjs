#!/usr/bin/env node

// Quick token generator for testing widget URL

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function createTokenURL() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        slug: 'demo',
        widget_type: 'booking',
        config_version: '2.0',
        ttl_seconds: 3600
      })
    });

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const widgetURL = `http://localhost:5173/public-widget/book/demo?token=${encodeURIComponent(data.token)}`;
    
    console.log('✅ Widget URL with proper token:');
    console.log(widgetURL);
    console.log('\n📝 Token expires at:', new Date(data.expires_at * 1000).toLocaleString());
    
  } catch (error) {
    console.error('❌ Failed to create widget URL:', error.message);
  }
}

createTokenURL();