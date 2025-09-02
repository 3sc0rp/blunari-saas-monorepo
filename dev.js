#!/usr/bin/env node

/**
 * 🚀 Blunari SAAS Development Helper
 * 
 * This script provides comprehensive development tools and utilities
 * for working with the Blunari SAAS monorepo locally.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Main commands
const commands = {
  // Quality commands
  'quality:check': {
    description: '🔍 Run comprehensive quality checks',
    action: async () => {
      log('🔍 Running comprehensive quality checks...', 'bright');
      
      const checks = [
        { name: 'TypeScript compilation', command: 'npm run type-check --workspaces' },
        { name: 'ESLint analysis', command: 'npm run lint --workspaces' },
        { name: 'Prettier formatting', command: 'npm run format:check --workspaces' },
        { name: 'Tests', command: 'npm run test --workspaces --if-present' }
      ];
      
      const results = [];
      
      for (const check of checks) {
        log(`\n🔄 ${check.name}...`, 'yellow');
        const result = executeCommand(check.command, { silent: false });
        results.push({ ...check, ...result });
        
        if (result.success) {
          log(`✅ ${check.name} passed`, 'green');
        } else {
          log(`❌ ${check.name} failed`, 'red');
        }
      }
      
      // Summary
      log('\n📊 Quality Check Summary:', 'bright');
      results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        log(`   ${icon} ${result.name}`, result.success ? 'green' : 'red');
      });
      
      const passed = results.filter(r => r.success).length;
      log(`\n🎯 ${passed}/${results.length} checks passed`, passed === results.length ? 'green' : 'yellow');
    }
  },

  'quality:fix': {
    description: '🛠️ Automatically fix quality issues',
    action: async () => {
      log('🛠️ Fixing quality issues...', 'bright');
      
      const fixes = [
        { name: 'ESLint auto-fix', command: 'npm run lint:fix --workspaces' },
        { name: 'Prettier formatting', command: 'npm run format --workspaces' }
      ];
      
      for (const fix of fixes) {
        log(`\n🔄 ${fix.name}...`, 'yellow');
        const result = executeCommand(fix.command);
        
        if (result.success) {
          log(`✅ ${fix.name} completed`, 'green');
        } else {
          log(`❌ ${fix.name} failed: ${result.error}`, 'red');
        }
      }
      
      log('\n🎉 Quality fixes completed!', 'green');
    }
  },

  // Development commands
  'dev:all': {
    description: '🚀 Start all development servers',
    action: async () => {
      log('🚀 Starting all development servers...', 'bright');
      
      const servers = [
        { name: 'Backend API', command: 'npm', args: ['run', 'dev', '--workspace=@blunari/background-ops'] },
        { name: 'Admin Dashboard', command: 'npm', args: ['run', 'dev', '--workspace=admin-dashboard'] },
        { name: 'Client Dashboard', command: 'npm', args: ['run', 'dev', '--workspace=client-dashboard'] }
      ];
      
      // Start all servers concurrently
      const processes = servers.map(server => {
        log(`🔄 Starting ${server.name}...`, 'cyan');
        return spawnCommand(server.command, server.args);
      });
      
      try {
        await Promise.all(processes);
      } catch (error) {
        log(`❌ Error starting servers: ${error.message}`, 'red');
      }
    }
  },

  'dev:backend': {
    description: '🌐 Start backend development server',
    action: async () => {
      log('🌐 Starting backend development server...', 'bright');
      await spawnCommand('npm', ['run', 'dev', '--workspace=@blunari/background-ops']);
    }
  },

  'dev:admin': {
    description: '🔧 Start admin dashboard development server',
    action: async () => {
      log('🔧 Starting admin dashboard development server...', 'bright');
      await spawnCommand('npm', ['run', 'dev', '--workspace=admin-dashboard']);
    }
  },

  'dev:client': {
    description: '👥 Start client dashboard development server',
    action: async () => {
      log('👥 Starting client dashboard development server...', 'bright');
      await spawnCommand('npm', ['run', 'dev', '--workspace=client-dashboard']);
    }
  },

  // Build commands
  'build:all': {
    description: '🏗️ Build all applications',
    action: async () => {
      log('🏗️ Building all applications...', 'bright');
      const result = executeCommand('npm run build --workspaces');
      
      if (result.success) {
        log('✅ All builds completed successfully!', 'green');
      } else {
        log(`❌ Build failed: ${result.error}`, 'red');
      }
    }
  },

  'build:backend': {
    description: '🌐 Build backend application',
    action: async () => {
      log('🌐 Building backend application...', 'bright');
      const result = executeCommand('npm run build --workspace=@blunari/background-ops');
      
      if (result.success) {
        log('✅ Backend build completed!', 'green');
      } else {
        log(`❌ Backend build failed: ${result.error}`, 'red');
      }
    }
  },

  'build:admin': {
    description: '🔧 Build admin dashboard',
    action: async () => {
      log('🔧 Building admin dashboard...', 'bright');
      const result = executeCommand('npm run build --workspace=admin-dashboard');
      
      if (result.success) {
        log('✅ Admin dashboard build completed!', 'green');
      } else {
        log(`❌ Admin dashboard build failed: ${result.error}`, 'red');
      }
    }
  },

  'build:client': {
    description: '👥 Build client dashboard',
    action: async () => {
      log('👥 Building client dashboard...', 'bright');
      const result = executeCommand('npm run build --workspace=client-dashboard');
      
      if (result.success) {
        log('✅ Client dashboard build completed!', 'green');
      } else {
        log(`❌ Client dashboard build failed: ${result.error}`, 'red');
      }
    }
  },

  // Testing commands
  'test:all': {
    description: '🧪 Run all tests',
    action: async () => {
      log('🧪 Running all tests...', 'bright');
      const result = executeCommand('npm run test --workspaces --if-present');
      
      if (result.success) {
        log('✅ All tests passed!', 'green');
      } else {
        log(`❌ Some tests failed: ${result.error}`, 'red');
      }
    }
  },

  'test:watch': {
    description: '👀 Run tests in watch mode',
    action: async () => {
      log('👀 Running tests in watch mode...', 'bright');
      await spawnCommand('npm', ['run', 'test:watch', '--workspaces', '--if-present']);
    }
  },

  'test:e2e': {
    description: '🎭 Run end-to-end tests',
    action: async () => {
      log('🎭 Running end-to-end tests...', 'bright');
      const result = executeCommand('npm run test:e2e --workspace=client-dashboard');
      
      if (result.success) {
        log('✅ E2E tests passed!', 'green');
      } else {
        log(`❌ E2E tests failed: ${result.error}`, 'red');
      }
    }
  },

  // Database commands
  'db:setup': {
    description: '🗄️ Set up local database',
    action: async () => {
      log('🗄️ Setting up local database...', 'bright');
      
      // Check if Supabase CLI is available
      const supabaseCheck = executeCommand('supabase --version', { silent: true });
      
      if (!supabaseCheck.success) {
        log('❌ Supabase CLI not found. Please install it first:', 'red');
        log('   npm i supabase -g', 'blue');
        return;
      }
      
      log('🔄 Starting Supabase...', 'yellow');
      const result = executeCommand('supabase start');
      
      if (result.success) {
        log('✅ Database setup completed!', 'green');
        log('📋 Connection details available in Supabase CLI output', 'cyan');
      } else {
        log(`❌ Database setup failed: ${result.error}`, 'red');
      }
    }
  },

  'db:reset': {
    description: '🔄 Reset local database',
    action: async () => {
      log('🔄 Resetting local database...', 'bright');
      const result = executeCommand('supabase db reset');
      
      if (result.success) {
        log('✅ Database reset completed!', 'green');
      } else {
        log(`❌ Database reset failed: ${result.error}`, 'red');
      }
    }
  },

  // Utility commands
  'clean': {
    description: '🧹 Clean build artifacts and dependencies',
    action: async () => {
      log('🧹 Cleaning build artifacts...', 'bright');
      
      const cleanCommands = [
        'rm -rf node_modules',
        'rm -rf apps/*/node_modules',
        'rm -rf packages/*/node_modules',
        'rm -rf apps/*/dist',
        'rm -rf apps/*/build',
        'rm -rf packages/*/dist'
      ];
      
      for (const command of cleanCommands) {
        executeCommand(command, { silent: true });
      }
      
      log('✅ Cleanup completed!', 'green');
      log('💡 Run `npm install` to reinstall dependencies', 'cyan');
    }
  },

  'setup': {
    description: '⚡ Quick project setup',
    action: async () => {
      log('⚡ Setting up project...', 'bright');
      
      log('📦 Installing dependencies...', 'yellow');
      const installResult = executeCommand('npm install');
      
      if (!installResult.success) {
        log(`❌ Dependency installation failed: ${installResult.error}`, 'red');
        return;
      }
      
      log('🏗️ Building packages...', 'yellow');
      const buildResult = executeCommand('npm run build --workspaces');
      
      if (!buildResult.success) {
        log(`❌ Build failed: ${buildResult.error}`, 'red');
        return;
      }
      
      log('🔍 Running initial quality check...', 'yellow');
      const qualityResult = executeCommand('npm run type-check --workspaces', { silent: true });
      
      if (qualityResult.success) {
        log('✅ Initial quality check passed!', 'green');
      } else {
        log('⚠️ Some quality issues found - run `npm run dev quality:fix` to fix', 'yellow');
      }
      
      log('\n🎉 Project setup completed!', 'green');
      log('🚀 Run `npm run dev dev:all` to start development servers', 'cyan');
    }
  },

  'status': {
    description: '📊 Show project status',
    action: async () => {
      log('📊 Project Status Report', 'bright');
      log('========================\n', 'bright');
      
      // Git status
      log('📋 Git Status:', 'cyan');
      const gitStatus = executeCommand('git status --porcelain', { silent: true });
      if (gitStatus.success && gitStatus.output.trim()) {
        log('   📝 Uncommitted changes detected', 'yellow');
      } else {
        log('   ✅ Working directory clean', 'green');
      }
      
      // Dependencies status
      log('\n📦 Dependencies:', 'cyan');
      const outdated = executeCommand('npm outdated --depth=0', { silent: true });
      if (outdated.success && !outdated.output.trim()) {
        log('   ✅ All dependencies up to date', 'green');
      } else {
        log('   ⚠️ Some dependencies may be outdated', 'yellow');
      }
      
      // Build status
      log('\n🏗️ Build Status:', 'cyan');
      const buildCheck = executeCommand('npm run type-check --workspaces', { silent: true });
      if (buildCheck.success) {
        log('   ✅ TypeScript compilation successful', 'green');
      } else {
        log('   ❌ TypeScript compilation issues found', 'red');
      }
      
      // Running services check
      log('\n🚀 Services:', 'cyan');
      const services = [
        { name: 'Backend API', url: 'http://localhost:5000/health' },
        { name: 'Admin Dashboard', url: 'http://localhost:5173' },
        { name: 'Client Dashboard', url: 'http://localhost:5174' }
      ];
      
      for (const service of services) {
        const check = executeCommand(`curl -s -o /dev/null -w "%{http_code}" ${service.url}`, { silent: true });
        if (check.success && check.output.trim() === '200') {
          log(`   ✅ ${service.name} is running`, 'green');
        } else {
          log(`   ⚪ ${service.name} is not running`, 'yellow');
        }
      }
    }
  }
};

// Help display
function showHelp() {
  log('🚀 Blunari SAAS Development Helper', 'bright');
  log('===================================\n', 'bright');
  
  log('Available commands:', 'cyan');
  Object.entries(commands).forEach(([name, config]) => {
    log(`  ${name.padEnd(20)} ${config.description}`, 'reset');
  });
  
  log('\nUsage:', 'cyan');
  log('  node dev.js <command>', 'reset');
  log('  npm run dev <command>', 'reset');
  log('\nExamples:', 'cyan');
  log('  npm run dev setup          # Quick project setup', 'reset');
  log('  npm run dev dev:all         # Start all development servers', 'reset');
  log('  npm run dev quality:check   # Run quality checks', 'reset');
  log('  npm run dev build:all       # Build all applications', 'reset');
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (!commands[command]) {
    log(`❌ Unknown command: ${command}`, 'red');
    log('Run `node dev.js help` to see available commands', 'yellow');
    process.exit(1);
  }
  
  try {
    await commands[command].action();
  } catch (error) {
    log(`❌ Command failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle signals gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Development helper stopped', 'yellow');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

module.exports = { commands, colors, log };
