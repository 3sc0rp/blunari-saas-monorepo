#!/usr/bin/env node
/**
 * Simple CORS preflight checker for Supabase Edge Functions
 * Sends OPTIONS with Access-Control-Request-Headers including Sentry tracing headers
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

function request(method, url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        method,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function assertIncludes(actual, required) {
  const missing = [];
  for (const r of required) {
    if (!actual.includes(r)) missing.push(r);
  }
  return missing;
}

async function checkOne({ url, origin, reqMethod = 'POST', requiredHeaders }) {
  const acrh = requiredHeaders.join(', ');
  const res = await request('OPTIONS', url, {
    Origin: origin,
    'Access-Control-Request-Method': reqMethod,
    'Access-Control-Request-Headers': acrh,
  });
  const allowHeaders = (res.headers['access-control-allow-headers'] || '').toString().toLowerCase();
  const allowOrigin = (res.headers['access-control-allow-origin'] || '').toString();
  const missing = assertIncludes(allowHeaders, requiredHeaders);
  const ok = res.status >= 200 && res.status < 400 && missing.length === 0 && (!!allowOrigin);
  return { ok, res, missing };
}

(async () => {
  const origin = process.env.PREFLIGHT_ORIGIN || 'https://admin.blunari.ai';
  const endpoints = (process.env.PREFLIGHT_ENDPOINTS || '').split(',').map(s => s.trim()).filter(Boolean);
  const requiredHeaders = (process.env.REQUIRED_HEADERS || 'authorization,content-type')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (endpoints.length === 0) {
    console.error('No PREFLIGHT_ENDPOINTS provided');
    process.exit(2);
  }

  let failures = 0;
  for (const url of endpoints) {
    const { ok, res, missing } = await checkOne({ url, origin, requiredHeaders });
    if (!ok) {
      failures++;
      console.error(`[FAIL] ${url} -> status=${res.status} origin=${res.headers['access-control-allow-origin']} missing=${missing.join(',')}`);
    } else {
      console.log(`[OK] ${url}`);
    }
  }

  process.exit(failures === 0 ? 0 : 1);
})();
