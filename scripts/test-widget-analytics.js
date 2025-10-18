#!/usr/bin/env node

/**
 * Test widget-analytics Edge Function after deployment
 * Verifies the function is working correctly
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/widget-analytics`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testFunction() {
  log('\n' + '='.repeat(70), colors.bold + colors.blue);
  log('🧪 Testing widget-analytics Edge Function', colors.bold + colors.blue);
  log('='.repeat(70) + '\n', colors.bold + colors.blue);

  // Test 1: Valid request
  log('Test 1: Valid booking analytics request', colors.bold);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        widgetType: 'booking',
        timeRange: '7d'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('  ✅ Request successful', colors.green);
      log(`  ✅ Status: ${response.status}`, colors.green);
      log(`  ✅ Version: ${data.meta?.version || 'unknown'}`, colors.green);
      log(`  ✅ Duration: ${data.meta?.durationMs}ms`, colors.green);
      log(`  ✅ Has analytics data: ${!!data.data}`, colors.green);
    } else {
      log(`  ❌ Request failed: ${data.error || 'Unknown error'}`, colors.red);
      log(`  Status: ${response.status}`, colors.yellow);
    }
  } catch (error) {
    log(`  ❌ Network error: ${error.message}`, colors.red);
  }

  // Test 2: Invalid tenant ID
  log('\nTest 2: Invalid tenant ID format', colors.bold);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        tenantId: 'invalid-uuid',
        widgetType: 'booking',
        timeRange: '7d'
      })
    });

    const data = await response.json();
    
    if (!response.ok && data.code === 'INVALID_TENANT_ID') {
      log('  ✅ Validation working correctly', colors.green);
      log(`  ✅ Error code: ${data.code}`, colors.green);
    } else {
      log('  ❌ Validation should have failed', colors.red);
    }
  } catch (error) {
    log(`  ❌ Network error: ${error.message}`, colors.red);
  }

  // Test 3: Missing required field
  log('\nTest 3: Missing required field', colors.bold);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        // Missing widgetType
      })
    });

    const data = await response.json();
    
    if (!response.ok && data.code === 'MISSING_WIDGET_TYPE') {
      log('  ✅ Validation working correctly', colors.green);
      log(`  ✅ Error code: ${data.code}`, colors.green);
    } else {
      log('  ❌ Validation should have failed', colors.red);
    }
  } catch (error) {
    log(`  ❌ Network error: ${error.message}`, colors.red);
  }

  // Test 4: Invalid widget type
  log('\nTest 4: Invalid widget type', colors.bold);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        widgetType: 'invalid',
        timeRange: '7d'
      })
    });

    const data = await response.json();
    
    if (!response.ok && data.code === 'INVALID_WIDGET_TYPE') {
      log('  ✅ Validation working correctly', colors.green);
      log(`  ✅ Error code: ${data.code}`, colors.green);
    } else {
      log('  ❌ Validation should have failed', colors.red);
    }
  } catch (error) {
    log(`  ❌ Network error: ${error.message}`, colors.red);
  }

  // Test 5: Catering widget
  log('\nTest 5: Valid catering analytics request', colors.bold);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        widgetType: 'catering',
        timeRange: '30d'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('  ✅ Catering analytics working', colors.green);
      log(`  ✅ Duration: ${data.meta?.durationMs}ms`, colors.green);
    } else {
      log(`  ❌ Request failed: ${data.error || 'Unknown error'}`, colors.red);
    }
  } catch (error) {
    log(`  ❌ Network error: ${error.message}`, colors.red);
  }

  log('\n' + '='.repeat(70), colors.bold);
  log('✅ All tests completed!', colors.bold + colors.green);
  log('='.repeat(70) + '\n', colors.bold);
}

testFunction().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, colors.red);
  process.exit(1);
});
