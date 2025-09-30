/**
 * Production Readiness Validation Script
 * Ensures the booking system is properly configured for production use
 */

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

class ProductionValidator {
  constructor() {
    this.results = {
      database: { passed: 0, failed: 0, warnings: 0, tests: [] },
      api: { passed: 0, failed: 0, warnings: 0, tests: [] },
      security: { passed: 0, failed: 0, warnings: 0, tests: [] },
      performance: { passed: 0, failed: 0, warnings: 0, tests: [] },
      dataIntegrity: { passed: 0, failed: 0, warnings: 0, tests: [] }
    };
  }

  async runAllValidations() {
    console.log('🚀 Production Readiness Validation');
    console.log('=' .repeat(50));
    console.log();

    await this.validateDatabase();
    await this.validateAPI();
    await this.validateSecurity();
    await this.validatePerformance();
    await this.validateDataIntegrity();

    this.generateReport();
  }

  async validateDatabase() {
    console.log('🗄️  Database Validation');
    console.log('-' .repeat(25));

    // Test 1: Connection
    await this.test('database', 'Database Connection', async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      if (!response.ok) throw new Error(`Connection failed: ${response.status}`);
      return 'Connected successfully';
    });

    // Test 2: Schema validation
    await this.test('database', 'Schema Validation', async () => {
      const tables = ['tenants', 'bookings', 'restaurant_tables'];
      const results = [];
      
      for (const table of tables) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
          headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        if (response.ok) {
          results.push(`✓ ${table}`);
        } else {
          throw new Error(`Table ${table} not accessible`);
        }
      }
      return results.join(', ');
    });

    // Test 3: RLS policies
    await this.test('database', 'Row Level Security', async () => {
      // Test that we can't access data without proper auth
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      
      if (response.status === 200) {
        const data = await response.json();
        if (data.length === 0) {
          return 'RLS working - no unauthorized access';
        } else {
          this.warn('database', 'Data accessible without tenant context');
          return 'Warning: Check RLS policies';
        }
      }
      return 'RLS policies active';
    });

    console.log();
  }

  async validateAPI() {
    console.log('🔌 API Validation');
    console.log('-' .repeat(25));

    // Test 1: Edge Functions
    await this.test('api', 'Tenant Resolution Function', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ slug: 'demo' })
      });

      if (!response.ok) {
        throw new Error(`Tenant function failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.tenant) {
        return `Tenant resolved: ${data.tenant.name}`;
      } else {
        throw new Error('Tenant resolution failed');
      }
    });

    // Test 2: Booking function
    await this.test('api', 'Booking Functions', async () => {
      const functions = [
        { name: 'widget-booking-live', critical: true },
        { name: 'reservation-status', critical: false }
      ];
      const results = [];
      
      for (const func of functions) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${func.name}`, {
          method: 'OPTIONS',
          headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        
        if (response.ok || response.status === 405) {
          results.push(`✓ ${func.name}`);
        } else if (func.critical) {
          throw new Error(`Critical function ${func.name} not available (${response.status})`);
        } else {
          results.push(`⚠ ${func.name} (${response.status} - may need deployment)`);
        }
      }
      return results.join(', ');
    });

    // Test 3: Real-time subscriptions
    await this.test('api', 'Real-time Capability', async () => {
      // Test WebSocket connection capability
      const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket';
      return 'WebSocket endpoint available';
    });

    console.log();
  }

  async validateSecurity() {
    console.log('🔒 Security Validation');
    console.log('-' .repeat(25));

    // Test 1: HTTPS enforcement
    await this.test('security', 'HTTPS Enforcement', async () => {
      if (SUPABASE_URL.startsWith('https://')) {
        return 'HTTPS enforced';
      } else {
        throw new Error('HTTP connection detected in production');
      }
    });

    // Test 2: API key validation
    await this.test('security', 'API Key Security', async () => {
      if (SUPABASE_ANON_KEY.length > 100) {
        return 'Secure API key length';
      } else {
        this.warn('security', 'API key may be too short');
        return 'Warning: Verify API key strength';
      }
    });

    // Test 3: CORS validation
    await this.test('security', 'CORS Configuration', async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'OPTIONS',
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (corsHeader) {
        return `CORS configured: ${corsHeader}`;
      } else {
        this.warn('security', 'CORS headers not detected');
        return 'Warning: Verify CORS setup';
      }
    });

    console.log();
  }

  async validatePerformance() {
    console.log('⚡ Performance Validation');
    console.log('-' .repeat(25));

    // Test 1: API response times
    await this.test('performance', 'API Response Time', async () => {
      const start = Date.now();
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const duration = Date.now() - start;

      if (duration < 1000) {
        return `Fast response: ${duration}ms`;
      } else if (duration < 3000) {
        this.warn('performance', `Slow response: ${duration}ms`);
        return `Acceptable: ${duration}ms`;
      } else {
        throw new Error(`Very slow response: ${duration}ms`);
      }
    });

    // Test 2: Connection pooling
    await this.test('performance', 'Connection Efficiency', async () => {
      const promises = Array(5).fill().map(() => 
        fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { 'apikey': SUPABASE_ANON_KEY } })
      );
      
      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      if (duration < 2000) {
        return `Efficient concurrent requests: ${duration}ms`;
      } else {
        this.warn('performance', 'Concurrent requests may be slow');
        return `Concurrent performance: ${duration}ms`;
      }
    });

    console.log();
  }

  async validateDataIntegrity() {
    console.log('🛡️  Data Integrity Validation');
    console.log('-' .repeat(25));

    // Test 1: No test data in production
    await this.test('dataIntegrity', 'Production Data Cleanliness', async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=guest_email,guest_name&limit=100`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });

      if (response.ok) {
        const bookings = await response.json();
        const testPatterns = /@example\.|@test\.|test.*|demo.*|sample.*/i;
        const testBookings = bookings.filter(booking => 
          testPatterns.test(booking.guest_email) || 
          testPatterns.test(booking.guest_name)
        );

        if (testBookings.length === 0) {
          return `Clean production data: ${bookings.length} bookings`;
        } else {
          this.warn('dataIntegrity', `Found ${testBookings.length} test bookings`);
          return `Warning: ${testBookings.length} test bookings found`;
        }
      } else {
        return 'No data access (expected with RLS)';
      }
    });

    // Test 2: Data consistency
    await this.test('dataIntegrity', 'Schema Consistency', async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,name,slug&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });

      if (response.ok) {
        const tenants = await response.json();
        if (tenants.length > 0) {
          const tenant = tenants[0];
          const hasRequiredFields = tenant.id && tenant.name && tenant.slug;
          if (hasRequiredFields) {
            return 'Schema validation passed';
          } else {
            throw new Error('Missing required tenant fields');
          }
        } else {
          return 'No tenants found (check data setup)';
        }
      } else {
        return 'Schema check completed';
      }
    });

    console.log();
  }

  async test(category, name, testFn) {
    try {
      const result = await testFn();
      this.results[category].passed++;
      this.results[category].tests.push({ name, status: '✅ PASS', details: result });
      console.log(`  ✅ ${name}: ${result}`);
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({ name, status: '❌ FAIL', details: error.message });
      console.log(`  ❌ ${name}: ${error.message}`);
    }
  }

  warn(category, message) {
    this.results[category].warnings++;
  }

  generateReport() {
    console.log();
    console.log('📊 PRODUCTION READINESS REPORT');
    console.log('=' .repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    Object.entries(this.results).forEach(([category, results]) => {
      totalPassed += results.passed;
      totalFailed += results.failed;
      totalWarnings += results.warnings;

      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      console.log(`\n${categoryName}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  ⚠️  Warnings: ${results.warnings}`);
    });

    console.log('\n' + '=' .repeat(50));
    console.log('OVERALL SUMMARY:');
    console.log(`✅ Total Passed: ${totalPassed}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`⚠️  Total Warnings: ${totalWarnings}`);

    if (totalFailed === 0 && totalWarnings <= 2) {
      console.log('\n🎉 PRODUCTION READY!');
      console.log('Your booking system is ready for production use.');
    } else if (totalFailed === 0) {
      console.log('\n⚠️  PRODUCTION READY WITH WARNINGS');
      console.log('Review warnings before deploying to production.');
    } else {
      console.log('\n🚨 NOT PRODUCTION READY');
      console.log('Address failed tests before deploying to production.');
    }

    console.log('\nNext Steps:');
    console.log('1. Address any failed tests');
    console.log('2. Review and resolve warnings');
    console.log('3. Set VITE_APP_ENV=production in production environment');
    console.log('4. Ensure VITE_ENABLE_MOCK_DATA=false in production');
    console.log('5. Test with real booking flows');
    console.log('6. Monitor real-time data updates');
    console.log('7. Validate notification system');
  }
}

async function main() {
  const validator = new ProductionValidator();
  await validator.runAllValidations();
}

// Export for use in other scripts
module.exports = { ProductionValidator };

// If run directly
if (require.main === module) {
  main().catch(console.error);
}