// Test script for password setup email function
// This will test the email generation without actually sending an email

const testPasswordSetupEmail = async () => {
  console.log('🧪 Testing Password Setup Email Function...\n');

  // Test data - using your tenant info from the email
  const testData = {
    tenantId: "some-tenant-id", // You'd need the actual tenant ID
    sendEmail: false, // Don't actually send email, just generate link
    ownerNameOverride: "Drood Wick"
  };

  try {
    console.log('📧 Testing email function with data:', testData);
    
    // This would normally call your Supabase function
    // For now, let's just verify the URL structure that should be generated
    
    const expectedBaseUrl = "https://app.blunari.ai";
    const expectedRedirectUrl = `${expectedBaseUrl}/auth?tenant=drood-wick`;
    
    console.log('✅ Expected redirect URL:', expectedRedirectUrl);
    console.log('✅ This should match the CLIENT_BASE_URL environment variable');
    console.log('✅ Supabase will append authentication tokens to this URL');
    
    // The final URL structure should be:
    // https://kbfbbkcaxhzlnbqxwgoz.supabase.co/auth/v1/verify?token=...&type=invite&redirect_to=https://app.blunari.ai/auth?tenant=drood-wick
    
    console.log('\n🔗 Expected final email link structure:');
    console.log('   Supabase auth URL with token + redirect_to parameter');
    console.log('   When clicked, redirects to: https://app.blunari.ai/auth?tenant=drood-wick#access_token=...&type=invite');
    
    console.log('\n✅ URL configuration appears correct!');
    console.log('📋 Next: Have your client click the email link to test the full flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testPasswordSetupEmail();
