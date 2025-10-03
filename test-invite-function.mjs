#!/usr/bin/env node
/**
 * Quick test for invite-staff edge function
 * Shows the actual error response
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🧪 Testing invite-staff edge function');
console.log('URL:', `${SUPABASE_URL}/functions/v1/invite-staff`);
console.log('');

// Get auth token from command line
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node test-invite-function.mjs YOUR_ADMIN_EMAIL YOUR_PASSWORD');
  process.exit(1);
}

if (!ANON_KEY) {
  console.error('Error: VITE_SUPABASE_ANON_KEY environment variable not set');
  process.exit(1);
}

async function test() {
  try {
    // 1. Sign in first
    console.log('📝 Step 1: Signing in...');
    const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const signInData = await signInResponse.json();
    
    if (!signInResponse.ok) {
      console.error('❌ Sign in failed:', signInData);
      return;
    }

    const accessToken = signInData.access_token;
    console.log('✅ Signed in successfully');
    console.log('');

    // 2. Call invite-staff
    console.log('📝 Step 2: Calling invite-staff function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-staff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'SUPPORT',
      }),
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', responseText);
    console.log('');

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ SUCCESS!');
      console.log('Invitation Link:', data.invitation?.invitation_link);
    } else {
      console.error('❌ FAILED!');
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error Details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.error('Raw Error:', responseText);
      }
    }
  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

test();

