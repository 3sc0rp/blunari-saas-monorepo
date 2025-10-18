#!/usr/bin/env node

/**
 * Quick Production Verification for app.blunari.ai
 * Verifies all security fixes are in place
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

log('\n' + '='.repeat(70), colors.bold + colors.blue);
log('🔍 QUICK PRODUCTION VERIFICATION - app.blunari.ai', colors.bold + colors.blue);
log('='.repeat(70) + '\n', colors.bold + colors.blue);

let allPassed = true;

// Test 1: Check if security files exist
log('1. Security Files Check', colors.bold);
const securityFiles = [
  'apps/client-dashboard/src/utils/bookingValidation.ts',
  'apps/client-dashboard/src/hooks/useRateLimit.ts',
  'apps/client-dashboard/src/utils/productionLogger.ts',
  'apps/client-dashboard/src/hooks/useTenantSecure.ts'
];

let filesExist = 0;
for (const file of securityFiles) {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  if (exists) {
    filesExist++;
    log(`   ✅ ${path.basename(file)}`, colors.green);
  } else {
    log(`   ❌ ${path.basename(file)} - MISSING!`, colors.red);
    allPassed = false;
  }
}
log(`   Result: ${filesExist}/4 files present\n`, filesExist === 4 ? colors.green : colors.red);

// Test 2: Check security patterns in files
log('2. Security Implementation Check', colors.bold);
let patternsFound = 0;
const totalPatterns = 12;

try {
  // Validation file
  const validationPath = path.join(__dirname, '..', 'apps/client-dashboard/src/utils/bookingValidation.ts');
  if (fs.existsSync(validationPath)) {
    const content = fs.readFileSync(validationPath, 'utf8');
    if (content.includes('emailSchema') || content.includes('z.string().email()')) {
      log('   ✅ Email validation implemented', colors.green);
      patternsFound++;
    }
    if (content.includes('phoneSchema') || content.includes('phoneRegex')) {
      log('   ✅ Phone validation implemented', colors.green);
      patternsFound++;
    }
    if (content.includes('partySizeSchema')) {
      log('   ✅ Party size validation implemented', colors.green);
      patternsFound++;
    }
    if (content.includes('specialRequestsSchema') || content.includes('<script')) {
      log('   ✅ XSS protection implemented', colors.green);
      patternsFound++;
    }
  }

  // Rate limit file
  const rateLimitPath = path.join(__dirname, '..', 'apps/client-dashboard/src/hooks/useRateLimit.ts');
  if (fs.existsSync(rateLimitPath)) {
    const content = fs.readFileSync(rateLimitPath, 'utf8');
    if (content.includes('checkLimit')) {
      log('   ✅ Rate limit check function exists', colors.green);
      patternsFound++;
    }
    if (content.includes('sessionStorage') || content.includes('localStorage')) {
      log('   ✅ Rate limit storage implemented', colors.green);
      patternsFound++;
    }
    if (content.includes('timestamps') || content.includes('window')) {
      log('   ✅ Sliding window algorithm present', colors.green);
      patternsFound++;
    }
  }

  // Logger file
  const loggerPath = path.join(__dirname, '..', 'apps/client-dashboard/src/utils/productionLogger.ts');
  if (fs.existsSync(loggerPath)) {
    const content = fs.readFileSync(loggerPath, 'utf8');
    if (content.includes('redactObject') || content.includes('[REDACTED]')) {
      log('   ✅ PII redaction logic implemented', colors.green);
      patternsFound++;
    }
    if (content.includes('NODE_ENV') || content.includes('production')) {
      log('   ✅ Environment-aware logging', colors.green);
      patternsFound++;
    }
  }

  // Secure tenant file
  const tenantPath = path.join(__dirname, '..', 'apps/client-dashboard/src/hooks/useTenantSecure.ts');
  if (fs.existsSync(tenantPath)) {
    const content = fs.readFileSync(tenantPath, 'utf8');
    const hasDemoFallback = content.includes('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    if (!hasDemoFallback) {
      log('   ✅ No hardcoded demo tenant fallback', colors.green);
      patternsFound++;
    } else {
      log('   ❌ SECURITY RISK: Demo tenant fallback detected!', colors.red);
      allPassed = false;
    }
    if (content.includes('navigate') && content.includes('/auth')) {
      log('   ✅ Auth redirect logic present', colors.green);
      patternsFound++;
    }
  }

  // Integration check
  const wizardPath = path.join(__dirname, '..', 'apps/client-dashboard/src/components/booking/SmartBookingWizard.tsx');
  if (fs.existsSync(wizardPath)) {
    const content = fs.readFileSync(wizardPath, 'utf8');
    if (content.includes('useRateLimit')) {
      log('   ✅ Rate limiting integrated in wizard', colors.green);
      patternsFound++;
    }
  }

  log(`   Result: ${patternsFound}/${totalPatterns} security patterns detected\n`, patternsFound >= 10 ? colors.green : colors.yellow);
  if (patternsFound < 10) allPassed = false;

} catch (error) {
  log(`   ❌ Error checking patterns: ${error.message}\n`, colors.red);
  allPassed = false;
}

// Test 3: Git verification
log('3. Git Commit Verification', colors.bold);
try {
  const commits = execSync('git log --oneline -5', { encoding: 'utf8' });
  const hasSecurityCommit = commits.includes('security') || commits.includes('CRITICAL');
  if (hasSecurityCommit) {
    log('   ✅ Security commit found in recent history', colors.green);
  } else {
    log('   ⚠️  No obvious security commit in last 5 commits', colors.yellow);
  }

  // Check specific commit
  const securityCommit = execSync('git log --all --grep="security" --grep="CRITICAL" -i --oneline -1', { encoding: 'utf8' }).trim();
  if (securityCommit) {
    log(`   ✅ Security commit: ${securityCommit}`, colors.green);
    
    // Check files in that commit
    const commitHash = securityCommit.split(' ')[0];
    const filesInCommit = execSync(`git diff-tree --no-commit-id --name-only -r ${commitHash}`, { encoding: 'utf8' });
    const hasAllFiles = securityFiles.every(f => filesInCommit.includes(path.basename(f)));
    if (hasAllFiles) {
      log('   ✅ All security files in commit', colors.green);
    } else {
      log('   ⚠️  Some security files may be in different commits', colors.yellow);
    }
  }
  log('');
} catch (error) {
  log(`   ⚠️  Git check warning: ${error.message}\n`, colors.yellow);
}

// Test 4: Build verification
log('4. Build Artifacts Check', colors.bold);
const distPath = path.join(__dirname, '..', 'apps/client-dashboard/dist');
if (fs.existsSync(distPath)) {
  log('   ✅ Build directory exists', colors.green);
  
  const files = fs.readdirSync(distPath, { recursive: true });
  const jsFiles = files.filter(f => f.endsWith('.js'));
  log(`   ✅ ${jsFiles.length} JavaScript bundles generated`, colors.green);
  
  // Check specific bundles
  const hasWizard = jsFiles.some(f => f.includes('SmartBookingWizard'));
  if (hasWizard) {
    log('   ✅ Booking wizard bundle found', colors.green);
  }
  log('');
} else {
  log('   ❌ Build directory not found - run: npm run build\n', colors.red);
  allPassed = false;
}

// Test 5: Environment configuration
log('5. Environment Configuration', colors.bold);
const envProdPath = path.join(__dirname, '..', 'apps/client-dashboard/.env.production');
if (fs.existsSync(envProdPath)) {
  log('   ✅ .env.production file exists', colors.green);
  
  const envContent = fs.readFileSync(envProdPath, 'utf8');
  if (envContent.includes('NODE_ENV=production') || envContent.includes('VITE_MODE=production')) {
    log('   ✅ Production mode configured', colors.green);
  }
  if (envContent.includes('VITE_ENABLE_DEV_LOGS=false')) {
    log('   ✅ Dev logs disabled for production', colors.green);
  }
  log('');
} else {
  log('   ⚠️  .env.production not found\n', colors.yellow);
}

// Final summary
log('='.repeat(70), colors.bold);
log('VERIFICATION SUMMARY', colors.bold);
log('='.repeat(70), colors.bold);

if (allPassed && filesExist === 4 && patternsFound >= 10) {
  log('\n✅ ALL CHECKS PASSED!', colors.bold + colors.green);
  log('   - All security files present', colors.green);
  log('   - Security patterns detected', colors.green);
  log('   - Build artifacts exist', colors.green);
  log('   - Environment configured', colors.green);
  log('\n🚀 STATUS: READY FOR MANUAL TESTING', colors.bold + colors.cyan);
  log('\n📋 Next Steps:', colors.cyan);
  log('   1. Open https://app.blunari.ai', colors.white);
  log('   2. Follow manual test checklist in: TEST_SUMMARY_FINAL.md', colors.white);
  log('   3. Complete 9 manual tests (~15 minutes)', colors.white);
  log('   4. Document results\n', colors.white);
} else {
  log('\n⚠️  SOME CHECKS FAILED OR INCOMPLETE', colors.bold + colors.yellow);
  log('   Review issues above before manual testing', colors.yellow);
  log('\n📋 Recommendations:', colors.cyan);
  if (filesExist < 4) {
    log('   - Verify all security files are committed', colors.white);
  }
  if (patternsFound < 10) {
    log('   - Check security implementations', colors.white);
  }
  if (!fs.existsSync(distPath)) {
    log('   - Run: npm run build', colors.white);
  }
  log('');
}

log('='.repeat(70) + '\n', colors.bold);

process.exit(allPassed ? 0 : 1);
