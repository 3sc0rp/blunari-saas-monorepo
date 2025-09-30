#!/usr/bin/env node

// Decode the JWT token to see what's inside

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded;
  return atob(paddedStr);
}

// Token from the previous test
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiZGVtbyIsImNvbmZpZ1ZlcnNpb24iOiIyLjAiLCJ0aW1lc3RhbXAiOjE3NTkyNzA5MzMsIndpZGdldFR5cGUiOiJib29raW5nIiwiZXhwIjoxNzU5Mjc0NTMzLCJpYXQiOjE3NTkyNzA5MzN9.MGE3ZTRhN2IwNTcxNGYyYzRjNTk2MjdjMDM3MTVhNzk1YjM3NmY2ZDQyMmI3Njc1NGQ3ZDYxMmIwMjA2NWUyOA";

try {
  const parts = token.split('.');
  
  console.log('🎫 JWT Token Analysis');
  console.log('===================\n');
  
  // Decode header
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  console.log('📋 Header:', JSON.stringify(header, null, 2));
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log('\n📦 Payload:', JSON.stringify(payload, null, 2));
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;
  
  console.log('\n⏰ Token Timing:');
  console.log(`Current time: ${now} (${new Date().toLocaleString()})`);
  console.log(`Issued at: ${payload.iat} (${new Date(payload.iat * 1000).toLocaleString()})`);
  console.log(`Expires at: ${payload.exp} (${new Date(payload.exp * 1000).toLocaleString()})`);
  console.log(`Time until expiry: ${expiresIn} seconds (${Math.round(expiresIn / 60)} minutes)`);
  
  console.log('\n🔍 Key Fields:');
  console.log(`- slug: "${payload.slug}"`);
  console.log(`- widgetType: "${payload.widgetType}"`);
  console.log(`- configVersion: "${payload.configVersion}"`);
  console.log(`- Valid: ${expiresIn > 0 ? '✅ Yes' : '❌ Expired'}`);

} catch (error) {
  console.error('❌ Failed to decode token:', error.message);
}