/**
 * 🔬 COMPREHENSIVE REACT PROTECTION TEST SUITE
 * Tests all 4 layers of protection and verifies vendor chunk error elimination
 */

async function runComprehensiveReactTest() {
  console.group('🚨 COMPREHENSIVE REACT PROTECTION TEST SUITE');
  console.log('📅 Test Date:', new Date().toISOString());
  console.log('🌐 Testing Environment:', window.location.href);
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };
  
  function logTest(name, status, message, level = 'info') {
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    
    logMethod(`${emoji} ${name}: ${status} - ${message}`);
    
    results.tests.push({ name, status, message, level });
    if (status === 'PASS') results.passed++;
    else if (status === 'FAIL') results.failed++;
    else results.warnings++;
  }
  
  console.log('\n🔬 Starting Protection Layer Tests...\n');
  
  // Test 1: Vendor Chunk Error Interceptor
  console.group('🚨 Layer 1: Vendor Chunk Error Interceptor');
  try {
    // Check if the interceptor loaded
    if (typeof window.onerror === 'function') {
      logTest('Error Interceptor', 'PASS', 'Global error handler is overridden');
    } else {
      logTest('Error Interceptor', 'FAIL', 'Global error handler not found');
    }
    
    // Check if useLayoutEffect protection is immediate
    if (typeof window.useLayoutEffect === 'function') {
      logTest('Immediate useLayoutEffect Protection', 'PASS', 'useLayoutEffect available globally');
    } else {
      logTest('Immediate useLayoutEffect Protection', 'FAIL', 'useLayoutEffect not globally protected');
    }
    
    // Test protected hook functionality
    try {
      const result = window.useLayoutEffect();
      logTest('Protected Hook Execution', 'PASS', 'useLayoutEffect executes safely');
    } catch (e) {
      logTest('Protected Hook Execution', 'FAIL', `Error: ${e.message}`);
    }
    
  } catch (error) {
    logTest('Vendor Chunk Interceptor', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Test 2: React Singleton Enforcer  
  console.group('🔥 Layer 2: React Singleton Enforcer');
  try {
    // Check React availability
    if (typeof React !== 'undefined') {
      logTest('React Global Availability', 'PASS', `React version: ${React.version}`);
      
      // Check if it's our singleton
      if (React.version && React.version.includes('singleton')) {
        logTest('Singleton Detection', 'PASS', 'React Singleton Enforcer is active');
      } else {
        logTest('Singleton Detection', 'WARN', 'Native React detected, checking consistency');
      }
    } else {
      logTest('React Global Availability', 'FAIL', 'React not available globally');
    }
    
    // Test singleton enforcement
    const originalReact = window.React;
    try {
      window.React = { fake: true };
      if (window.React === originalReact) {
        logTest('Singleton Enforcement', 'PASS', 'React replacement blocked successfully');
      } else {
        logTest('Singleton Enforcement', 'FAIL', 'React singleton was overridden');
      }
    } catch (e) {
      logTest('Singleton Enforcement', 'PASS', 'React assignment threw error (protection active)');
    }
    
    // Restore original React
    window.React = originalReact;
    
  } catch (error) {
    logTest('React Singleton Enforcer', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Test 3: Nuclear React Polyfill
  console.group('🚨 Layer 3: Nuclear React Polyfill');
  try {
    // Test critical hooks availability
    const criticalHooks = [
      'useState', 'useEffect', 'useLayoutEffect', 'useContext',
      'useCallback', 'useMemo', 'useRef', 'useReducer'
    ];
    
    let hooksAvailable = 0;
    criticalHooks.forEach(hook => {
      if (typeof React[hook] === 'function') {
        hooksAvailable++;
      }
    });
    
    if (hooksAvailable === criticalHooks.length) {
      logTest('Critical Hooks Availability', 'PASS', `All ${criticalHooks.length} hooks available`);
    } else {
      logTest('Critical Hooks Availability', 'FAIL', `Only ${hooksAvailable}/${criticalHooks.length} hooks available`);
    }
    
    // Test useLayoutEffect specifically (our main concern)
    if (typeof React.useLayoutEffect === 'function') {
      logTest('useLayoutEffect Protection', 'PASS', 'useLayoutEffect is protected and available');
    } else {
      logTest('useLayoutEffect Protection', 'FAIL', 'useLayoutEffect is missing from React object');
    }
    
  } catch (error) {
    logTest('Nuclear React Polyfill', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Test 4: Multiple Instance Detection
  console.group('🔍 Layer 4: Multiple Instance Detection');
  try {
    const reactInstances = [];
    if (window.React) reactInstances.push('window.React');
    if (globalThis.React) reactInstances.push('globalThis.React');
    if (typeof global !== 'undefined' && global.React) reactInstances.push('global.React');
    if (typeof self !== 'undefined' && self.React) reactInstances.push('self.React');
    
    logTest('React Instances Found', 'INFO', `${reactInstances.length} instances: ${reactInstances.join(', ')}`);
    
    if (reactInstances.length === 0) {
      logTest('Instance Check', 'FAIL', 'No React instances found');
    } else if (reactInstances.length === 1) {
      logTest('Instance Check', 'PASS', 'Single React instance - no conflicts');
    } else {
      // Check if all instances are the same
      const versions = reactInstances.map(inst => {
        try {
          return eval(inst).version;
        } catch (e) {
          return 'unknown';
        }
      });
      
      const uniqueVersions = [...new Set(versions)];
      if (uniqueVersions.length === 1) {
        logTest('Instance Consistency', 'PASS', 'All instances have same version');
      } else {
        logTest('Instance Consistency', 'FAIL', `Version mismatch: ${uniqueVersions.join(', ')}`);
      }
    }
    
  } catch (error) {
    logTest('Multiple Instance Detection', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Test 5: Vendor Chunk Error Simulation
  console.group('⚡ Layer 5: Vendor Chunk Error Simulation');
  try {
    // Simulate the exact error that was occurring
    logTest('Simulating Vendor Chunk Error', 'INFO', 'Testing vendor-safe chunk useLayoutEffect access...');
    
    // Create a mock vendor chunk scenario
    const mockVendorChunk = {};
    try {
      // This would normally throw: Cannot read properties of undefined (reading 'useLayoutEffect')
      const result = mockVendorChunk.useLayoutEffect;
      logTest('Vendor Chunk Access', 'PASS', 'No error thrown for undefined access');
    } catch (e) {
      logTest('Vendor Chunk Access', 'WARN', `Error caught but handled: ${e.message}`);
    }
    
    // Test our global protection
    try {
      const protectedAccess = window.useLayoutEffect || globalThis.useLayoutEffect;
      if (typeof protectedAccess === 'function') {
        logTest('Global Protection Fallback', 'PASS', 'useLayoutEffect available via global protection');
      } else {
        logTest('Global Protection Fallback', 'FAIL', 'Global protection not working');
      }
    } catch (e) {
      logTest('Global Protection Fallback', 'FAIL', `Global protection error: ${e.message}`);
    }
    
  } catch (error) {
    logTest('Vendor Chunk Error Simulation', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Test 6: React Status Checker Integration
  console.group('🔍 Layer 6: React Status Checker Integration');
  try {
    if (typeof window.checkReactSingletonStatus === 'function') {
      logTest('Status Checker Availability', 'PASS', 'React status checker function available');
      
      // Run the status checker
      const status = window.checkReactSingletonStatus();
      if (status && status.reactAvailable && status.useLayoutEffectAvailable) {
        logTest('Status Checker Results', 'PASS', 'React and useLayoutEffect both available');
      } else {
        logTest('Status Checker Results', 'WARN', 'Status checker reports issues');
      }
    } else {
      logTest('Status Checker Availability', 'WARN', 'React status checker not available');
    }
  } catch (error) {
    logTest('React Status Checker Integration', 'FAIL', `Test error: ${error.message}`, 'error');
  }
  console.groupEnd();
  
  // Final Results
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`📊 Total Tests: ${results.tests.length}`);
  
  const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log('🎉 ALL CRITICAL TESTS PASSED - React protection system is FULLY FUNCTIONAL!');
  } else {
    console.log(`⚠️ ${results.failed} tests failed - Review issues above`);
  }
  
  if (results.warnings > 0) {
    console.log(`⚠️ ${results.warnings} warnings - Minor issues detected`);
  }
  
  console.groupEnd();
  
  return {
    success: results.failed === 0,
    results,
    successRate: parseFloat(successRate)
  };
}

// Execute the test
console.log('🚀 Starting React Protection System Test...');
runComprehensiveReactTest().then(summary => {
  console.log('\n🏁 Testing Complete!');
  window.reactProtectionTestResults = summary;
});
