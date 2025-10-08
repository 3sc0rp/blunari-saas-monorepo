#!/usr/bin/env node

/**
 * Query Admin Users from Database
 * Shows all SUPER_ADMIN and ADMIN users
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function queryAdminUsers() {
  console.log('🔍 Querying Admin Users\n');
  console.log('='.repeat(70));

  try {
    // Query employees table for admin users
    console.log('\n📋 Querying employees table...\n');
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at,
        updated_at
      `)
      .in('role', ['SUPER_ADMIN', 'ADMIN'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error querying employees:', error.message);
      
      if (error.code === 'PGRST301') {
        console.log('\n💡 This error means Row Level Security is blocking the query.');
        console.log('   You need to be authenticated as an admin to view this data.');
        console.log('\n   Try:');
        console.log('   1. Log into admin dashboard in browser');
        console.log('   2. Run this query in Supabase SQL Editor instead');
        console.log('   3. Or use Supabase service role key (if you have it)');
      }
      
      return;
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️  No admin users found in employees table.');
      console.log('\n💡 This could mean:');
      console.log('   1. No admin users have been created yet');
      console.log('   2. RLS policies are blocking access');
      console.log('   3. The database migrations haven\'t been applied');
      return;
    }

    console.log(`✅ Found ${employees.length} admin user(s):\n`);
    console.log('='.repeat(70));

    employees.forEach((emp, index) => {
      console.log(`\n👤 Admin User #${index + 1}:`);
      console.log('   ID:', emp.id);
      console.log('   Auth User ID:', emp.user_id);
      console.log('   Email:', emp.email);
      console.log('   Name:', emp.first_name, emp.last_name || '');
      console.log('   Role:', emp.role);
      console.log('   Status:', emp.status);
      console.log('   Created:', new Date(emp.created_at).toLocaleString());
      if (emp.updated_at) {
        console.log('   Updated:', new Date(emp.updated_at).toLocaleString());
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 Summary: ${employees.length} admin user(s) found`);
    console.log('   SUPER_ADMIN:', employees.filter(e => e.role === 'SUPER_ADMIN').length);
    console.log('   ADMIN:', employees.filter(e => e.role === 'ADMIN').length);
    console.log('   ACTIVE:', employees.filter(e => e.status === 'ACTIVE').length);
    console.log('   INACTIVE:', employees.filter(e => e.status === 'INACTIVE').length);

  } catch (error) {
    console.error('\n❌ Unexpected error:');
    console.error(error);
  }
}

console.log('📋 Admin Users Query Tool');
console.log('Tables involved:');
console.log('   1. auth.users - Supabase authentication');
console.log('   2. employees - Application user profiles and roles');
console.log('   Link: employees.user_id → auth.users.id\n');

queryAdminUsers();
