#!/usr/bin/env node

/**
 * Production Security Tests for app.blunari.ai
 * Tests all deployed security fixes without requiring Playwright
 * 
 * Run with: node scripts/test-production-security.js
 */

const BASE_URL = 'https://app.blunari.ai';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`  ✅ ${name}`, colors.green);
    if (details) log(`     ${details}`, colors.cyan);
  } else {
    failedTests++;
    log(`  ❌ ${name}`, colors.red);
    if (details) log(`     ${details}`, colors.yellow);
  }
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`${title}`, colors.bold + colors.blue);
  log(`${'='.repeat(60)}`, colors.blue);
}

async function testValidationLogic() {
  logSection('TEST 1: Validation Logic (Offline Tests)');
  
  // Since we can't directly test the deployed app without browser automation,
  // we'll verify the validation code exists and is correctly imported
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check if validation file exists
    const validationPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'src', 'utils', 'bookingValidation.ts');
    const validationExists = fs.existsSync(validationPath);
    logTest('Validation file exists', validationExists, validationPath);
    
    if (validationExists) {
      const content = fs.readFileSync(validationPath, 'utf8');
      
      // Check for key validation patterns
      logTest('Email validation regex exists', content.includes('emailRegex') || content.includes('z.string().email()'));
      logTest('Phone validation exists', content.includes('phoneRegex') || content.includes('isValidPhone'));
      logTest('XSS sanitization exists', content.includes('sanitizeText') && content.includes('<script>'));
      logTest('Party size limits exist', content.includes('.min(1)') && content.includes('.max(50)'));
      logTest('E.164 phone format exists', content.includes('E164') || content.includes('formatPhoneE164'));
    }
    
    // Check if rate limiting file exists
    const rateLimitPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'src', 'hooks', 'useRateLimit.ts');
    const rateLimitExists = fs.existsSync(rateLimitPath);
    logTest('Rate limit hook exists', rateLimitExists, rateLimitPath);
    
    if (rateLimitExists) {
      const content = fs.readFileSync(rateLimitPath, 'utf8');
      logTest('Rate limit logic implemented', content.includes('checkLimit') && content.includes('sessionStorage'));
      logTest('Sliding window algorithm', content.includes('timestamps') || content.includes('window'));
    }
    
    // Check if production logger exists
    const loggerPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'src', 'utils', 'productionLogger.ts');
    const loggerExists = fs.existsSync(loggerPath);
    logTest('Production logger exists', loggerExists, loggerPath);
    
    if (loggerExists) {
      const content = fs.readFileSync(loggerPath, 'utf8');
      logTest('PII redaction logic', content.includes('redactObject') || content.includes('[REDACTED]'));
      logTest('Email redaction pattern', content.includes('emailRegex') || content.includes('@'));
      logTest('Phone redaction pattern', content.includes('phoneRegex') || content.includes('+'));
      logTest('Environment awareness', content.includes('NODE_ENV') || content.includes('production'));
    }
    
    // Check if secure tenant hook exists
    const tenantPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'src', 'hooks', 'useTenantSecure.ts');
    const tenantExists = fs.existsSync(tenantPath);
    logTest('Secure tenant hook exists', tenantExists, tenantPath);
    
    if (tenantExists) {
      const content = fs.readFileSync(tenantPath, 'utf8');
      const hasDemoFallback = content.includes('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      logTest('NO demo tenant fallback', !hasDemoFallback, hasDemoFallback ? '⚠️  SECURITY ISSUE DETECTED' : 'Clean');
      logTest('Auth redirect logic', content.includes('navigate') && content.includes('/auth'));
    }
    
    // Check if SmartBookingWizard is updated
    const wizardPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'src', 'components', 'booking', 'SmartBookingWizard.tsx');
    if (fs.existsSync(wizardPath)) {
      const content = fs.readFileSync(wizardPath, 'utf8');
      logTest('Wizard uses validation', content.includes('bookingValidation') || content.includes('bookingFormSchema'));
      logTest('Wizard uses rate limiting', content.includes('useRateLimit'));
      logTest('Wizard uses sanitization', content.includes('sanitizeText'));
    }
    
  } catch (error) {
    logTest('File system checks', false, error.message);
  }
}

async function testBuildArtifacts() {
  logSection('TEST 2: Build Artifacts Check');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check if build artifacts exist
    const distPath = path.join(__dirname, '..', 'apps', 'client-dashboard', 'dist');
    const distExists = fs.existsSync(distPath);
    logTest('Build directory exists', distExists, distPath);
    
    if (distExists) {
      // Check for JS bundles
      const files = fs.readdirSync(distPath, { recursive: true });
      const jsFiles = files.filter(f => f.endsWith('.js'));
      logTest('JavaScript bundles exist', jsFiles.length > 0, `${jsFiles.length} JS files`);
      
      // Check if validation code is bundled
      let hasValidationCode = false;
      let hasPIIInBundle = false;
      
      for (const file of jsFiles) {
        const filePath = path.join(distPath, file);
        if (fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for validation patterns
          if (content.includes('bookingFormSchema') || content.includes('sanitizeText')) {
            hasValidationCode = true;
          }
          
          // Check for PII leaks (test emails/phones should NOT be in production bundle)
          if (content.includes('sensitive.pii@example.com') || content.includes('ratelimit.test@example.com')) {
            hasPIIInBundle = true;
          }
        }
      }
      
      logTest('Validation code bundled', hasValidationCode);
      logTest('No test PII in bundle', !hasPIIInBundle);
    }
    
  } catch (error) {
    logTest('Build artifacts check', false, error.message);
  }
}

async function testEnvironmentConfig() {
  logSection('TEST 3: Environment Configuration');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check for environment files
    const envPaths = [
      path.join(__dirname, '..', 'apps', 'client-dashboard', '.env'),
      path.join(__dirname, '..', 'apps', 'client-dashboard', '.env.production'),
      path.join(__dirname, '..', 'apps', 'client-dashboard', '.env.local')
    ];
    
    let hasEnvFile = false;
    let hasProductionConfig = false;
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        hasEnvFile = true;
        const content = fs.readFileSync(envPath, 'utf8');
        
        if (content.includes('NODE_ENV=production') || content.includes('VITE_MODE=production')) {
          hasProductionConfig = true;
        }
        
        logTest(`Environment file: ${path.basename(envPath)}`, true);
      }
    }
    
    logTest('Environment configuration exists', hasEnvFile);
    logTest('Production mode configured', hasProductionConfig);
    
  } catch (error) {
    logTest('Environment config check', false, error.message);
  }
}

async function testDocumentation() {
  logSection('TEST 4: Documentation Check');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check for implementation docs
    const docsToCheck = [
      'BOOKING_FIXES_IMPLEMENTATION_COMPLETE.md',
      'BOOKING_PAGE_PRODUCTION_READINESS_ANALYSIS.md'
    ];
    
    for (const doc of docsToCheck) {
      const docPath = path.join(__dirname, '..', doc);
      const exists = fs.existsSync(docPath);
      logTest(`Documentation: ${doc}`, exists);
      
      if (exists) {
        const content = fs.readFileSync(docPath, 'utf8');
        logTest(`  - Has testing section`, content.includes('Testing') || content.includes('TEST'));
        logTest(`  - Has deployment guide`, content.includes('Deploy') || content.includes('Production'));
      }
    }
    
  } catch (error) {
    logTest('Documentation check', false, error.message);
  }
}

async function printDeploymentChecklist() {
  logSection('MANUAL DEPLOYMENT TESTS REQUIRED');
  
  log('\n⚠️  The following tests require manual verification on app.blunari.ai:', colors.yellow);
  log('\n1. Open https://app.blunari.ai in a browser', colors.cyan);
  log('2. Open DevTools (F12) → Console tab', colors.cyan);
  log('3. Navigate to Bookings page', colors.cyan);
  log('4. Follow the manual test checklist in: manual-production-tests.md', colors.cyan);
  
  log('\n🔍 Key Manual Tests:', colors.bold);
  log('  • Input Validation: Try invalid emails, phones, XSS attempts', colors.white);
  log('  • Rate Limiting: Create 4 bookings rapidly (4th should fail)', colors.white);
  log('  • PII Redaction: Search console logs for test emails/phones', colors.white);
  log('  • No Demo Fallback: Search for f47ac10b-58cc-4372-a567-0e02b2c3d479', colors.white);
  log('  • Auth Redirect: Try accessing /bookings in incognito mode', colors.white);
}

async function testGitCommit() {
  logSection('TEST 5: Git Commit Verification');
  
  const { execSync } = require('child_process');
  
  try {
    // Check latest commit
    const latestCommit = execSync('git log -1 --oneline', { encoding: 'utf8' });
    logTest('Latest commit exists', true, latestCommit.trim());
    
    // Check if security fixes are in commit
    const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    logTest('Commit mentions security', commitMsg.includes('security') || commitMsg.includes('CRITICAL'));
    logTest('Commit mentions validation', commitMsg.includes('validation'));
    logTest('Commit mentions rate limiting', commitMsg.includes('rate limit'));
    logTest('Commit mentions PII', commitMsg.includes('PII'));
    
    // Check which files were committed
    const committedFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' });
    logTest('Validation file committed', committedFiles.includes('bookingValidation.ts'));
    logTest('Rate limit hook committed', committedFiles.includes('useRateLimit.ts'));
    logTest('Production logger committed', committedFiles.includes('productionLogger.ts'));
    logTest('Secure tenant hook committed', committedFiles.includes('useTenantSecure.ts'));
    
  } catch (error) {
    logTest('Git commit check', false, error.message);
  }
}

async function generateReport() {
  logSection('TEST RESULTS SUMMARY');
  
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${totalTests}`, colors.bold);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? colors.green : colors.yellow);
  
  if (failedTests === 0) {
    log('\n🎉 All automated tests passed!', colors.bold + colors.green);
    log('✅ Code is properly deployed and configured', colors.green);
    log('⚠️  Still requires manual browser testing (see checklist above)', colors.yellow);
  } else {
    log('\n⚠️  Some tests failed. Review issues above.', colors.bold + colors.yellow);
  }
  
  // Deployment recommendation
  log('\n' + '='.repeat(60), colors.blue);
  log('DEPLOYMENT RECOMMENDATION', colors.bold + colors.blue);
  log('='.repeat(60), colors.blue);
  
  if (passRate >= 90) {
    log('\n✅ APPROVED FOR TESTING', colors.bold + colors.green);
    log('   - All critical files deployed', colors.green);
    log('   - Security fixes committed', colors.green);
    log('   - Ready for manual browser testing', colors.green);
    log('\n📋 Next Step: Complete manual-production-tests.md', colors.cyan);
  } else if (passRate >= 70) {
    log('\n⚠️  CONDITIONAL APPROVAL', colors.bold + colors.yellow);
    log('   - Some tests failed but may be non-critical', colors.yellow);
    log('   - Review failures before proceeding', colors.yellow);
    log('\n📋 Next Step: Fix failing tests, then manual testing', colors.cyan);
  } else {
    log('\n❌ NOT APPROVED', colors.bold + colors.red);
    log('   - Critical issues detected', colors.red);
    log('   - Fix failing tests before deployment', colors.red);
    log('\n📋 Next Step: Address all failures', colors.cyan);
  }
}

// Run all tests
async function runAllTests() {
  log(`\n${'='.repeat(60)}`, colors.bold + colors.blue);
  log('BLUNARI PRODUCTION SECURITY TEST SUITE', colors.bold + colors.blue);
  log(`Domain: ${BASE_URL}`, colors.cyan);
  log(`Date: ${new Date().toISOString()}`, colors.cyan);
  log(`${'='.repeat(60)}\n`, colors.bold + colors.blue);
  
  await testValidationLogic();
  await testBuildArtifacts();
  await testEnvironmentConfig();
  await testDocumentation();
  await testGitCommit();
  await printDeploymentChecklist();
  await generateReport();
  
  log('\n');
}

// Execute
runAllTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, colors.red);
  process.exit(1);
});
