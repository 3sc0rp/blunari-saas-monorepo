#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logging
 * This fixes production console pollution issues
 */

const fs = require('fs');
const path = require('path');

// Files to process
const files = [
  'src/hooks/useTenant.ts',
  'src/hooks/useCommandCenterDataNew.ts', 
  'src/hooks/useRealtimeCommandCenter.ts'
];

const rootDir = path.join(__dirname, '../..');

// Replacement patterns
const replacements = [
  // Debug logging
  {
    pattern: /console\.log\('🔐 Auth check:', ({[^}]+})\);/g,
    replacement: "logger.debug('Auth check', $1);"
  },
  {
    pattern: /console\.log\(`📡 Calling edge function: \${functionName} \(\${method}\)`, ([^;]+)\);/g,
    replacement: "logger.debug(`Calling edge function: ${functionName} (${method})`, $1);"
  },
  {
    pattern: /console\.log\(`📡 Response from \${functionName}:`, ({[^}]+})\);/g,
    replacement: "logger.debug(`Response from ${functionName}`, $1);"
  },
  {
    pattern: /console\.log\(`✅ Edge function \${functionName} success:`, ({[^}]+})\);/g,
    replacement: "logger.debug(`Edge function ${functionName} success`, $1);"
  },
  {
    pattern: /console\.log\('📊 Processing edge function results:', ({[^}]+})\);/g,
    replacement: "logger.debug('Processing edge function results', $1);"
  },
  {
    pattern: /console\.log\('🔍 Raw ([^']+):', ([^;]+)\);/g,
    replacement: "logger.debug('Raw $1', { data: $2 });"
  },
  {
    pattern: /if \(index === 0\) console\.log\('✅ ([^']+):', ([^;]+)\);/g,
    replacement: "if (index === 0) logger.debug('$1', { data: $2 });"
  },
  {
    pattern: /console\.log\('✅ Data validation complete:', ({[^}]+})\);/g,
    replacement: "logger.debug('Data validation complete', $1);"
  },
  // Info logging  
  {
    pattern: /console\.log\('No active session, redirecting to login'\);/g,
    replacement: "logger.info('No active session found, redirecting to login');"
  },
  {
    pattern: /console\.log\('Development mode: ([^']+)'\);/g,
    replacement: "logger.info('Development mode: $1');"
  },
  // Real-time logging
  {
    pattern: /console\.log\("🟡 ([^"]+)"\);/g,
    replacement: 'logger.warn("$1");'
  },
  {
    pattern: /console\.log\("🟡 ([^"]+)", ([^;]+)\);/g,
    replacement: 'logger.warn("$1", { context: $2 });'
  },
  {
    pattern: /console\.log\("🔥 ([^"]+)", ([^;]+)\);/g,
    replacement: 'logger.info("$1", { tenantId: $2 });'
  },
  {
    pattern: /console\.log\(`🔗 ([^`]+)`, ([^;]+)\);/g,
    replacement: 'logger.debug(`$1`, { eventType: $2 });'
  },
  {
    pattern: /console\.log\(`🔗 ([^`]+)`, ([^;]+)\);/g,
    replacement: 'logger.debug(`$1`, { status: $2 });'
  },
  {
    pattern: /console\.log\(`✅ ([^`]+)`\);/g,
    replacement: 'logger.info(`$1`);'
  },
  {
    pattern: /console\.log\(`⚠️ ([^`]+)`\);/g,
    replacement: 'logger.warn(`$1`);'
  },
  {
    pattern: /console\.log\("📊 ([^"]+)", ([^;]+)\);/g,
    replacement: 'logger.debug("$1", { payload: $2 });'
  },
  {
    pattern: /console\.log\("🪑 ([^"]+)", ([^;]+)\);/g,
    replacement: 'logger.debug("$1", { payload: $2 });'
  },
  {
    pattern: /console\.log\("⏱️ ([^"]+)", ([^;]+)\);/g,
    replacement: 'logger.debug("$1", { payload: $2 });'
  },
  {
    pattern: /console\.log\("🧹 ([^"]+)"\);/g,
    replacement: 'logger.info("$1");'
  },
  {
    pattern: /console\.log\(`🗑️ ([^`]+)`\);/g,
    replacement: 'logger.debug(`$1`);'
  },
  {
    pattern: /console\.log\("📱 ([^"]+)"\);/g,
    replacement: 'logger.debug("$1");'
  }
];

function processFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;

  // Apply all replacements
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(pattern, replacement);
    }
  });

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}: ${changes} console.log statements replaced`);
  } else {
    console.log(`✓  ${filePath}: No changes needed`);
  }
}

console.log('🧹 Fixing console.log statements...\n');

files.forEach(processFile);

console.log('\n✅ Console logging cleanup complete!');
console.log('💡 Remember to import { logger } from "@/utils/logger" in files that were modified.');
