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
      // Check if slug already exists in auto_provisioning table
      const { data, error } = await supabase
        .from("auto_provisioning")
        .select("restaurant_slug")
        .eq("restaurant_slug", slug)
        .limit(1);

      if (error) {
        console.error("Error validating slug:", error);
        return false;
      }

      const isAvailable = !data || data.length === 0;

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
