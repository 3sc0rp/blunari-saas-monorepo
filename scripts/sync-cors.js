#!/usr/bin/env node

/**
 * CORS Synchronization Script
 * 
 * This script syncs the shared CORS configuration from _shared/cors.ts
 * to all Edge Functions as inlined code, working around Supabase deployment limitations.
 * 
 * Usage: node scripts/sync-cors.js
 */

const fs = require('fs');
const path = require('path');

const SHARED_CORS_PATH = 'apps/admin-dashboard/supabase/functions/_shared/cors.ts';
const ADMIN_FUNCTIONS_PATH = 'apps/admin-dashboard/supabase/functions';
const ROOT_FUNCTIONS_PATH = 'supabase/functions';

// Extract the CORS logic from the shared file
function extractCorsLogic() {
  const corsContent = fs.readFileSync(SHARED_CORS_PATH, 'utf8');
  
  // Extract the functions but convert exports to regular functions
  const cleanedContent = corsContent
    .replace(/export const/g, 'const')
    .replace(/export function/g, 'function')
    .replace(/\/\/ Environment-aware.*/, '// SHARED CORS CONFIGURATION - Auto-synced from _shared/cors.ts\n// Environment-aware CORS configuration for admin functions');
    
  return cleanedContent;
}

// Get all admin-tenant-* function directories
function getAdminTenantFunctions() {
  const functions = [];
  
  // Check admin-dashboard functions
  if (fs.existsSync(ADMIN_FUNCTIONS_PATH)) {
    const adminDirs = fs.readdirSync(ADMIN_FUNCTIONS_PATH)
      .filter(dir => dir.startsWith('admin-tenant-') && 
              fs.statSync(path.join(ADMIN_FUNCTIONS_PATH, dir)).isDirectory());
    functions.push(...adminDirs.map(dir => path.join(ADMIN_FUNCTIONS_PATH, dir)));
  }
  
  // Check root functions
  if (fs.existsSync(ROOT_FUNCTIONS_PATH)) {
    const rootDirs = fs.readdirSync(ROOT_FUNCTIONS_PATH)
      .filter(dir => dir.startsWith('admin-tenant-') && 
              fs.statSync(path.join(ROOT_FUNCTIONS_PATH, dir)).isDirectory());
    functions.push(...rootDirs.map(dir => path.join(ROOT_FUNCTIONS_PATH, dir)));
  }
  
  return functions;
}

// Update a function's index.ts to use the shared CORS logic
function updateFunctionCors(functionPath) {
  const indexPath = path.join(functionPath, 'index.ts');
  if (!fs.existsSync(indexPath)) return;
  
  let content = fs.readFileSync(indexPath, 'utf8');
  const corsLogic = extractCorsLogic();
  
  // Pattern to match existing imports
  const importPattern = /import { serve } from.*?\n.*?import { createClient } from.*?\n(.*?(?:import.*?cors.*?\n)?)/s;
  
  // Pattern to match existing CORS code (either inlined or imported)
  const corsPattern = /(\/\/ SHARED CORS CONFIGURATION.*?(?=serve\()|\/\/ Inline CORS utilities.*?(?=serve\()|import.*?cors.*?\n)/s;
  
  const newImports = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

${corsLogic}

`;
  
  // Replace the content
  if (corsPattern.test(content)) {
    content = content.replace(corsPattern, '');
  }
  
  content = content.replace(importPattern, newImports);
  
  fs.writeFileSync(indexPath, content);
  console.log(`✅ Updated CORS for ${functionPath}`);
}

// Main execution
function main() {
  console.log('🔄 Syncing shared CORS configuration...');
  
  const functions = getAdminTenantFunctions();
  
  if (functions.length === 0) {
    console.log('❌ No admin-tenant-* functions found');
    return;
  }
  
  functions.forEach(updateFunctionCors);
  
  console.log(`✅ Synced CORS for ${functions.length} functions`);
  console.log('📋 Source of truth: apps/admin-dashboard/supabase/functions/_shared/cors.ts');
  console.log('💡 To update CORS, modify the _shared file and run this script again');
}

if (require.main === module) {
  main();
}

module.exports = { main, extractCorsLogic, updateFunctionCors };
