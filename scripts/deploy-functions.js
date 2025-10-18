/**
 * Deploy Edge Functions Script
 * Deploys all necessary Supabase edge functions for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_DASHBOARD_FUNCTIONS = [
  'tenant',
  'widget-booking-live', 
  'reservation-status',
  'widget-analytics'
];

const ADMIN_DASHBOARD_FUNCTIONS = [
  'tenant-provisioning',
  'system-health',
  'generate-api-key'
];

async function deployFunctions() {
  console.log('🚀 Deploying Supabase Edge Functions');
  console.log('=' .repeat(50));

  // Check if we're in the right directory
  const rootDir = process.cwd();
  const clientFunctionsDir = path.join(rootDir, 'apps', 'client-dashboard', 'supabase', 'functions');
  const adminFunctionsDir = path.join(rootDir, 'apps', 'admin-dashboard', 'supabase', 'functions');

  console.log(`Root directory: ${rootDir}`);
  console.log(`Client functions: ${clientFunctionsDir}`);
  console.log(`Admin functions: ${adminFunctionsDir}`);
  console.log();

  // Deploy client dashboard functions
  console.log('📱 Deploying Client Dashboard Functions');
  console.log('-' .repeat(40));
  
  if (fs.existsSync(clientFunctionsDir)) {
    process.chdir(path.join(rootDir, 'apps', 'client-dashboard'));
    
    for (const funcName of CLIENT_DASHBOARD_FUNCTIONS) {
      const funcDir = path.join(clientFunctionsDir, funcName);
      
      if (fs.existsSync(funcDir)) {
        console.log(`  Deploying ${funcName}...`);
        try {
          execSync(`npx supabase functions deploy ${funcName}`, { 
            stdio: 'pipe',
            cwd: process.cwd()
          });
          console.log(`  ✅ ${funcName} deployed successfully`);
        } catch (error) {
          console.log(`  ❌ ${funcName} deployment failed: ${error.message.slice(0, 100)}...`);
        }
      } else {
        console.log(`  ⚠️  ${funcName} directory not found`);
      }
    }
  } else {
    console.log('  ⚠️  Client functions directory not found');
  }

  console.log();

  // Deploy admin dashboard functions  
  console.log('⚙️  Deploying Admin Dashboard Functions');
  console.log('-' .repeat(40));
  
  if (fs.existsSync(adminFunctionsDir)) {
    process.chdir(path.join(rootDir, 'apps', 'admin-dashboard'));
    
    for (const funcName of ADMIN_DASHBOARD_FUNCTIONS) {
      const funcDir = path.join(adminFunctionsDir, funcName);
      
      if (fs.existsSync(funcDir)) {
        console.log(`  Deploying ${funcName}...`);
        try {
          execSync(`npx supabase functions deploy ${funcName}`, { 
            stdio: 'pipe',
            cwd: process.cwd()
          });
          console.log(`  ✅ ${funcName} deployed successfully`);
        } catch (error) {
          console.log(`  ❌ ${funcName} deployment failed: ${error.message.slice(0, 100)}...`);
        }
      } else {
        console.log(`  ⚠️  ${funcName} directory not found`);
      }
    }
  } else {
    console.log('  ⚠️  Admin functions directory not found');
  }

  // Return to root directory
  process.chdir(rootDir);

  console.log();
  console.log('🎉 Edge Function Deployment Complete');
  console.log('=' .repeat(50));
  console.log();
  console.log('Next steps:');
  console.log('1. Run production validation: npm run validate:production');
  console.log('2. Test booking flows manually');
  console.log('3. Verify email notifications');
  console.log('4. Monitor function logs in Supabase dashboard');
}

// Manual function list for reference
function listAvailableFunctions() {
  console.log('📋 Available Functions to Deploy:');
  console.log();
  
  console.log('Client Dashboard Functions:');
  CLIENT_DASHBOARD_FUNCTIONS.forEach(func => console.log(`  - ${func}`));
  
  console.log();
  console.log('Admin Dashboard Functions:');
  ADMIN_DASHBOARD_FUNCTIONS.forEach(func => console.log(`  - ${func}`));
  
  console.log();
  console.log('Manual deployment commands:');
  console.log('cd apps/client-dashboard && npx supabase functions deploy FUNCTION_NAME');
  console.log('cd apps/admin-dashboard && npx supabase functions deploy FUNCTION_NAME');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  listAvailableFunctions();
} else {
  deployFunctions().catch(console.error);
}

module.exports = { deployFunctions, CLIENT_DASHBOARD_FUNCTIONS, ADMIN_DASHBOARD_FUNCTIONS };