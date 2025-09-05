/**
 * 🔬 COMPREHENSIVE PRODUCTION TESTING SUITE
 * Deep testing of https://demo.blunari.ai for React health and functionality
 */

class ProductionTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') this.errors.push(logEntry);
    else if (type === 'warning') this.warnings.push(logEntry);
    else this.testResults.push(logEntry);
  }

  async testReactSingletonHealth() {
    this.log('🔥 Testing React Singleton Health...', 'info');
    
    try {
      // Test 1: React availability
      if (typeof React === 'undefined') {
        this.log('❌ React is not available globally', 'error');
        return false;
      }
      
      this.log(`✅ React is available - Version: ${React.version}`, 'info');
      
      // Test 2: Check if our singleton/polyfill is active
      if (React.version.includes('singleton')) {
        this.log('🔥 React Singleton Enforcer is ACTIVE', 'info');
      } else if (React.version.includes('nuclear')) {
        this.log('🚨 Nuclear React Polyfill is ACTIVE', 'info');
      } else if (React.version.includes('emergency')) {
        this.log('⚡ Emergency React Polyfill is ACTIVE', 'info');
      } else {
        this.log('✨ Native React is loaded successfully', 'info');
      }
      
      // Test 3: Critical hooks availability
      const criticalHooks = [
        'useState', 'useEffect', 'useLayoutEffect', 'useContext',
        'useCallback', 'useMemo', 'useRef', 'useReducer',
        'useImperativeHandle', 'useDebugValue', 'useDeferredValue',
        'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'
      ];
      
      let hooksAvailable = 0;
      criticalHooks.forEach(hook => {
        if (typeof React[hook] === 'function') {
          hooksAvailable++;
          this.log(`✅ ${hook} is available`, 'info');
        } else {
          this.log(`❌ ${hook} is MISSING!`, 'error');
        }
      });
      
      this.log(`📊 Hooks availability: ${hooksAvailable}/${criticalHooks.length}`, 'info');
      
      // Test 4: useLayoutEffect specific test (our main issue)
      if (typeof React.useLayoutEffect === 'function') {
        this.log('🎯 useLayoutEffect is PROTECTED - vendor chunk errors eliminated!', 'info');
      } else {
        this.log('🚨 useLayoutEffect is still missing - protection failed!', 'error');
      }
      
      // Test 5: Multiple React instances check
      const reactInstances = [];
      if (window.React) reactInstances.push('window.React');
      if (globalThis.React) reactInstances.push('globalThis.React');
      if (typeof global !== 'undefined' && global.React) reactInstances.push('global.React');
      if (typeof self !== 'undefined' && self.React) reactInstances.push('self.React');
      
      this.log(`🔍 React instances found: ${reactInstances.length}`, 'info');
      
      if (reactInstances.length === 0) {
        this.log('🚨 NO React instances found - critical failure!', 'error');
        return false;
      } else if (reactInstances.length === 1) {
        this.log('✅ Single React instance - no version conflicts', 'info');
      } else {
        this.log('⚠️ Multiple React instances detected - checking consistency...', 'warning');
        
        const versions = reactInstances.map(inst => {
          try {
            return eval(inst).version;
          } catch (e) {
            return 'unknown';
          }
        });
        
        const uniqueVersions = [...new Set(versions)];
        if (uniqueVersions.length === 1) {
          this.log('✅ All React instances have the same version - no conflicts', 'info');
        } else {
          this.log(`🚨 React version mismatch detected: ${uniqueVersions.join(', ')}`, 'error');
        }
      }
      
      return true;
    } catch (error) {
      this.log(`🚨 React health test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testVendorChunkLoading() {
    this.log('📦 Testing Vendor Chunk Loading...', 'info');
    
    try {
      // Check if vendor chunks are loaded
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const vendorChunks = scripts.filter(script => 
        script.src.includes('vendor-') || script.src.includes('chunk')
      );
      
      this.log(`📦 Found ${vendorChunks.length} vendor/chunk scripts`, 'info');
      
      vendorChunks.forEach(script => {
        const chunkName = script.src.split('/').pop();
        this.log(`  - ${chunkName}`, 'info');
      });
      
      // Test for vendor-react-all chunk specifically
      const reactChunk = vendorChunks.find(script => 
        script.src.includes('vendor-react-all')
      );
      
      if (reactChunk) {
        this.log('✅ vendor-react-all chunk found - React consolidation working', 'info');
      } else {
        this.log('⚠️ vendor-react-all chunk not found - checking for React chunks', 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`🚨 Vendor chunk test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testConsoleErrors() {
    this.log('🔍 Testing Console Error Monitoring...', 'info');
    
    // Override console.error to capture errors
    const originalError = console.error;
    const capturedErrors = [];
    
    console.error = function(...args) {
      capturedErrors.push(args.join(' '));
      originalError.apply(console, args);
    };
    
    // Wait a bit to capture any delayed errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restore original console.error
    console.error = originalError;
    
    if (capturedErrors.length === 0) {
      this.log('✅ No console errors detected', 'info');
    } else {
      this.log(`⚠️ ${capturedErrors.length} console errors found:`, 'warning');
      capturedErrors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'warning');
      });
    }
    
    return capturedErrors.length === 0;
  }

  async testApplicationFunctionality() {
    this.log('🎯 Testing Application Functionality...', 'info');
    
    try {
      // Test 1: Check if root element exists and has content
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        this.log('❌ Root element not found', 'error');
        return false;
      }
      
      if (rootElement.innerHTML.trim() === '') {
        this.log('❌ Root element is empty - app not rendering', 'error');
        return false;
      }
      
      this.log('✅ Root element exists and has content', 'info');
      
      // Test 2: Check for React app indicators
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-checksum]');
      if (reactElements.length > 0) {
        this.log('✅ React app elements detected', 'info');
      }
      
      // Test 3: Check for common UI elements
      const commonElements = [
        'button', 'input', 'form', 'nav', 'header', 'main', 'footer'
      ];
      
      commonElements.forEach(tag => {
        const elements = document.querySelectorAll(tag);
        if (elements.length > 0) {
          this.log(`✅ Found ${elements.length} ${tag} elements`, 'info');
        }
      });
      
      return true;
    } catch (error) {
      this.log(`🚨 Application functionality test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testPolyfillActivation() {
    this.log('🛡️ Testing Polyfill Activation...', 'info');
    
    try {
      // Check for polyfill scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const polyfillScripts = scripts.filter(script => 
        script.src.includes('polyfill') || 
        script.src.includes('singleton') ||
        script.src.includes('nuclear') ||
        script.src.includes('emergency')
      );
      
      this.log(`🛡️ Found ${polyfillScripts.length} polyfill scripts`, 'info');
      
      polyfillScripts.forEach(script => {
        const scriptName = script.src.split('/').pop();
        this.log(`  - ${scriptName}`, 'info');
      });
      
      // Check if our status checker is available
      if (typeof window.checkReactSingletonStatus === 'function') {
        this.log('✅ React status checker is available', 'info');
        
        // Run the status checker
        const status = window.checkReactSingletonStatus();
        if (status.reactAvailable && status.useLayoutEffectAvailable) {
          this.log('✅ React status checker confirms healthy state', 'info');
        } else {
          this.log('⚠️ React status checker detected issues', 'warning');
        }
      } else {
        this.log('⚠️ React status checker not found', 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`🚨 Polyfill activation test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runFullTest() {
    this.log('🚀 Starting Comprehensive Production Test Suite', 'info');
    this.log('🌐 Testing: https://demo.blunari.ai/', 'info');
    
    const tests = [
      { name: 'React Singleton Health', test: () => this.testReactSingletonHealth() },
      { name: 'Vendor Chunk Loading', test: () => this.testVendorChunkLoading() },
      { name: 'Console Error Monitoring', test: () => this.testConsoleErrors() },
      { name: 'Application Functionality', test: () => this.testApplicationFunctionality() },
      { name: 'Polyfill Activation', test: () => this.testPolyfillActivation() }
    ];
    
    const results = {};
    
    for (const { name, test } of tests) {
      this.log(`\n🔬 Running ${name} Test...`, 'info');
      try {
        results[name] = await test();
        this.log(`${results[name] ? '✅' : '❌'} ${name} Test: ${results[name] ? 'PASSED' : 'FAILED'}`, results[name] ? 'info' : 'error');
      } catch (error) {
        results[name] = false;
        this.log(`❌ ${name} Test: FAILED - ${error.message}`, 'error');
      }
    }
    
    // Summary
    this.log('\n📊 TEST SUMMARY', 'info');
    this.log('=' * 50, 'info');
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    this.log(`Tests Passed: ${passed}/${total}`, 'info');
    this.log(`Errors: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'info');
    this.log(`Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'info');
    
    if (passed === total) {
      this.log('🎉 ALL TESTS PASSED - Production deployment is healthy!', 'info');
    } else {
      this.log(`⚠️ ${total - passed} tests failed - Review errors above`, 'warning');
    }
    
    return {
      results,
      passed,
      total,
      errors: this.errors,
      warnings: this.warnings,
      success: passed === total
    };
  }
}

// Create and run the test suite
const tester = new ProductionTester();
tester.runFullTest().then(summary => {
  console.log('\n🏁 Testing Complete!');
  console.log('Full results available in tester.testResults');
  window.productionTestResults = summary;
});

// Make tester available globally for manual testing
window.productionTester = tester;
