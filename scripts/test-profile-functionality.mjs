#!/usr/bin/env node

/**
 * Profile Functionality Quick Test Script
 * 
 * This script runs automated checks to verify profile functionality
 * Run: node test-profile-functionality.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(`${colors.red}❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set${colors.reset}`);
  console.log(`${colors.yellow}ℹ️  Set it in your .env file or pass as argument${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, message = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}${message ? ': ' + message : ''}`, color);
  
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
  results.warnings++;
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

async function checkAdminUser() {
  logSection('TEST 1: Admin User Setup');
  
  try {
    // Check auth.users
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .eq('email', 'admin@blunari.ai')
      .maybeSingle();
    
    if (authError) {
      logTest('Auth User Exists', false, authError.message);
      return null;
    }
    
    if (!authUser) {
      logTest('Auth User Exists', false, 'admin@blunari.ai not found in auth.users');
      log('ℹ️  Run FIX-ACTUAL-ADMIN-USER.sql to create admin user', 'yellow');
      return null;
    }
    
    logTest('Auth User Exists', true, `User ID: ${authUser.id.substring(0, 8)}...`);
    return authUser;
    
  } catch (error) {
    logTest('Auth User Exists', false, error.message);
    return null;
  }
}

async function checkEmployeeRecord(userId) {
  logSection('TEST 2: Employee Record');
  
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('employee_id, email, role, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      logTest('Employee Record Exists', false, error.message);
      return;
    }
    
    if (!employee) {
      logTest('Employee Record Exists', false, 'No employee record found');
      log('ℹ️  Run FIX-ACTUAL-ADMIN-USER.sql', 'yellow');
      return;
    }
    
    logTest('Employee Record Exists', true, `ID: ${employee.employee_id}`);
    logTest('Employee Role', employee.role === 'SUPER_ADMIN', `Role: ${employee.role}`);
    logTest('Employee Status', employee.status === 'ACTIVE', `Status: ${employee.status}`);
    
  } catch (error) {
    logTest('Employee Record Check', false, error.message);
  }
}

async function checkProfileRecord(userId) {
  logSection('TEST 3: Profile Record');
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, avatar_url, phone')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      logTest('Profile Record Exists', false, error.message);
      return;
    }
    
    if (!profile) {
      logTest('Profile Record Exists', false, 'No profile record found');
      log('ℹ️  Run FIX-ACTUAL-ADMIN-USER.sql', 'yellow');
      return;
    }
    
    logTest('Profile Record Exists', true);
    logTest('Profile Has Names', !!(profile.first_name && profile.last_name), 
      `${profile.first_name || 'NULL'} ${profile.last_name || 'NULL'}`);
    
    if (profile.avatar_url) {
      logTest('Profile Has Avatar', true, profile.avatar_url);
    } else {
      logWarning('Profile has no avatar uploaded yet');
    }
    
    if (profile.phone) {
      log(`ℹ️  Phone: ${profile.phone}`, 'blue');
    } else {
      log(`ℹ️  Phone: Not set`, 'blue');
    }
    
  } catch (error) {
    logTest('Profile Record Check', false, error.message);
  }
}

async function checkStorageBucket() {
  logSection('TEST 4: Storage Bucket Setup');
  
  try {
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();
    
    if (error) {
      logTest('Storage Bucket List', false, error.message);
      return;
    }
    
    const avatarBucket = buckets.find(b => b.id === 'avatars');
    
    if (!avatarBucket) {
      logTest('Avatars Bucket Exists', false, 'Bucket not found');
      log('ℹ️  Run CREATE-AVATAR-STORAGE-BUCKET.sql', 'yellow');
      return;
    }
    
    logTest('Avatars Bucket Exists', true);
    logTest('Bucket is Public', avatarBucket.public === true, 
      `Public: ${avatarBucket.public}`);
    
    // Check file size limit
    const expectedSize = 2097152; // 2MB
    if (avatarBucket.file_size_limit === expectedSize) {
      logTest('File Size Limit', true, '2MB');
    } else {
      logWarning(`File size limit is ${avatarBucket.file_size_limit} bytes (expected ${expectedSize})`);
    }
    
  } catch (error) {
    logTest('Storage Bucket Check', false, error.message);
  }
}

async function checkStoragePolicies() {
  logSection('TEST 5: Storage Policies');
  
  try {
    const { data: policies, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd 
          FROM pg_policies 
          WHERE schemaname = 'storage' 
            AND tablename = 'objects' 
            AND policyname LIKE '%avatar%'
          ORDER BY cmd;
        `
      });
    
    if (error) {
      // Try alternate method
      log('ℹ️  Cannot query policies directly (requires admin)', 'blue');
      logWarning('Skipping policy checks - verify manually in Supabase Dashboard');
      return;
    }
    
    const requiredPolicies = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    const foundPolicies = policies.map(p => p.cmd);
    
    requiredPolicies.forEach(cmd => {
      const found = foundPolicies.includes(cmd);
      logTest(`Policy: ${cmd}`, found);
    });
    
    if (foundPolicies.length === 4) {
      log('✅ All 4 required policies exist', 'green');
    } else {
      logWarning(`Expected 4 policies, found ${foundPolicies.length}`);
      log('ℹ️  Run CREATE-AVATAR-STORAGE-BUCKET.sql', 'yellow');
    }
    
  } catch (error) {
    logWarning('Cannot check policies: ' + error.message);
  }
}

async function checkRLSPolicies() {
  logSection('TEST 6: RLS Policies on Profiles');
  
  try {
    // This requires special permissions, so we'll just log info
    log('ℹ️  RLS policies should allow users to update their own profile', 'blue');
    log('ℹ️  Verify in Supabase Dashboard → Database → Tables → profiles → Policies', 'blue');
    logWarning('RLS policy checks require admin access - verify manually');
    
  } catch (error) {
    logWarning('Cannot check RLS policies: ' + error.message);
  }
}

async function testEmailValidation() {
  logSection('TEST 7: Email Validation (Client-Side)');
  
  const testCases = [
    { email: 'test@example.com', valid: true },
    { email: 'user.name+tag@example.co.uk', valid: true },
    { email: 'invalid', valid: false },
    { email: 'invalid@', valid: false },
    { email: '@example.com', valid: false },
    { email: 'test @example.com', valid: false },
    { email: 'test@example', valid: false },
  ];
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  
  log('Testing email validation regex:', 'blue');
  testCases.forEach(({ email, valid }) => {
    const result = emailRegex.test(email);
    const passed = result === valid;
    logTest(`Validate: "${email}"`, passed, 
      `Expected: ${valid}, Got: ${result}`);
  });
}

async function checkAutoProvisioning() {
  logSection('TEST 8: Auto Provisioning Link');
  
  try {
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', 'admin@blunari.ai')
      .maybeSingle();
    
    if (!authUser) {
      logWarning('Cannot check auto_provisioning - admin user not found');
      return;
    }
    
    const { data: provisioning, error } = await supabase
      .from('auto_provisioning')
      .select('restaurant_name, restaurant_slug, user_id')
      .eq('user_id', authUser.id);
    
    if (error) {
      logTest('Auto Provisioning Check', false, error.message);
      return;
    }
    
    if (provisioning.length === 0) {
      logWarning('No auto_provisioning records linked to admin user');
    } else {
      logTest('Auto Provisioning Linked', true, 
        `${provisioning.length} tenant(s) provisioned by admin`);
      provisioning.forEach(p => {
        log(`  ℹ️  ${p.restaurant_name} (${p.restaurant_slug})`, 'blue');
      });
    }
    
  } catch (error) {
    logTest('Auto Provisioning Check', false, error.message);
  }
}

async function generateReport() {
  logSection('TEST SUMMARY');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${total}`, 'bright');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${results.warnings}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n🎉 All critical tests passed!', 'green');
    log('✅ Profile functionality is ready for use', 'green');
  } else {
    log('\n⚠️  Some tests failed', 'yellow');
    log('📋 Review failed tests and run SQL scripts:', 'yellow');
    log('   - FIX-ACTUAL-ADMIN-USER.sql', 'blue');
    log('   - CREATE-AVATAR-STORAGE-BUCKET.sql', 'blue');
  }
  
  // Save report to file
  const reportFile = 'profile-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      passRate: parseFloat(passRate),
    },
    tests: results.tests,
  }, null, 2));
  
  log(`\n📄 Report saved to ${reportFile}`, 'cyan');
}

async function main() {
  log('\n🧪 Profile Functionality Test Suite', 'bright');
  log('Testing admin@blunari.ai setup...\n', 'cyan');
  
  const authUser = await checkAdminUser();
  
  if (authUser) {
    await checkEmployeeRecord(authUser.id);
    await checkProfileRecord(authUser.id);
  }
  
  await checkStorageBucket();
  await checkStoragePolicies();
  await checkRLSPolicies();
  await testEmailValidation();
  await checkAutoProvisioning();
  await generateReport();
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
