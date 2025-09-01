// Simple script to add sample catering data
// Run this in the browser console on the catering page

(async function addSampleCateringData() {
  // We'll use the existing supabase client from the page
  if (typeof window === 'undefined' || !window.supabase) {
    console.error('This script needs to run in the browser with supabase client available');
    return;
  }

  const supabase = window.supabase;
  
  try {
    // First, let's find the demo tenant
    console.log('Looking for demo tenant...');
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'demo-restaurant')
      .limit(1);
    
    if (tenantError) {
      console.error('Error finding tenant:', tenantError);
      return;
    }
    
    if (!tenants || tenants.length === 0) {
      console.error('Demo restaurant tenant not found');
      return;
    }
    
    const tenantId = tenants[0].id;
    console.log('Found tenant:', tenants[0].name, 'ID:', tenantId);
    
    // Sample catering packages
    const samplePackages = [
      {
        tenant_id: tenantId,
        name: 'Executive Business Lunch',
        description: 'Premium catering package perfect for corporate events and business meetings. Includes gourmet sandwiches, fresh salads, and beverages.',
        price_per_person: 2499, // $24.99
        min_guests: 10,
        max_guests: 50,
        preparation_time_hours: 24,
        includes_setup: true,
        includes_service: true,
        includes_cleanup: true,
        dietary_accommodations: ['vegetarian', 'gluten_free'],
        popular: true,
        active: true
      },
      {
        tenant_id: tenantId,
        name: 'Wedding Reception Package',
        description: 'Elegant three-course dinner perfect for wedding receptions and formal celebrations. Includes appetizers, main course, dessert, and full service.',
        price_per_person: 7999, // $79.99
        min_guests: 50,
        max_guests: 200,
        preparation_time_hours: 72,
        includes_setup: true,
        includes_service: true,
        includes_cleanup: true,
        dietary_accommodations: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
        popular: true,
        active: true
      },
      {
        tenant_id: tenantId,
        name: 'Casual Office Party',
        description: 'Fun and relaxed catering for office parties and team events. Pizza, finger foods, and beverages to keep everyone happy.',
        price_per_person: 1899, // $18.99
        min_guests: 15,
        max_guests: 75,
        preparation_time_hours: 12,
        includes_setup: false,
        includes_service: false,
        includes_cleanup: false,
        dietary_accommodations: ['vegetarian'],
        popular: false,
        active: true
      },
      {
        tenant_id: tenantId,
        name: 'Holiday Celebration Feast',
        description: 'Special holiday catering featuring traditional dishes and seasonal favorites. Perfect for corporate holiday parties and family gatherings.',
        price_per_person: 4999, // $49.99
        min_guests: 25,
        max_guests: 100,
        preparation_time_hours: 48,
        includes_setup: true,
        includes_service: true,
        includes_cleanup: true,
        dietary_accommodations: ['vegetarian', 'gluten_free', 'dairy_free'],
        popular: false,
        active: true
      }
    ];
    
    console.log('Adding catering packages...');
    
    // Insert packages one by one to handle any errors
    for (const pkg of samplePackages) {
      try {
        const { data, error } = await supabase
          .from('catering_packages')
          .insert(pkg)
          .select()
          .single();
        
        if (error) {
          console.error('Error adding package:', pkg.name, error);
        } else {
          console.log('✅ Added package:', pkg.name);
        }
      } catch (err) {
        console.error('Exception adding package:', pkg.name, err);
      }
    }
    
    console.log('✅ Sample catering data added successfully!');
    console.log('🔄 Refresh the page to see the new packages');
    
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
})();
