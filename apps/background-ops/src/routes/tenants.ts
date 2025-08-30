import { Router } from 'express';
import { logger } from '../utils/logger';
import { pool } from '../database';

const router = Router();

interface ProvisionTenantRequest {
  // Basic Information
  restaurantName: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  cuisineTypeId?: string;

  // Owner Account
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;

  // Business Configuration
  timezone: string;
  businessHours: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }>;
  partySizeConfig: {
    minPartySize: number;
    maxPartySize: number;
    defaultPartySize: number;
    allowLargeParties: boolean;
    largePartyThreshold: number;
  };

  // Billing Setup
  selectedPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  
  // Feature Configuration
  enabledFeatures: {
    deposits: boolean;
    posIntegration: boolean;
    etaNotifications: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    multiLocation: boolean;
  };
}

// Provision new tenant
router.post('/provision', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const data: ProvisionTenantRequest = req.body;
    logger.info('Starting tenant provisioning', { restaurantName: data.restaurantName });

    // Start transaction
    await client.query('BEGIN');

    // 1. Create tenant record
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        name, slug, timezone, currency, status, description, phone, email, website, address, cuisine_type_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING id
    `, [
      data.restaurantName,
      data.slug,
      data.timezone,
      'USD',
      'active',
      data.description || null,
      data.phone || null,
      data.email || null,
      data.website || null,
      data.address ? JSON.stringify(data.address) : null,
      data.cuisineTypeId || null
    ]);

    const tenantId = tenantResult.rows[0].id;
    logger.info('Tenant created', { tenantId });

    // 2. Create default features
    const defaultFeatures = [
      { feature_key: 'basic_booking', enabled: true, source: 'plan' },
      { feature_key: 'email_notifications', enabled: true, source: 'plan' },
      { feature_key: 'basic_analytics', enabled: true, source: 'plan' },
      { feature_key: 'widget_integration', enabled: true, source: 'plan' }
    ];

    for (const feature of defaultFeatures) {
      await client.query(`
        INSERT INTO tenant_features (tenant_id, feature_key, enabled, source)
        VALUES ($1, $2, $3, $4)
      `, [tenantId, feature.feature_key, feature.enabled, feature.source]);
    }

    // 3. Enable additional features based on selection
    const featuresToEnable = Object.entries(data.enabledFeatures)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => ({
        feature_key: feature,
        enabled: true,
        source: 'provisioning'
      }));

    for (const feature of featuresToEnable) {
      await client.query(`
        INSERT INTO tenant_features (tenant_id, feature_key, enabled, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, feature_key) 
        DO UPDATE SET enabled = $3, source = $4
      `, [tenantId, feature.feature_key, feature.enabled, feature.source]);
    }

    // 4. Create default restaurant tables
    const defaultTables = [
      { name: 'Table 1', capacity: 2, table_type: 'standard' },
      { name: 'Table 2', capacity: 2, table_type: 'standard' },
      { name: 'Table 3', capacity: 4, table_type: 'standard' },
      { name: 'Table 4', capacity: 4, table_type: 'standard' },
      { name: 'Table 5', capacity: 6, table_type: 'standard' },
      { name: 'Table 6', capacity: 6, table_type: 'standard' },
      { name: 'Table 7', capacity: 8, table_type: 'large' },
      { name: 'Table 8', capacity: 8, table_type: 'large' }
    ];

    for (const table of defaultTables) {
      await client.query(`
        INSERT INTO restaurant_tables (tenant_id, name, capacity, table_type, active)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, table.name, table.capacity, table.table_type, true]);
    }

    // 5. Create business hours
    const defaultBusinessHours = [
      { day: 0, isOpen: false, openTime: null, closeTime: null }, // Sunday
      { day: 1, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Monday
      { day: 2, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Tuesday
      { day: 3, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Wednesday
      { day: 4, isOpen: true, openTime: '09:00', closeTime: '22:00' }, // Thursday
      { day: 5, isOpen: true, openTime: '09:00', closeTime: '23:00' }, // Friday
      { day: 6, isOpen: true, openTime: '09:00', closeTime: '23:00' }  // Saturday
    ];

    // Override with provided business hours
    const businessHours = defaultBusinessHours.map(defaultHour => {
      const providedHour = data.businessHours.find(h => h.dayOfWeek === defaultHour.day);
      return providedHour ? {
        dayOfWeek: providedHour.dayOfWeek,
        isOpen: providedHour.isOpen,
        openTime: providedHour.openTime,
        closeTime: providedHour.closeTime
      } : {
        dayOfWeek: defaultHour.day,
        isOpen: defaultHour.isOpen,
        openTime: defaultHour.openTime,
        closeTime: defaultHour.closeTime
      };
    });

    for (const hour of businessHours) {
      await client.query(`
        INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        tenantId, 
        hour.dayOfWeek,
        hour.isOpen,
        hour.openTime,
        hour.closeTime
      ]);
    }

    // 6. Create party size configuration
    await client.query(`
      INSERT INTO party_size_configs (
        tenant_id, min_party_size, max_party_size, default_party_size, 
        allow_large_parties, large_party_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      tenantId,
      data.partySizeConfig.minPartySize,
      data.partySizeConfig.maxPartySize,
      data.partySizeConfig.defaultPartySize,
      data.partySizeConfig.allowLargeParties,
      data.partySizeConfig.largePartyThreshold
    ]);

    // 7. Create subscription record (if plan selected)
    if (data.selectedPlanId) {
      const periodEnd = new Date();
      if (data.billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await client.query(`
        INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, data.selectedPlanId, 'active', new Date(), periodEnd]);
    }

    // Commit transaction
    await client.query('COMMIT');

    logger.info('Tenant provisioning completed', { 
      tenantId, 
      restaurantName: data.restaurantName 
    });

    res.json({
      success: true,
      tenantId,
      message: `${data.restaurantName} has been successfully provisioned!`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error provisioning tenant', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  } finally {
    client.release();
  }
});

// Get all tenants
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT t.*, 
             COUNT(b.id) as total_bookings,
             COALESCE(SUM(b.total_amount), 0) as revenue
      FROM tenants t
      LEFT JOIN bookings b ON t.id = b.tenant_id
    `;
    
    const params: any[] = [];
    if (status) {
      query += ` WHERE t.status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      tenants: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching tenants', { error: errorMessage });
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT t.*, 
             COUNT(b.id) as total_bookings,
             COALESCE(SUM(b.total_amount), 0) as revenue,
             COUNT(rt.id) as active_tables
      FROM tenants t
      LEFT JOIN bookings b ON t.id = b.tenant_id
      LEFT JOIN restaurant_tables rt ON t.id = rt.tenant_id AND rt.active = true
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching tenant', { error: errorMessage });
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

export const tenantsRoutes = router;
