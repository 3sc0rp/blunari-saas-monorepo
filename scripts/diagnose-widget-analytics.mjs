#!/usr/bin/env node
/**
 * Diagnostic script for widget-analytics edge function.
 * Usage (PowerShell): node scripts/diagnose-widget-analytics.mjs <project-ref> <tenantId> <widgetType> [timeRange]
 */
import https from 'node:https';

function usage() {
  console.log('Usage: node scripts/diagnose-widget-analytics.mjs <project-ref> <tenantId> <widgetType> [timeRange]');
  process.exit(1);
}

const [projectRef, tenantId, widgetType, timeRange='7d'] = process.argv.slice(2);
if (!projectRef || !tenantId || !widgetType) usage();

const correlationId = `diag-${Date.now().toString(36)}-${Math.random().toString(16).slice(2,8)}`;

const payload = JSON.stringify({ tenantId, widgetType, timeRange });
const options = {
  method: 'POST',
  hostname: `${projectRef}.functions.supabase.co`,
  path: '/widget-analytics',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-correlation-id': correlationId
  }
};

console.log('--- Widget Analytics Diagnostic ---');
console.log('Project Ref:', projectRef);
console.log('Tenant ID:', tenantId);
console.log('Widget Type:', widgetType);
console.log('Time Range:', timeRange);
console.log('Correlation ID:', correlationId);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('\nStatus:', res.statusCode);
    console.log('Headers:', res.headers);
    try {
      const json = JSON.parse(body);
      console.log('\nParsed Response:', JSON.stringify(json, null, 2));
      if (!json.success) {
        console.log('\nDiagnostics:');
        if (json.code === 'MISSING_TENANT_ID' || json.code === 'MISSING_WIDGET_TYPE') {
          console.log('- Missing required fields. Check the request payload.');
        } else if (json.code === 'INVALID_WIDGET_TYPE') {
          console.log('- Widget type must be one of: booking | catering');
        } else if (json.code === 'INTERNAL_ERROR') {
          console.log('- Internal error. Use correlationId to locate logs in dashboard.');
        }
      } else {
        console.log('\nSuccess Diagnostics:');
        console.log('- Duration (ms):', json.meta?.durationMs);
        console.log('- Version:', json.meta?.version);
        console.log('- Mode (authMethod):', json.meta?.authMethod);
        console.log('- Data keys:', Object.keys(json.data));
      }
    } catch (e) {
      console.log('Raw Body (non-JSON?):', body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(payload);
req.end();
