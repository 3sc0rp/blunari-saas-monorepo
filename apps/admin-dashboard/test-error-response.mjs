#!/usr/bin/env node
/**
 * Detailed Error Response Test
 */

const SUPABASE_URL = "https://kbfbbkcaxhzlnbqxwgoz.supabase.co";

console.log("🔍 Detailed Function Response Analysis\n");

async function main() {
  console.log("Testing authentication error response...\n");
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/manage-tenant-credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: "test-tenant-id",
        action: "generate_password"
      })
    }
  );
  
  console.log(`HTTP Status: ${response.status} ${response.statusText}`);
  console.log("\nResponse Headers:");
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  
  const text = await response.text();
  console.log("\nRaw Response Body:");
  console.log(text);
  
  try {
    const json = JSON.parse(text);
    console.log("\nParsed JSON:");
    console.log(JSON.stringify(json, null, 2));
    
    console.log("\n✅ Response Analysis:");
    console.log(`  - Has 'error' field: ${!!json.error}`);
    console.log(`  - Has 'correlation_id' field: ${!!json.correlation_id}`);
    console.log(`  - Has 'details' field: ${!!json.details}`);
    console.log(`  - Has 'hint' field: ${!!json.hint}`);
    
    if (json.correlation_id) {
      console.log(`\n🎯 Correlation ID: ${json.correlation_id}`);
      console.log("   Use this to search Supabase logs!");
    }
  } catch (e) {
    console.error("\n❌ Response is not valid JSON");
  }
}

main().catch(console.error);
