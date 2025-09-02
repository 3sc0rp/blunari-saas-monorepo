#!/usr/bin/env node

/**
 * Database Setup Script for Blunari SAAS
 * Ensures proper tenant data exists for development and testing
 */

import { createClient } from '@supabase/supabase-js';

// Use the actual Supabase URL from environment or config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ksfqbkevbnlqmoegoz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZnFia2V2Ym5scW1vZWdveiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMxMzUzNzIzLCJleHAiOjIwNDY5Mjk3MjN9.1VazYnDIwixcflcrQ9JFYoFPOALfUU6mYc-n6U0sQWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDemoTenants() {
  console.log('🔧 Setting up demo tenants...');

  const tenants = [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: 'Demo Restaurant',
      slug: 'demo',
      status: 'active',
      timezone: 'America/New_York',
      currency: 'USD',
      description: 'Demo restaurant for testing Blunari SAAS platform',
      email: 'demo@blunari.com',
      primary_color: '#1e3a8a',
      secondary_color: '#f59e0b'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'K Pizza Restaurant',
      slug: 'kpizza',
      status: 'active',
      timezone: 'America/New_York', 
      currency: 'USD',
      description: 'K Pizza - Premium pizza restaurant',
      email: 'hello@kpizza.com',
      primary_color: '#dc2626',
      secondary_color: '#fbbf24'
    },
    {
      id: '987fcdeb-51d2-43a1-9876-543210fedcba',
      name: 'The Gourmet Corner',
      slug: 'gourmet-corner',
      status: 'active',
      timezone: 'America/Los_Angeles',
      currency: 'USD', 
      description: 'Fine dining experience with modern cuisine',
      email: 'contact@gourmetcorner.com',
      primary_color: '#7c3aed',
      secondary_color: '#f97316'
    }
  ];

  // Insert or update tenants
  for (const tenant of tenants) {
    console.log(`📝 Setting up tenant: ${tenant.name} (${tenant.slug})`);
    
    const { data, error } = await supabase
      .from('tenants')
      .upsert(tenant, { onConflict: 'id' })
      .select();

    if (error) {
      console.error(`❌ Failed to setup ${tenant.slug}:`, error);
    } else {
      console.log(`✅ Successfully setup ${tenant.slug}`);
      
      // Setup default tables for each tenant
      await setupTenantTables(tenant.id, tenant.slug);
      await setupTenantMenuItems(tenant.id, tenant.slug);
    }
  }
}

async function setupTenantTables(tenantId, slug) {
  const tables = [
    { name: 'Table 1', capacity: 2, table_type: 'standard', x_position: 2.0, y_position: 2.0 },
    { name: 'Table 2', capacity: 4, table_type: 'standard', x_position: 4.0, y_position: 2.0 },
    { name: 'Table 3', capacity: 4, table_type: 'standard', x_position: 6.0, y_position: 2.0 },
    { name: 'Table 4', capacity: 6, table_type: 'large', x_position: 2.0, y_position: 4.0 },
    { name: 'Table 5', capacity: 6, table_type: 'large', x_position: 4.0, y_position: 4.0 },
    { name: 'Booth 1', capacity: 4, table_type: 'booth', x_position: 1.0, y_position: 6.0 },
    { name: 'Booth 2', capacity: 4, table_type: 'booth', x_position: 3.0, y_position: 6.0 }
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from('restaurant_tables')
      .upsert({
        tenant_id: tenantId,
        ...table,
        active: true
      }, { onConflict: 'tenant_id,name' });

    if (error) {
      console.error(`  ❌ Table setup failed for ${table.name}:`, error);
    }
  }
  
  console.log(`  ✅ Setup ${tables.length} tables for ${slug}`);
}

async function setupTenantMenuItems(tenantId, slug) {
  let menuItems = [];

  if (slug === 'kpizza') {
    menuItems = [
      { name: 'Margherita Pizza', description: 'Classic pizza with tomato, mozzarella, and basil', price: 18.99, category: 'Pizza' },
      { name: 'Pepperoni Pizza', description: 'Traditional pepperoni with mozzarella cheese', price: 21.99, category: 'Pizza' },
      { name: 'Supreme Pizza', description: 'Loaded with pepperoni, sausage, peppers, and onions', price: 25.99, category: 'Pizza' },
      { name: 'Caesar Salad', description: 'Fresh romaine lettuce with caesar dressing', price: 12.99, category: 'Salads' },
      { name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 8.99, category: 'Appetizers' },
      { name: 'Wings', description: 'Buffalo chicken wings with celery and blue cheese', price: 14.99, category: 'Appetizers' }
    ];
  } else if (slug === 'demo') {
    menuItems = [
      { name: 'House Burger', description: 'Juicy beef patty with lettuce, tomato, and our special sauce', price: 16.99, category: 'Burgers' },
      { name: 'Grilled Chicken Sandwich', description: 'Marinated chicken breast with avocado', price: 14.99, category: 'Sandwiches' },
      { name: 'Fish & Chips', description: 'Beer battered cod with crispy fries', price: 19.99, category: 'Seafood' },
      { name: 'Garden Salad', description: 'Mixed greens with seasonal vegetables', price: 10.99, category: 'Salads' }
    ];
  } else if (slug === 'gourmet-corner') {
    menuItems = [
      { name: 'Pan-Seared Salmon', description: 'Atlantic salmon with lemon herb butter', price: 28.99, category: 'Seafood' },
      { name: 'Beef Tenderloin', description: 'Prime cut with red wine reduction', price: 34.99, category: 'Steaks' },
      { name: 'Truffle Risotto', description: 'Creamy arborio rice with black truffles', price: 24.99, category: 'Pasta' },
      { name: 'Duck Confit', description: 'Slow-cooked duck leg with cherry gastrique', price: 26.99, category: 'Poultry' }
    ];
  }

  for (const item of menuItems) {
    const { error } = await supabase
      .from('menu_items')
      .upsert({
        tenant_id: tenantId,
        ...item,
        active: true
      }, { onConflict: 'tenant_id,name' });

    if (error) {
      console.error(`  ❌ Menu item setup failed for ${item.name}:`, error);
    }
  }
  
  console.log(`  ✅ Setup ${menuItems.length} menu items for ${slug}`);
}

async function testTenantLookup() {
  console.log('\n🧪 Testing tenant lookups...');

  const testSlugs = ['demo', 'kpizza', 'gourmet-corner'];

  for (const slug of testSlugs) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error(`❌ Lookup failed for ${slug}:`, error.message);
    } else {
      console.log(`✅ Found tenant: ${data.name} (${data.slug})`);
    }
  }
}

async function main() {
  console.log('🚀 Blunari SAAS Database Setup');
  console.log('===============================');
  
  try {
    await setupDemoTenants();
    await testTenantLookup();
    
    console.log('\n🎉 Database setup complete!');
    console.log('\nAvailable tenants:');
    console.log('  - http://localhost:8080/demo (Demo Restaurant)');
    console.log('  - http://localhost:8080/kpizza (K Pizza Restaurant)');
    console.log('  - http://localhost:8080/gourmet-corner (The Gourmet Corner)');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupDemoTenants, testTenantLookup };
