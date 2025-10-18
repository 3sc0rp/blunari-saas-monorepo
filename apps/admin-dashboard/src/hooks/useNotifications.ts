import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  created_at: string;
  delivered_at: string | null;
  tenant_id: string;
  user_id: string | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get recent notifications from various sources
      const { data: notificationData, error: notifError } = await supabase
        .from("notification_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      let allNotifications: Notification[] = [];

      if (notificationData && !notifError) {
        const mappedNotifications = notificationData.map((notif) => ({
          id: notif.id,
          type: notif.notification_type,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          created_at: notif.created_at,
          delivered_at: notif.delivered_at,
          tenant_id: notif.tenant_id,
          user_id: notif.user_id,
        }));
        allNotifications = [...allNotifications, ...mappedNotifications];
      }

      // Get recent tenant registrations
      const { data: tenantData, error: tenantError } = await supabase
        .from("auto_provisioning")
        .select(
          `
          id,
          restaurant_name,
          status,
          created_at,
          completed_at
        `,
        )
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10);

      if (tenantData && !tenantError) {
        const tenantNotifications = tenantData.map((tenant) => ({
          id: `tenant-${tenant.id}`,
          type: "tenant_registered",
          title: "New restaurant registered",
          message: `${tenant.restaurant_name} completed onboarding`,
          data: { restaurant_name: tenant.restaurant_name },
          created_at: tenant.completed_at || tenant.created_at,
          delivered_at: null,
          tenant_id: tenant.id,
          user_id: null,
        }));
        allNotifications = [...allNotifications, ...tenantNotifications];
      }

      // Get recent employees added
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select(
          `
          id,
          employee_id,
          role,
          status,
          created_at
        `,
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (employeeData && !employeeError) {
        const employeeNotifications = employeeData.map((employee) => ({
          id: `employee-${employee.id}`,
          type: "employee_added",
          title: "New team member",
          message: `Employee ${employee.employee_id} joined as ${employee.role}`,
          data: { role: employee.role, employee_id: employee.employee_id },
          created_at: employee.created_at,
          delivered_at: null,
          tenant_id: "",
          user_id: null,
        }));
        allNotifications = [...allNotifications, ...employeeNotifications];
      }

      // Get recent system alerts
      const { data: alertData, error: alertError } = await supabase
        .from("alert_instances")
        .select(
          `
          id,
          message,
          severity,
          status,
          fired_at,
          resolved_at
        `,
        )
        .order("fired_at", { ascending: false })
        .limit(5);

      if (alertData && !alertError) {
        const alertNotifications = alertData.map((alert) => ({
          id: `alert-${alert.id}`,
          type: alert.status === "resolved" ? "system_update" : "system_alert",
          title:
            alert.status === "resolved"
              ? "System issue resolved"
              : "System alert",
          message: alert.message,
          data: { severity: alert.severity, status: alert.status },
          created_at: alert.resolved_at || alert.fired_at,
          delivered_at: null,
          tenant_id: "",
          user_id: null,
        }));
        allNotifications = [...allNotifications, ...alertNotifications];
      }

      // Sort all notifications by creation date
      allNotifications.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setNotifications(allNotifications.slice(0, 20)); // Keep only latest 20
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60)
      return `${diffInMins} minute${diffInMins > 1 ? "s" : ""} ago`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "tenant_registered":
        return "User";
      case "employee_added":
        return "UserPlus";
      case "system_alert":
        return "AlertTriangle";
      case "system_update":
        return "Activity";
      case "payment_received":
        return "CreditCard";
      default:
        return "Bell";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "tenant_registered":
        return "blue";
      case "employee_added":
        return "green";
      case "system_alert":
        return "red";
      case "system_update":
        return "orange";
      case "payment_received":
        return "green";
      default:
        return "blue";
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_queue",
        },
        () => {
          fetchNotifications(); // Refresh when new notifications arrive
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auto_provisioning",
        },
        () => {
          fetchNotifications(); // Refresh when new tenants are provisioned
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "employees",
        },
        () => {
          fetchNotifications(); // Refresh when new employees added
        },
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
    getTimeAgo,
    getNotificationIcon,
    getNotificationColor,
  };
}
