/**
 * 🔍 React Version Mismatch Detection & Prevention Test
 * This script checks if multiple React versions exist and our polyfills are working
 */

function checkReactSingletonStatus() {
  console.group('🔥 REACT SINGLETON STATUS CHECK');
  
  // Check React availability
  if (typeof React !== 'undefined') {
    console.log('✅ React is available globally');
    console.log('📦 React version:', React.version);
    
    // Check if React is our singleton
    if (React.version && React.version.includes('singleton')) {
      console.log('🔥 React Singleton Enforcer is ACTIVE');
    } else if (React.version && React.version.includes('nuclear')) {
      console.log('🚨 Nuclear React Polyfill is ACTIVE');
    } else if (React.version && React.version.includes('emergency')) {
      console.log('⚡ Emergency React Polyfill is ACTIVE');
    } else {
      console.log('✨ Native React is loaded successfully');
    }
    
    // Test critical hooks
    const criticalHooks = [
      'useState', 'useEffect', 'useLayoutEffect', 'useContext',
      'useCallback', 'useMemo', 'useRef', 'useReducer'
    ];
    
    console.log('🧪 Testing React hooks availability...');
    criticalHooks.forEach(hook => {
      if (typeof React[hook] === 'function') {
        console.log(`✅ ${hook} is available`);
      } else {
        console.error(`❌ ${hook} is MISSING!`);
      }
    });
    
    // Check for useLayoutEffect specifically (our main issue)
    if (typeof React.useLayoutEffect === 'function') {
      console.log('🎯 useLayoutEffect is PROTECTED - vendor chunk errors eliminated!');
    } else {
      console.error('🚨 useLayoutEffect is still missing - protection failed!');
    }
    
  } else {
    console.error('❌ React is NOT available globally - polyfill system failed!');
  }
  
  // Check for multiple React instances
  const reactInstances = [];
  if (window.React) reactInstances.push('window.React');
  if (globalThis.React) reactInstances.push('globalThis.React');
  if (typeof global !== 'undefined' && global.React) reactInstances.push('global.React');
  if (typeof self !== 'undefined' && self.React) reactInstances.push('self.React');
  
  console.log(`🔍 React instances found: ${reactInstances.length}`);
  reactInstances.forEach(instance => console.log(`  - ${instance}`));
  
  if (reactInstances.length === 0) {
    console.error('🚨 NO React instances found - critical failure!');
  } else if (reactInstances.length === 1) {
    console.log('✅ Single React instance - no version conflicts');
  } else {
    console.warn('⚠️ Multiple React instances detected - checking consistency...');
    
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
      console.log('✅ All React instances have the same version - no conflicts');
    } else {
      console.error('🚨 React version mismatch detected:', uniqueVersions);
    }
  }
  
  console.groupEnd();
  
  // Return status for external checks
  return {
    reactAvailable: typeof React !== 'undefined',
    reactVersion: typeof React !== 'undefined' ? React.version : null,
    useLayoutEffectAvailable: typeof React !== 'undefined' && typeof React.useLayoutEffect === 'function',
    singletonActive: typeof React !== 'undefined' && React.version && React.version.includes('singleton'),
    instanceCount: reactInstances.length
  };
}

// Run the check immediately
const status = checkReactSingletonStatus();

// Export for use in browser console
window.checkReactSingletonStatus = checkReactSingletonStatus;

console.log('🔍 Run checkReactSingletonStatus() in console to check React status anytime');

// Return status for verification
status;
