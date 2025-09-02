// Console debugging functions for useTenant hook
// Copy and paste these into browser console for quick testing

// Test function 1: Check getTenantSlugFromDomain directly
function testTenantSlugExtraction() {
  console.log('🧪 Testing tenant slug extraction...');
  
  const originalUrl = window.location.href;
  console.log('Current URL:', originalUrl);
  
  // Test different URL patterns
  const testUrls = [
    'http://localhost:8080',
    'http://localhost:8080?tenant=kpizza',
    'http://localhost:8080?tenant=dees-poizza',
    'http://localhost:8080/debug-tenant?tenant=drood-wick',
    'https://restaurant.example.com',
    'https://pizza.lovable.dev'
  ];
  
  testUrls.forEach(url => {
    const mockLocation = new URL(url);
    const hostname = mockLocation.hostname;
    const search = mockLocation.search;
    
    let result = null;
    
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
      const urlParams = new URLSearchParams(search);
      result = urlParams.get('tenant');
    } else {
      const parts = hostname.split(".");
      if (parts.length >= 3) {
        result = parts[0];
      } else if (parts.length === 2) {
        result = parts[0];
      }
    }
    
    console.log(`URL: ${url} → Tenant: ${result || 'None'}`);
  });
}

// Test function 2: Direct API test
async function testDirectTenantAPI(slug = 'kpizza') {
  console.log(`🧪 Testing direct API call for: ${slug}`);
  
  try {
    // Import the API helper (this might not work in console, but shows the approach)
    const response = await fetch(`https://kbfbbkcaxhzlnbqxwgoz.supabase.co/rest/v1/tenants?slug=eq.${slug}&select=*`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`✅ API Response for ${slug}:`, data);
    
    if (response.status !== 200) {
      console.error(`❌ API returned status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`💥 API test failed for ${slug}:`, error);
    return null;
  }
}

// Test function 3: Check current hook state (if available)
function getCurrentHookState() {
  console.log('🧪 Checking current hook state...');
  
  // This won't work in console but shows what to look for
  console.log('Current URL:', window.location.href);
  console.log('Hostname:', window.location.hostname);
  console.log('Search params:', window.location.search);
  
  const params = new URLSearchParams(window.location.search);
  console.log('Tenant param:', params.get('tenant'));
}

// Instructions
console.log(`
🧪 Tenant Hook Debugging Functions Loaded!

Available functions:
- testTenantSlugExtraction() - Test URL parsing logic
- testDirectTenantAPI('slug') - Test API directly  
- getCurrentHookState() - Check current URL state

Example usage:
testTenantSlugExtraction()
testDirectTenantAPI('kpizza')
getCurrentHookState()
`);

// Auto-run basic tests
testTenantSlugExtraction();
getCurrentHookState();
