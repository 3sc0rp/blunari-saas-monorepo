import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook for prefetching restaurant profile page on hover
 * Improves perceived performance by loading the page before user clicks
 * 
 * Usage:
 * const { handleMouseEnter, handleClick } = useRestaurantPrefetch(restaurant.slug);
 * <Card onMouseEnter={handleMouseEnter} onClick={handleClick}>
 */
export const useRestaurantPrefetch = (slug: string) => {
  const navigate = useNavigate();
  const prefetchedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Only prefetch once per component lifetime
    if (prefetchedRef.current) return;

    // Debounce: only prefetch if user hovers for 200ms
    // Avoids unnecessary prefetching when quickly scrolling
    timerRef.current = setTimeout(() => {
      try {
        // Prefetch the route component
        import("../pages/RestaurantProfilePage").catch(() => {
          // Silent fail - route will load normally on click
        });

        // Optionally prefetch restaurant data here
        // Could call supabase to warm cache

        prefetchedRef.current = true;
      } catch (error) {
        // Non-critical error
        console.debug("Prefetch failed:", error);
      }
    }, 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Cancel prefetch if user moves away quickly
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleClick = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      navigate(`/restaurants/${slug}`);
    },
    [navigate, slug]
  );

  return {
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
  };
};

/**
 * Hook for prefetching data without navigation
 * Useful for warming React Query cache
 */
export const usePrefetchData = <T,>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  enabled: boolean = true
) => {
  const prefetchedRef = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetchedRef.current || !enabled) return;

    queryFn()
      .then(() => {
        prefetchedRef.current = true;
      })
      .catch(() => {
        // Silent fail
      });
  }, [queryFn, enabled]);

  return { prefetch };
};
