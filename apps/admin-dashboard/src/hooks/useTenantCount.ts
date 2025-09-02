import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTenantCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantCount = async () => {
      try {
        const { count: tenantCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true });

        setCount(tenantCount || 0);
      } catch (error) {
        console.error("Error fetching tenant count:", error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantCount();

    // Set up real-time subscription for tenant changes
    const channel = supabase
      .channel("tenant-count-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tenants",
        },
        () => {
          fetchTenantCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading };
};
