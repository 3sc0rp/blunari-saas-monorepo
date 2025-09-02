#!/usr/bin/env node

/**
 * Performance Audit Script - Deep Analysis of Blunari SAAS Client Dashboard
 * Identifies potential performance bottlenecks, memory leaks, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

const AUDIT_RESULTS = {
  criticalIssues: [],
  warnings: [],
  recommendations: [],
  codeQualityIssues: [],
  memoryLeakRisks: [],
  performanceOptimizations: []
};

// Configuration
const CONFIG = {
  srcDir: './src',
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  excludePatterns: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage'
  ]
};

// Regex patterns for common issues
const PATTERNS = {
  // Memory leak patterns
  uncleanedEventListeners: /addEventListener\s*\([^)]+\).*?(?!.*removeEventListener)/g,
  uncleanedIntervals: /setInterval\s*\([^)]+\).*?(?!.*clearInterval)/g,
  uncleanedTimeouts: /setTimeout\s*\([^)]+\).*?(?!.*clearTimeout)/g,
  uncleanedSubscriptions: /\.subscribe\s*\([^)]+\).*?(?!.*unsubscribe)/g,
  
  // Performance anti-patterns
  inlineObjects: /\{\s*[^}]+\}/g,
  inlineFunctions: /\(\s*\)\s*=>/g,
  unnecessaryReRenders: /useState\s*\(\s*\{|\[\]|\{\}/g,
  missingMemoization: /function.*Component.*\{/g,
  
  // Type safety issues  
  anyTypes: /:\s*any(?:\s|;|,|\))/g,
  explicitAny: /@typescript-eslint\/no-explicit-any/g,
  
  // React hook dependency issues
  missingDeps: /useEffect\s*\([^,]+,\s*\[[^\]]*\]/g,
  exhaustiveDeps: /react-hooks\/exhaustive-deps/g,
  
  // Bundle size issues
  heavyImports: /import\s+.*\s+from\s+['"](@?[^'"]+\/[^'"]*|lodash|moment|react-icons\/\w+\/\w+)['"]/g,
  defaultImports: /import\s+\w+\s+from/g,
  
  // Error handling gaps
  unhandledPromises: /await\s+[^;]+(?!\.catch)/g,
  missingTryCatch: /async\s+function[^{]*\{(?![^}]*try)/g,
};

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !CONFIG.excludePatterns.includes(entry.name)) {
      scanDirectory(fullPath, files);
    } else if (entry.isFile() && CONFIG.extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Analyze file content for performance issues
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = {
    file: filePath,
    issues: []
  };

  // Check for memory leak patterns
  const eventListenerMatches = content.match(PATTERNS.uncleanedEventListeners);
  if (eventListenerMatches) {
    results.issues.push({
      type: 'MEMORY_LEAK_RISK',
      severity: 'HIGH',
      pattern: 'Event listeners without cleanup',
      matches: eventListenerMatches.length,
      lines: getLineNumbers(content, PATTERNS.uncleanedEventListeners)
    });
  }

  // Check for interval/timeout without cleanup
  const intervalMatches = content.match(PATTERNS.uncleanedIntervals);
  if (intervalMatches) {
    results.issues.push({
      type: 'MEMORY_LEAK_RISK', 
      severity: 'HIGH',
      pattern: 'setInterval without clearInterval',
      matches: intervalMatches.length,
      lines: getLineNumbers(content, PATTERNS.uncleanedIntervals)
    });
  }

  // Check for type safety issues
  const anyTypeMatches = content.match(PATTERNS.anyTypes);
  if (anyTypeMatches) {
    results.issues.push({
      type: 'TYPE_SAFETY',
      severity: 'MEDIUM',
      pattern: 'Use of any type',
      matches: anyTypeMatches.length,
      lines: getLineNumbers(content, PATTERNS.anyTypes)
    });
  }

  // Check for React hook dependency issues
  if (content.includes('useEffect') && content.includes('react-hooks/exhaustive-deps')) {
    results.issues.push({
      type: 'REACT_HOOKS',
      severity: 'HIGH',
      pattern: 'Missing hook dependencies',
      matches: 1,
      description: 'Found exhaustive-deps warning in file'
    });
  }

  // Check for performance anti-patterns
  const inlineObjectMatches = (content.match(/style=\{\{[^}]+\}\}/g) || []).length;
  if (inlineObjectMatches > 5) {
    results.issues.push({
      type: 'PERFORMANCE',
      severity: 'MEDIUM', 
      pattern: 'Excessive inline style objects',
      matches: inlineObjectMatches,
      recommendation: 'Use CSS classes or memoized objects'
    });
  }

  // Check for heavy imports
  const heavyImportMatches = content.match(PATTERNS.heavyImports);
  if (heavyImportMatches) {
    results.issues.push({
      type: 'BUNDLE_SIZE',
      severity: 'MEDIUM',
      pattern: 'Heavy imports detected',
      matches: heavyImportMatches.length,
      imports: heavyImportMatches.map(match => match.match(/from\s+['"]([^'"]+)['"]/)[1])
    });
  }

  // Check for missing error handling
  const unhandledPromiseMatches = content.match(PATTERNS.unhandledPromises);
  if (unhandledPromiseMatches && unhandledPromiseMatches.length > 3) {
    results.issues.push({
      type: 'ERROR_HANDLING',
      severity: 'MEDIUM',
      pattern: 'Promises without error handling',
      matches: unhandledPromiseMatches.length
    });
  }

  return results.issues.length > 0 ? results : null;
}

/**
 * Get line numbers for matches
 */
function getLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];
  
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      lineNumbers.push(index + 1);
    }
  });
  
  return lineNumbers;
}

/**
 * Generate performance report
 */
function generateReport(analyses) {
  const report = {
    summary: {
      totalFiles: analyses.length,
      criticalIssues: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0
    },
    categories: {
      memoryLeaks: [],
      performanceIssues: [], 
      typeSafety: [],
      reactHooks: [],
      bundleSize: [],
      errorHandling: []
    },
    recommendations: []
  };

  // Process all analyses
  analyses.forEach(analysis => {
    analysis.issues.forEach(issue => {
      // Count severity levels
      switch (issue.severity) {
        case 'CRITICAL':
          report.summary.criticalIssues++;
          break;
        case 'HIGH':
          report.summary.highSeverity++;
          break;
        case 'MEDIUM':
          report.summary.mediumSeverity++;
          break;
        case 'LOW':
          report.summary.lowSeverity++;
          break;
      }

      // Categorize issues
      const issueData = {
        file: analysis.file,
        ...issue
      };

      switch (issue.type) {
        case 'MEMORY_LEAK_RISK':
          report.categories.memoryLeaks.push(issueData);
          break;
        case 'PERFORMANCE':
          report.categories.performanceIssues.push(issueData);
          break;
        case 'TYPE_SAFETY':
          report.categories.typeSafety.push(issueData);
          break;
        case 'REACT_HOOKS':
          report.categories.reactHooks.push(issueData);
          break;
        case 'BUNDLE_SIZE':
          report.categories.bundleSize.push(issueData);
          break;
        case 'ERROR_HANDLING':
          report.categories.errorHandling.push(issueData);
          break;
      }
    });
  });

  // Add specific recommendations
  if (report.categories.memoryLeaks.length > 0) {
    report.recommendations.push({
      category: 'Memory Management',
      priority: 'HIGH',
      action: 'Add proper cleanup in useEffect hooks for all event listeners, intervals, and subscriptions',
      impact: 'Prevents memory leaks and improves long-term performance'
    });
  }

  if (report.categories.reactHooks.length > 0) {
    report.recommendations.push({
      category: 'React Hooks',
      priority: 'HIGH', 
      action: 'Fix all missing dependencies in useEffect, useCallback, and useMemo hooks',
      impact: 'Prevents stale closures and unexpected re-renders'
    });
  }

  if (report.categories.typeSafety.length > 10) {
    report.recommendations.push({
      category: 'Type Safety',
      priority: 'MEDIUM',
      action: 'Replace any types with specific TypeScript interfaces',
      impact: 'Improves code reliability and developer experience'
    });
  }

  return report;
}

/**
 * Format report for console output
 */
function formatReport(report) {
  console.log('\n🔍 BLUNARI SAAS PERFORMANCE AUDIT REPORT\n');
  console.log('=' .repeat(60));
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log(`Total Files Analyzed: ${report.summary.totalFiles}`);
  console.log(`Critical Issues: ${report.summary.criticalIssues}`);
  console.log(`High Severity: ${report.summary.highSeverity}`);
  console.log(`Medium Severity: ${report.summary.mediumSeverity}`);
  console.log(`Low Severity: ${report.summary.lowSeverity}`);

  // Top issues by category
  const categories = Object.entries(report.categories);
  categories.forEach(([category, issues]) => {
    if (issues.length > 0) {
      console.log(`\n🚨 ${category.toUpperCase().replace(/([A-Z])/g, ' $1')} (${issues.length})`);
      console.log('-'.repeat(40));
      
      issues.slice(0, 5).forEach((issue, index) => {
        console.log(`${index + 1}. ${path.basename(issue.file)}`);
        console.log(`   ${issue.pattern} (${issue.severity})`);
        if (issue.matches) console.log(`   Matches: ${issue.matches}`);
        if (issue.lines) console.log(`   Lines: ${issue.lines.slice(0, 3).join(', ')}${issue.lines.length > 3 ? '...' : ''}`);
        console.log('');
      });
      
      if (issues.length > 5) {
        console.log(`   ... and ${issues.length - 5} more files\n`);
      }
    }
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority}] ${rec.category}`);
    console.log(`   ${rec.action}`);
    console.log(`   Impact: ${rec.impact}\n`);
  });

  console.log('=' .repeat(60));
  console.log('\n✅ Audit Complete - Review issues above to optimize performance\n');
}

/**
 * Main execution
 */
function runAudit() {
  console.log('🔍 Starting performance audit...\n');
  
  try {
    // Scan all files
    const files = scanDirectory(CONFIG.srcDir);
    console.log(`Found ${files.length} files to analyze\n`);

    // Analyze each file
    const analyses = [];
    files.forEach(file => {
      const result = analyzeFile(file);
      if (result) {
        analyses.push(result);
      }
    });

    // Generate and display report
    const report = generateReport(analyses);
    formatReport(report);

    // Save detailed report to file
    fs.writeFileSync('./performance-audit-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed report saved to: performance-audit-report.json');

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
}

// Run the audit
if (require.main === module) {
  runAudit();
}

module.exports = { runAudit, analyzeFile, generateReport };
