#!/usr/bin/env node

/**
 * Script to seed the services table with initial data for health monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedServicesData() {
  console.log('🌱 Seeding services data...');
  
  try {
    // Check if services table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'services');

    if (tablesError) {
      console.error('Error checking for services table:', tablesError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('❌ Services table does not exist. Please run migrations first.');
      return;
    }

    // Insert sample services data
    const services = [
      {
        service_name: 'Admin Dashboard',
        service_type: 'web',
        service_url: 'https://admin.blunari.com',
        description: 'Administrative interface for tenant management',
        critical: true,
        sla_uptime_target: 99.9,
        enabled: true,
        health_check_endpoint: '/health',
        metadata: { framework: 'React', hosting: 'Vercel' }
      },
      {
        service_name: 'Client Dashboard',
        service_type: 'web',
        service_url: 'https://app.blunari.com',
        description: 'Client-facing restaurant management interface',
        critical: true,
        sla_uptime_target: 99.5,
        enabled: true,
        health_check_endpoint: '/health',
        metadata: { framework: 'React', hosting: 'Vercel' }
      },
      {
        service_name: 'Supabase Database',
        service_type: 'database',
        service_url: 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co',
        description: 'Primary PostgreSQL database',
        critical: true,
        sla_uptime_target: 99.9,
        enabled: true,
        health_check_endpoint: '/rest/v1/',
        metadata: { provider: 'Supabase', type: 'PostgreSQL' }
      },
      {
        service_name: 'Authentication Service',
        service_type: 'auth',
        service_url: 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/auth/v1',
        description: 'User authentication and authorization',
        critical: true,
        sla_uptime_target: 99.8,
        enabled: true,
        health_check_endpoint: '/health',
        metadata: { provider: 'Supabase Auth' }
      },
      {
        service_name: 'Background Operations',
        service_type: 'service',
        service_url: 'https://background-ops.fly.dev',
        description: 'Background processing and automated tasks',
        critical: false,
        sla_uptime_target: 99.0,
        enabled: true,
        health_check_endpoint: '/health',
        metadata: { hosting: 'Fly.io', type: 'Node.js' }
      },
      {
        service_name: 'File Storage',
        service_type: 'storage',
        service_url: 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/storage/v1',
        description: 'File and media storage service',
        critical: false,
        sla_uptime_target: 99.5,
        enabled: true,
        health_check_endpoint: '/status',
        metadata: { provider: 'Supabase Storage' }
      }
    ];

    // Insert each service (upsert to avoid duplicates)
    for (const service of services) {
      const { data, error } = await supabase
        .from('services')
        .upsert(service, { 
          onConflict: 'service_name',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error(`Error inserting service ${service.service_name}:`, error);
      } else {
        console.log(`✅ Seeded service: ${service.service_name}`);
      }
    }

    console.log('🎉 Services data seeding completed!');
  } catch (error) {
    console.error('Error seeding services data:', error);
  }
}

// Run the seeding
seedServicesData().catch(console.error);
