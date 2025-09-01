// Sample data seeder for catering system
const { Pool } = require('pg');

// Database connection using same config as background-ops
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/background_ops';

async function seedCateringData() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🌱 Starting catering data seeding...');
    
    // First, let's find or create the demo tenant
    console.log('Looking for demo tenant...');
    
    const tenantResult = await pool.query(`
      SELECT id, name, slug FROM tenants 
      WHERE slug = 'demo-restaurant' 
      LIMIT 1
    `);
    
    let tenantId;
    
    if (tenantResult.rows.length === 0) {
      console.log('Creating demo restaurant tenant...');
      
      const createTenant = await pool.query(`
        INSERT INTO tenants (
          name, slug, status, timezone, currency, 
          description, phone, email
        ) VALUES (
          'Demo Restaurant', 'demo-restaurant', 'active', 
          'America/New_York', 'USD',
          'Demo restaurant for testing catering functionality',
          '+1-555-0123', 'demo@restaurant.com'
        ) RETURNING id, name
      `);
      
      tenantId = createTenant.rows[0].id;
      console.log('✅ Created demo tenant:', createTenant.rows[0].name, 'ID:', tenantId);
    } else {
      tenantId = tenantResult.rows[0].id;
      console.log('✅ Found existing tenant:', tenantResult.rows[0].name, 'ID:', tenantId);
    }
    
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
        dietary_accommodations: JSON.stringify(['vegetarian', 'gluten_free']),
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
        dietary_accommodations: JSON.stringify(['vegetarian', 'vegan', 'gluten_free', 'dairy_free']),
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
        dietary_accommodations: JSON.stringify(['vegetarian']),
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
        dietary_accommodations: JSON.stringify(['vegetarian', 'gluten_free', 'dairy_free']),
        popular: false,
        active: true
      }
    ];
    
    console.log('Adding catering packages...');
    
    // Insert packages
    for (const pkg of samplePackages) {
      try {
        const result = await pool.query(`
          INSERT INTO catering_packages (
            tenant_id, name, description, price_per_person,
            min_guests, max_guests, preparation_time_hours,
            includes_setup, includes_service, includes_cleanup,
            dietary_accommodations, popular, active
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING id, name
        `, [
          pkg.tenant_id, pkg.name, pkg.description, pkg.price_per_person,
          pkg.min_guests, pkg.max_guests, pkg.preparation_time_hours,
          pkg.includes_setup, pkg.includes_service, pkg.includes_cleanup,
          pkg.dietary_accommodations, pkg.popular, pkg.active
        ]);
        
        console.log('✅ Added package:', result.rows[0].name);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log('⚠️  Package already exists:', pkg.name);
        } else {
          console.error('❌ Error adding package:', pkg.name, error.message);
        }
      }
    }
    
    console.log('✅ Catering data seeding completed successfully!');
    
    // Show summary
    const packagesCount = await pool.query(`
      SELECT COUNT(*) as count FROM catering_packages 
      WHERE tenant_id = $1 AND active = true
    `, [tenantId]);
    
    console.log(`📊 Total active packages for demo tenant: ${packagesCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding catering data:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeder
if (require.main === module) {
  seedCateringData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedCateringData };
