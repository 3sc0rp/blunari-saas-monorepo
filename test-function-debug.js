// Test script to debug the tenant password setup email function
async function testFunction() {
  const response = await fetch("https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/tenant-password-setup-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_TOKEN_HERE" // Replace with actual token
    },
    body: JSON.stringify({
      tenantId: "test-tenant-id"
    })
  });

  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log("Response:", text);
  
  try {
    const json = JSON.parse(text);
    console.log("JSON Response:", json);
  } catch (e) {
    console.log("Not JSON response");
  }
}

// testFunction();
console.log("Test script ready. Replace YOUR_TOKEN_HERE with actual token and uncomment the testFunction() call.");
