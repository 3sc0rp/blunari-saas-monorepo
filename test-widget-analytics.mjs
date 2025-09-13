#!/usr/bin/env node

/**
 * Test script for widget analytics Edge Function
 * Tests authentication and data retrieval
 */

import { createClient } from '@supabase/supabase-js';

// Use production values directly
const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWidgetAnalytics() {
  console.log('🧪 Testing Widget Analytics Edge Function');
  console.log('🔗 Supabase URL:', supabaseUrl);
  
  try {
    // Test without authentication first (should fail gracefully)
    console.log('\n📋 Test 1: Edge Function without authentication');
    
    const { data: noAuthData, error: noAuthError } = await supabase.functions.invoke('widget-analytics', {
      body: {
        tenantId: 'test-tenant-id',
        widgetType: 'booking',
        timeRange: '7d'
      }
    });
    
    console.log('No auth test result:', {
      error: noAuthError ? noAuthError.message : 'No error',
      hasData: !!noAuthData
    });
    
    // Test with a mock authentication (this will also likely fail, but helps debug)
    console.log('\n📋 Test 2: Edge Function with mock token');
    
    const { data: mockAuthData, error: mockAuthError } = await supabase.functions.invoke('widget-analytics', {
      body: {
        tenantId: 'test-tenant-id',
        widgetType: 'booking',
        timeRange: '7d'
      },
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Mock auth test result:', {
      error: mockAuthError ? mockAuthError.message : 'No error',
      hasData: !!mockAuthData
    });
    
    // Try to get a real session (this requires actual login)
    console.log('\n📋 Test 3: Attempting to check current session');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
      console.log('ℹ️  No active session - this is expected if not logged in');
    } else if (!session) {
      console.log('ℹ️  No active session found');
      console.log('💡 To test with real auth, login to the application first');
    } else {
      console.log('✅ Active session found, testing with real token');
      
      const { data: realAuthData, error: realAuthError } = await supabase.functions.invoke('widget-analytics', {
        body: {
          tenantId: session.user.id, // Use actual user ID as tenant
          widgetType: 'booking',
          timeRange: '7d'
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Real auth test result:', {
        error: realAuthError ? realAuthError.message : 'No error',
        hasData: !!realAuthData,
        dataKeys: realAuthData ? Object.keys(realAuthData) : []
      });
    }
    
    // Test CORS by making a direct fetch request
    console.log('\n📋 Test 4: Direct fetch to test CORS');
    
    try {
      const directResponse = await fetch(`${supabaseUrl}/functions/v1/widget-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer mock-token`
        },
        body: JSON.stringify({
          tenantId: 'test-tenant-id',
          widgetType: 'booking',
          timeRange: '7d'
        })
      });
      
      console.log('Direct fetch result:', {
        status: directResponse.status,
        statusText: directResponse.statusText,
        ok: directResponse.ok,
        headers: Object.fromEntries(directResponse.headers.entries())
      });
      
      if (directResponse.ok) {
        const responseData = await directResponse.json();
        console.log('Response data keys:', Object.keys(responseData));
      } else {
        const errorText = await directResponse.text();
        console.log('Error response:', errorText.substring(0, 200));
      }
      
    } catch (fetchError) {
      console.error('Direct fetch failed:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWidgetAnalytics().then(() => {
  console.log('\n✅ Test completed');
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});