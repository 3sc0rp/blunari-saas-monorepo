#!/usr/bin/env node
/**
 * Generate Widget URL with Token
 * Creates a properly authenticated booking widget URL
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'apps/client-dashboard/.env') });

const JWT_SECRET = process.env.VITE_JWT_SECRET || process.env.WIDGET_JWT_SECRET || 'dev-jwt-secret-change-in-production-2025';

// Get slug from command line or use default
const slug = process.argv[2] || 'mpizza';

console.log('🎫 Widget URL Generator\n');
console.log('Generating URL for slug:', slug);
console.log('JWT Secret:', JWT_SECRET.substring(0, 20) + '...\n');

// Simple HMAC for token generation (matches edge function)
function b64urlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function simpleHMAC(data, secret) {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}

function generateWidgetToken(slug) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    slug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    configVersion: '1.0',
    widgetType: 'booking'
  };

  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const signature = simpleHMAC(`${h}.${p}`, JWT_SECRET);

  return `${h}.${p}.${signature}`;
}

const token = generateWidgetToken(slug);

console.log('✅ Token generated successfully!\n');
console.log('Token:', token.substring(0, 80) + '...\n');

// Generate URLs for different environments
const urls = {
  local: `http://localhost:5173/public-widget/book/${slug}?token=${token}`,
  localAlt: `http://localhost:3000/public-widget/book/${slug}?token=${token}`,
  prod: `https://your-domain.com/public-widget/book/${slug}?token=${token}`
};

console.log('📋 Widget URLs:\n');
console.log('Local (Vite):');
console.log(urls.local);
console.log('\nLocal (Alternative):');
console.log(urls.localAlt);
console.log('\nProduction:');
console.log(urls.prod);
console.log('\n');

console.log('🎯 Quick Start:');
console.log(`   1. Copy one of the URLs above`);
console.log(`   2. Paste it in your browser`);
console.log(`   3. The widget should load with "${slug}" restaurant\n`);

console.log('💡 To generate for a different tenant:');
console.log(`   node generate-widget-url.mjs demo`);
console.log(`   node generate-widget-url.mjs drood-tech\n`);

console.log('Available tenants:');
console.log('   - mpizza');
console.log('   - demo');
console.log('   - drood-tech');
console.log('   - drood-tech-2\n');
