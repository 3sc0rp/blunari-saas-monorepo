import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSlugValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateSlug = async (slug: string): Promise<boolean> => {
    if (!slug || slug.length < 3) {
      return false;
    }

    setIsValidating(true);
    try {
      // CRITICAL FIX: Check BOTH auto_provisioning AND tenants tables
      const [autoprovCheck, tenantCheck] = await Promise.all([
        supabase
          .from("auto_provisioning")
          .select("restaurant_slug")
          .eq("restaurant_slug", slug)
          .limit(1),
        supabase
          .from("tenants")
          .select("slug")
          .eq("slug", slug)
          .limit(1),
      ]);

      if (autoprovCheck.error) {
        console.error("Error checking auto_provisioning:", autoprovCheck.error);
      }

      if (tenantCheck.error) {
        console.error("Error checking tenants:", tenantCheck.error);
      }

      // Slug is available only if it doesn't exist in EITHER table
      const isAvailable =
        (!autoprovCheck.data || autoprovCheck.data.length === 0) &&
        (!tenantCheck.data || tenantCheck.data.length === 0);

      if (!isAvailable) {
        toast({
          title: "Slug Unavailable",
          description: `The slug "${slug}" is already taken. Please choose a different name.`,
          variant: "destructive",
        });
      }

      return isAvailable;
    } catch (error) {
      console.error("Error validating slug:", error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    let slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .trim();

    // Ensure minimum length
    if (slug.length < 3) {
      slug = slug + "-restaurant";
    }

    // Check if this slug is available
    const isAvailable = await validateSlug(slug);
    if (isAvailable) {
      return slug;
    }

    // If not available, try with a suffix
    let counter = 2;
    let newSlug = `${slug}-${counter}`;

    while (!(await validateSlug(newSlug)) && counter < 100) {
      counter++;
      newSlug = `${slug}-${counter}`;
    }

    return newSlug;
  };

  return {
    validateSlug,
    generateUniqueSlug,
    isValidating,
  };
};
