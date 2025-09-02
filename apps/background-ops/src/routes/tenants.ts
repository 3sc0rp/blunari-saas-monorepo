import { Router } from "express";
import { z } from "zod";
import { logger } from "../utils/logger";
import { pool } from "../database";
import {
  authenticateRequest,
  validateApiKey,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Apply authentication to all tenant routes
router.use(validateApiKey);

// Input validation schema
const ProvisionTenantSchema = z
  .object({
    // Basic Information - REQUIRED
    restaurantName: z
      .string()
      .min(1, "Restaurant name is required")
      .max(255, "Restaurant name too long"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(100, "Slug too long")
      .regex(
        /^[a-z0-9-]+$/,
        "Slug must contain only lowercase letters, numbers, and hyphens",
      ),
    description: z.string().max(1000, "Description too long").optional(),
    phone: z.string().max(20, "Phone number too long").optional(),
    email: z
      .string()
      .email("Invalid email format")
      .max(320, "Email too long")
      .optional(),
    website: z
      .string()
      .url("Invalid website URL")
      .max(500, "Website URL too long")
      .optional(),
    address: z
      .object({
        street: z
          .string()
          .min(1, "Street is required")
          .max(255, "Street too long"),
        city: z.string().min(1, "City is required").max(100, "City too long"),
        state: z
          .string()
          .min(1, "State is required")
          .max(100, "State too long"),
        zipCode: z
          .string()
          .min(1, "Zip code is required")
          .max(20, "Zip code too long"),
        country: z
          .string()
          .min(1, "Country is required")
          .max(100, "Country too long"),
      })
      .optional(),
    cuisineTypeId: z.string().uuid("Invalid cuisine type ID").optional(),

    // Owner Account - REQUIRED
    ownerFirstName: z
      .string()
      .min(1, "Owner first name is required")
      .max(100, "First name too long"),
    ownerLastName: z
      .string()
      .min(1, "Owner last name is required")
      .max(100, "Last name too long"),
    ownerEmail: z
      .string()
      .email("Invalid owner email format")
      .max(320, "Owner email too long"),
    ownerPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(200, "Password too long"),

    // Business Configuration - REQUIRED
    timezone: z
      .string()
      .min(1, "Timezone is required")
      .max(50, "Timezone too long"),
    businessHours: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6, "Day of week must be 0-6"),
          isOpen: z.boolean(),
          openTime: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
            .optional(),
          closeTime: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
            .optional(),
        }),
      )
      .length(7, "Must provide business hours for all 7 days"),
    partySizeConfig: z.object({
      minPartySize: z
        .number()
        .int()
        .min(1, "Min party size must be at least 1")
        .max(20, "Min party size too large"),
      maxPartySize: z
        .number()
        .int()
        .min(1, "Max party size must be at least 1")
        .max(50, "Max party size too large"),
      defaultPartySize: z
        .number()
        .int()
        .min(1, "Default party size must be at least 1")
        .max(20, "Default party size too large"),
      allowLargeParties: z.boolean(),
      largePartyThreshold: z
        .number()
        .int()
        .min(1, "Large party threshold must be at least 1")
        .max(50, "Large party threshold too large"),
    }),

    // Billing Setup - REQUIRED
    selectedPlanId: z.string().uuid("Invalid plan ID"),
    billingCycle: z.enum(["monthly", "yearly"], {
      required_error: "Billing cycle must be monthly or yearly",
    }),

    // Feature Configuration - REQUIRED
    enabledFeatures: z.object({
      deposits: z.boolean(),
      posIntegration: z.boolean(),
      etaNotifications: z.boolean(),
      customBranding: z.boolean(),
      advancedAnalytics: z.boolean(),
      multiLocation: z.boolean(),
    }),
  })
  .strict(); // Reject any additional properties

interface ProvisionTenantRequest
  extends z.infer<typeof ProvisionTenantSchema> {}

// Provision new tenant - REQUIRES FULL AUTHENTICATION
router.post(
  "/provision",
  authenticateRequest,
  async (req: AuthenticatedRequest, res) => {
    const client = await pool.connect();

    try {
      // VALIDATE INPUT DATA - CRITICAL SECURITY!
      let data: ProvisionTenantRequest;
      try {
        data = ProvisionTenantSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn("Invalid tenant provisioning data", {
            errors: error.errors,
            requestId: req.requestId,
            tenantId: req.tenantId,
          });
          res.status(400).json({
            success: false,
            error: "Invalid input data",
            details: error.errors,
          });
          return;
        }
        throw error;
      }

      // Additional business logic validation
      if (
        data.partySizeConfig.defaultPartySize <
          data.partySizeConfig.minPartySize ||
        data.partySizeConfig.defaultPartySize >
          data.partySizeConfig.maxPartySize
      ) {
        res.status(400).json({
          success: false,
          error: "Default party size must be between min and max party size",
        });
        return;
      }

      if (
        data.partySizeConfig.maxPartySize < data.partySizeConfig.minPartySize
      ) {
        res.status(400).json({
          success: false,
          error:
            "Max party size must be greater than or equal to min party size",
        });
        return;
      }

      logger.info("Starting tenant provisioning", {
        restaurantName: data.restaurantName,
        requestId: req.requestId,
        tenantId: req.tenantId,
      });

      // Start transaction
      await client.query("BEGIN");

      // 1. Create tenant record
      const tenantResult = await client.query(
        `
      INSERT INTO tenants (
        name, slug, timezone, currency, status, description, phone, email, website, address, cuisine_type_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING id
    `,
        [
          data.restaurantName,
          data.slug,
          data.timezone,
          "USD",
          "active",
          data.description || null,
          data.phone || null,
          data.email || null,
          data.website || null,
          data.address ? JSON.stringify(data.address) : null,
          data.cuisineTypeId || null,
        ],
      );

      const tenantId = tenantResult.rows[0].id;
      logger.info("Tenant created", { tenantId });

      // 2. Create default features
      const defaultFeatures = [
        { feature_key: "basic_booking", enabled: true, source: "plan" },
        { feature_key: "email_notifications", enabled: true, source: "plan" },
        { feature_key: "basic_analytics", enabled: true, source: "plan" },
        { feature_key: "widget_integration", enabled: true, source: "plan" },
      ];

      for (const feature of defaultFeatures) {
        await client.query(
          `
        INSERT INTO tenant_features (tenant_id, feature_key, enabled, source)
        VALUES ($1, $2, $3, $4)
      `,
          [tenantId, feature.feature_key, feature.enabled, feature.source],
        );
      }

      // 3. Enable additional features based on selection
      const featuresToEnable = Object.entries(data.enabledFeatures)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => ({
          feature_key: feature,
          enabled: true,
          source: "provisioning",
        }));

      for (const feature of featuresToEnable) {
        await client.query(
          `
        INSERT INTO tenant_features (tenant_id, feature_key, enabled, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, feature_key) 
        DO UPDATE SET enabled = $3, source = $4
      `,
          [tenantId, feature.feature_key, feature.enabled, feature.source],
        );
      }

      // 4. Create default restaurant tables
      const defaultTables = [
        { name: "Table 1", capacity: 2, table_type: "standard" },
        { name: "Table 2", capacity: 2, table_type: "standard" },
        { name: "Table 3", capacity: 4, table_type: "standard" },
        { name: "Table 4", capacity: 4, table_type: "standard" },
        { name: "Table 5", capacity: 6, table_type: "standard" },
        { name: "Table 6", capacity: 6, table_type: "standard" },
        { name: "Table 7", capacity: 8, table_type: "large" },
        { name: "Table 8", capacity: 8, table_type: "large" },
      ];

      for (const table of defaultTables) {
        await client.query(
          `
        INSERT INTO restaurant_tables (tenant_id, name, capacity, table_type, active)
        VALUES ($1, $2, $3, $4, $5)
      `,
          [tenantId, table.name, table.capacity, table.table_type, true],
        );
      }

      // 5. Create business hours
      const defaultBusinessHours = [
        { day: 0, isOpen: false, openTime: null, closeTime: null }, // Sunday
        { day: 1, isOpen: true, openTime: "09:00", closeTime: "22:00" }, // Monday
        { day: 2, isOpen: true, openTime: "09:00", closeTime: "22:00" }, // Tuesday
        { day: 3, isOpen: true, openTime: "09:00", closeTime: "22:00" }, // Wednesday
        { day: 4, isOpen: true, openTime: "09:00", closeTime: "22:00" }, // Thursday
        { day: 5, isOpen: true, openTime: "09:00", closeTime: "23:00" }, // Friday
        { day: 6, isOpen: true, openTime: "09:00", closeTime: "23:00" }, // Saturday
      ];

      // Override with provided business hours
      const businessHours = defaultBusinessHours.map((defaultHour) => {
        const providedHour = data.businessHours.find(
          (h) => h.dayOfWeek === defaultHour.day,
        );
        return providedHour
          ? {
              dayOfWeek: providedHour.dayOfWeek,
              isOpen: providedHour.isOpen,
              openTime: providedHour.openTime,
              closeTime: providedHour.closeTime,
            }
          : {
              dayOfWeek: defaultHour.day,
              isOpen: defaultHour.isOpen,
              openTime: defaultHour.openTime,
              closeTime: defaultHour.closeTime,
            };
      });

      for (const hour of businessHours) {
        await client.query(
          `
        INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
        VALUES ($1, $2, $3, $4, $5)
      `,
          [
            tenantId,
            hour.dayOfWeek,
            hour.isOpen,
            hour.openTime,
            hour.closeTime,
          ],
        );
      }

      // 6. Create party size configuration
      await client.query(
        `
      INSERT INTO party_size_configs (
        tenant_id, min_party_size, max_party_size, default_party_size, 
        allow_large_parties, large_party_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
        [
          tenantId,
          data.partySizeConfig.minPartySize,
          data.partySizeConfig.maxPartySize,
          data.partySizeConfig.defaultPartySize,
          data.partySizeConfig.allowLargeParties,
          data.partySizeConfig.largePartyThreshold,
        ],
      );

      // 7. Create subscription record (if plan selected)
      if (data.selectedPlanId) {
        const periodEnd = new Date();
        if (data.billingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await client.query(
          `
        INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, $3, $4, $5)
      `,
          [tenantId, data.selectedPlanId, "active", new Date(), periodEnd],
        );
      }

      // Commit transaction
      await client.query("COMMIT");

      logger.info("Tenant provisioning completed", {
        tenantId,
        restaurantName: data.restaurantName,
      });

      res.json({
        success: true,
        tenantId,
        message: `${data.restaurantName} has been successfully provisioned!`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error provisioning tenant", { error: errorMessage });
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    } finally {
      client.release();
    }
  },
);

// Get all tenants
router.get("/", async (req, res) => {
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
        total: result.rows.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching tenants", { error: errorMessage });
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

// Get tenant by ID
router.get("/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT t.*, 
             COUNT(b.id) as total_bookings,
             COALESCE(SUM(b.total_amount), 0) as revenue,
             COUNT(rt.id) as active_tables
      FROM tenants t
      LEFT JOIN bookings b ON t.id = b.tenant_id
      LEFT JOIN restaurant_tables rt ON t.id = rt.tenant_id AND rt.active = true
      WHERE t.id = $1
      GROUP BY t.id
    `,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching tenant", { error: errorMessage });
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

export const tenantsRoutes = router;
