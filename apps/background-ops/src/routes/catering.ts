import { Router } from "express";
import { logger } from "../utils/logger";
import { validateApiKey } from "../middleware/auth";
import { db } from "../database";

const router = Router();

// All catering routes require authentication
router.use(validateApiKey);

// Get catering orders
router.get("/orders", async (req, res): Promise<void> => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { status, limit = 50, offset = 0 } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: "Tenant ID required",
      });
      return;
    }

    logger.info("Fetching catering orders", {
      tenantId,
      status,
      limit,
      offset,
    });

    try {
      let ordersQuery = `
        SELECT 
          co.id,
          co.event_name,
          co.event_date,
          co.event_start_time,
          co.guest_count,
          co.contact_name,
          co.contact_email,
          co.contact_phone,
          co.venue_name,
          co.venue_address,
          co.service_type,
          co.status,
          co.total_amount,
          co.deposit_paid,
          co.created_at,
          co.updated_at,
          cp.name as package_name,
          cp.price_per_person
        FROM catering_orders co
        LEFT JOIN catering_packages cp ON co.package_id = cp.id
        WHERE co.tenant_id = $1
      `;

      const queryParams = [tenantId];

      if (status) {
        ordersQuery += " AND co.status = $2";
        queryParams.push(status as string);
      }

      ordersQuery += ` ORDER BY co.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit as string, offset as string);

      const { rows: orders } = await db.query(ordersQuery, queryParams);

      // Get total count
      let countQuery =
        "SELECT COUNT(*) FROM catering_orders WHERE tenant_id = $1";
      const countParams = [tenantId];

      if (status) {
        countQuery += " AND status = $2";
        countParams.push(status as string);
      }

      const { rows: countResult } = await db.query(countQuery, countParams);
      const total = parseInt(countResult[0].count);

      res.json({
        success: true,
        data: {
          orders,
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (dbError: any) {
      // Handle case where catering tables don't exist yet
      if (
        dbError.code === "42P01" ||
        dbError.message?.includes("does not exist")
      ) {
        logger.warn("Catering tables not found, returning empty data", {
          tenantId,
        });
        res.json({
          success: true,
          data: {
            orders: [],
            total: 0,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
          },
          message: "Catering system not yet configured for this tenant",
        });
        return;
      }
      throw dbError;
    }
  } catch (error) {
    logger.error("Error fetching catering orders:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Create catering order
router.post("/orders", async (req, res): Promise<void> => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const orderData = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: "Tenant ID required",
      });
      return;
    }

    logger.info("Creating catering order", { tenantId, orderData });

    try {
      const insertQuery = `
        INSERT INTO catering_orders (
          tenant_id,
          event_name,
          event_date,
          event_start_time,
          guest_count,
          contact_name,
          contact_email,
          contact_phone,
          venue_name,
          venue_address,
          service_type,
          status,
          special_instructions,
          total_amount,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        tenantId,
        orderData.event_name,
        orderData.event_date,
        orderData.event_start_time,
        orderData.guest_count,
        orderData.contact_name,
        orderData.contact_email,
        orderData.contact_phone,
        orderData.venue_name,
        JSON.stringify(orderData.venue_address || {}),
        orderData.service_type || "delivery",
        "inquiry",
        orderData.special_instructions || null,
        orderData.total_amount || 0,
      ];

      const { rows } = await db.query(insertQuery, values);
      const newOrder = rows[0];

      res.status(201).json({
        success: true,
        data: newOrder,
      });
    } catch (dbError: any) {
      // Handle case where catering tables don't exist yet
      if (
        dbError.code === "42P01" ||
        dbError.message?.includes("does not exist")
      ) {
        logger.warn("Catering tables not found, cannot create order", {
          tenantId,
        });
        res.status(503).json({
          success: false,
          error: "Catering system not yet configured",
          message: "Please contact support to enable catering features",
        });
        return;
      }
      throw dbError;
    }
  } catch (error) {
    logger.error("Error creating catering order:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get catering packages
router.get("/packages", async (req, res): Promise<void> => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: "Tenant ID required",
      });
      return;
    }

    logger.info("Fetching catering packages", { tenantId });

    try {
      // Try to fetch from catering_packages table
      const packagesQuery = `
        SELECT 
          id,
          name,
          description,
          price_per_person,
          min_guests,
          max_guests,
          includes_setup,
          includes_service,
          includes_cleanup,
          dietary_accommodations,
          image_url,
          popular,
          active,
          created_at,
          updated_at
        FROM catering_packages 
        WHERE tenant_id = $1 AND active = true
        ORDER BY popular DESC, name ASC
      `;

      const { rows: packages } = await db.query(packagesQuery, [tenantId]);

      res.json({
        success: true,
        data: {
          packages,
          total: packages.length,
        },
      });
    } catch (dbError: any) {
      // Handle case where catering tables don't exist yet
      if (
        dbError.code === "42P01" ||
        dbError.message?.includes("does not exist")
      ) {
        logger.warn("Catering tables not found, returning empty data", {
          tenantId,
        });
        res.json({
          success: true,
          data: {
            packages: [],
            total: 0,
          },
          message: "Catering system not yet configured for this tenant",
        });
        return;
      }
      throw dbError;
    }
  } catch (error) {
    logger.error("Error fetching catering packages:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get catering analytics
router.get("/analytics", async (req, res): Promise<void> => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: "Tenant ID required",
      });
      return;
    }

    logger.info("Fetching catering analytics", { tenantId });

    try {
      // Orders metrics
      const ordersQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'inquiry') as inquiry,
          COUNT(*) FILTER (WHERE status = 'quoted') as quoted,
          SUM(guest_count) as guest_count_total,
          AVG(guest_count) as average_guest_count
        FROM catering_orders 
        WHERE tenant_id = $1
      `;

      const { rows: orderMetrics } = await db.query(ordersQuery, [tenantId]);
      const orders = orderMetrics[0];

      // Revenue metrics
      const revenueQuery = `
        SELECT 
          SUM(total_amount) as total,
          SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed,
          SUM(CASE WHEN status IN ('inquiry', 'quoted') THEN total_amount ELSE 0 END) as pending,
          AVG(total_amount) as average_order_value,
          SUM(CASE WHEN deposit_paid THEN deposit_amount ELSE 0 END) as deposits_collected,
          SUM(CASE WHEN NOT deposit_paid AND deposit_amount > 0 THEN deposit_amount ELSE 0 END) as deposits_pending
        FROM catering_orders 
        WHERE tenant_id = $1 AND total_amount IS NOT NULL
      `;

      const { rows: revenueMetrics } = await db.query(revenueQuery, [tenantId]);
      const revenue = revenueMetrics[0];

      // Popular packages
      const packagesQuery = `
        SELECT 
          cp.name,
          COUNT(co.id) as order_count,
          SUM(co.total_amount) as total_revenue
        FROM catering_packages cp
        LEFT JOIN catering_orders co ON cp.id = co.package_id AND co.tenant_id = $1
        WHERE cp.tenant_id = $1 AND cp.active = true
        GROUP BY cp.id, cp.name
        ORDER BY order_count DESC, total_revenue DESC
        LIMIT 5
      `;

      const { rows: popularPackages } = await db.query(packagesQuery, [
        tenantId,
      ]);

      // Service type distribution
      const serviceTypeQuery = `
        SELECT 
          service_type,
          COUNT(*) as count
        FROM catering_orders 
        WHERE tenant_id = $1
        GROUP BY service_type
      `;

      const { rows: serviceTypes } = await db.query(serviceTypeQuery, [
        tenantId,
      ]);
      const serviceTypeDistribution: Record<string, number> = {};
      serviceTypes.forEach((row) => {
        serviceTypeDistribution[row.service_type] = parseInt(row.count);
      });

      // Calculate conversion rate
      const totalInquiries = parseInt(orders.inquiry) + parseInt(orders.quoted);
      const confirmedOrders = parseInt(orders.confirmed);
      const conversionRate =
        totalInquiries > 0 ? (confirmedOrders / totalInquiries) * 100 : 0;

      res.json({
        success: true,
        data: {
          orders: {
            total: parseInt(orders.total) || 0,
            confirmed: parseInt(orders.confirmed) || 0,
            completed: parseInt(orders.completed) || 0,
            cancelled: parseInt(orders.cancelled) || 0,
            inquiry: parseInt(orders.inquiry) || 0,
            quoted: parseInt(orders.quoted) || 0,
            conversion_rate: Math.round(conversionRate * 100) / 100,
            guest_count_total: parseInt(orders.guest_count_total) || 0,
            average_guest_count:
              Math.round((parseFloat(orders.average_guest_count) || 0) * 100) /
              100,
          },
          revenue: {
            total: parseInt(revenue.total) || 0,
            confirmed: parseInt(revenue.confirmed) || 0,
            completed: parseInt(revenue.completed) || 0,
            pending: parseInt(revenue.pending) || 0,
            average_order_value:
              Math.round((parseFloat(revenue.average_order_value) || 0) * 100) /
              100,
            deposits_collected: parseInt(revenue.deposits_collected) || 0,
            deposits_pending: parseInt(revenue.deposits_pending) || 0,
            revenue_by_service_type: serviceTypeDistribution,
          },
          performance: {
            popular_packages: popularPackages.map((pkg) => ({
              name: pkg.name,
              order_count: parseInt(pkg.order_count) || 0,
              total_revenue: parseInt(pkg.total_revenue) || 0,
            })),
            busiest_days: [], // Could be calculated with more complex query
            service_type_distribution: serviceTypeDistribution,
            monthly_trend: [], // Could be calculated with date range queries
            customer_satisfaction: 0, // Would need catering_feedback table
            repeat_customer_rate: 0, // Would need to track customer history
          },
        },
      });
    } catch (dbError: any) {
      // Handle case where catering tables don't exist yet
      if (
        dbError.code === "42P01" ||
        dbError.message?.includes("does not exist")
      ) {
        logger.warn("Catering tables not found, returning empty analytics", {
          tenantId,
        });
        res.json({
          success: true,
          data: {
            orders: {
              total: 0,
              confirmed: 0,
              completed: 0,
              cancelled: 0,
              inquiry: 0,
              quoted: 0,
              conversion_rate: 0,
              guest_count_total: 0,
              average_guest_count: 0,
            },
            revenue: {
              total: 0,
              confirmed: 0,
              completed: 0,
              pending: 0,
              average_order_value: 0,
              deposits_collected: 0,
              deposits_pending: 0,
              revenue_by_service_type: {},
            },
            performance: {
              popular_packages: [],
              busiest_days: [],
              service_type_distribution: {},
              monthly_trend: [],
              customer_satisfaction: 0,
              repeat_customer_rate: 0,
            },
          },
          message: "Catering system not yet configured for this tenant",
        });
        return;
      }
      throw dbError;
    }
  } catch (error) {
    logger.error("Error fetching catering analytics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export { router as cateringRoutes };
