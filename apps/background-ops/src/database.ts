import { Pool } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool };

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export async function setupDatabase() {
  try {
    // Test connection
    await db.query('SELECT NOW()');
    logger.info('✅ Database connected successfully');
    
    // Create tables if they don't exist
    await createTables();
    
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function createTables() {
  const tables = [
    // System metrics table
    `CREATE TABLE IF NOT EXISTS system_metrics (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      value NUMERIC NOT NULL,
      unit VARCHAR(50) NOT NULL,
      tags JSONB DEFAULT '{}',
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Background jobs table
    `CREATE TABLE IF NOT EXISTS background_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      priority INTEGER DEFAULT 5,
      data JSONB DEFAULT '{}',
      result JSONB,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      failed_at TIMESTAMP WITH TIME ZONE,
      scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Services table
    `CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      status VARCHAR(50) DEFAULT 'online',
      health_check_url TEXT,
      last_health_check TIMESTAMP WITH TIME ZONE,
      response_time INTEGER,
      uptime_percentage NUMERIC(5,2) DEFAULT 100,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Service health checks table
    `CREATE TABLE IF NOT EXISTS service_health_checks (
      id SERIAL PRIMARY KEY,
      service_id UUID REFERENCES services(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL,
      response_time INTEGER NOT NULL,
      details JSONB DEFAULT '{}',
      checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Activity feed table
    `CREATE TABLE IF NOT EXISTS activity_feed (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(255) NOT NULL,
      service VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(50) NOT NULL,
      details JSONB DEFAULT '{}',
      user_id VARCHAR(255),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Webhook logs table
    `CREATE TABLE IF NOT EXISTS webhook_logs (
      id SERIAL PRIMARY KEY,
      source VARCHAR(255) NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      data JSONB NOT NULL,
      signature TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Tenants table - CRITICAL for tenant provisioning
    `CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      timezone VARCHAR(50) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'active',
      description TEXT,
      phone VARCHAR(20),
      email VARCHAR(320),
      website VARCHAR(500),
      address JSONB,
      cuisine_type_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Tenant features table
    `CREATE TABLE IF NOT EXISTS tenant_features (
      id SERIAL PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      feature_key VARCHAR(100) NOT NULL,
      enabled BOOLEAN DEFAULT true,
      source VARCHAR(50) DEFAULT 'plan',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, feature_key)
    )`,
    
    // Restaurant tables
    `CREATE TABLE IF NOT EXISTS restaurant_tables (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      capacity INTEGER NOT NULL,
      table_type VARCHAR(50) DEFAULT 'standard',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Business hours table
    `CREATE TABLE IF NOT EXISTS business_hours (
      id SERIAL PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      is_open BOOLEAN DEFAULT false,
      open_time TIME,
      close_time TIME,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, day_of_week)
    )`,
    
    // Party size configurations
    `CREATE TABLE IF NOT EXISTS party_size_configs (
      id SERIAL PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
      min_party_size INTEGER DEFAULT 1,
      max_party_size INTEGER DEFAULT 10,
      default_party_size INTEGER DEFAULT 2,
      allow_large_parties BOOLEAN DEFAULT false,
      large_party_threshold INTEGER DEFAULT 8,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Subscriptions table
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      plan_id VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      current_period_end TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Bookings table (for tenant metrics)
    `CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      total_amount NUMERIC(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'confirmed',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  ];

  for (const table of tables) {
    try {
      await db.query(table);
    } catch (error) {
      logger.error('Error creating table:', error);
      throw error;
    }
  }
  
  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(name)',
    'CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at)',
    'CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status)',
    'CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_for ON background_jobs(scheduled_for)',
    'CREATE INDEX IF NOT EXISTS idx_service_health_checks_service_id ON service_health_checks(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_activity_feed_service ON activity_feed(service)',
    'CREATE INDEX IF NOT EXISTS idx_activity_feed_timestamp ON activity_feed(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source)',
    
    // Tenant-related indexes
    'CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)',
    'CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status)',
    'CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant_id ON tenant_features(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_id ON restaurant_tables(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_business_hours_tenant_id ON business_hours(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id)'
  ];

  for (const index of indexes) {
    try {
      await db.query(index);
    } catch (error) {
      logger.warn('Index creation warning:', error);
    }
  }

  // Add missing columns if they don't exist
  const migrations = [
    // Fix background_jobs table - ensure all expected columns exist
    'ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE',
    'ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS type VARCHAR(255)',
    'ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS job_name VARCHAR(255)',
    'ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(255)',
    
    // Fix system_metrics table (missing columns for indexes)
    'ALTER TABLE system_metrics ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT \'unknown\'',
    'ALTER TABLE system_metrics ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    
    // Fix activity_feed table
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS type VARCHAR(255) NOT NULL DEFAULT \'info\'',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS service VARCHAR(255) NOT NULL DEFAULT \'background-ops\'',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT \'info\'',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS details JSONB DEFAULT \'{}\'',
    'ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)',
    
    // Fix webhook_logs table 
    'ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS source VARCHAR(255) NOT NULL DEFAULT \'unknown\'',
    'ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    'ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(255) NOT NULL DEFAULT \'unknown\'',
    'ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT \'{}\'',
    'ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS signature TEXT'
  ];

  for (const migration of migrations) {
    try {
      await db.query(migration);
      logger.info('✅ Database migration executed:', migration);
    } catch (error) {
      logger.warn('Migration warning:', error);
    }
  }

  logger.info('✅ Database tables and indexes created/verified');
}

export async function databaseHealth(): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}