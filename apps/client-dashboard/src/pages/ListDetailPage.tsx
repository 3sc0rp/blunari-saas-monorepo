import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useFavorites } from "@/contexts/FavoritesContext";
import type { GuideRestaurant } from "@/types/dining-guide";
import {
  BLUNARI_LISTS,
  mapTenantsToGuideRestaurants,
} from "@/data/atlanta-guide";

type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

const ListDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const list = useMemo(
    () => BLUNARI_LISTS.find((item) => item.slug === slug),
    [slug],
  );

  const [restaurants, setRestaurants] = useState<GuideRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!list) {
      return;
    }

    const loadRestaurants = async () => {
      setLoading(true);
      try {
        const slugs = list.restaurants.map((r) => r.slug);
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .in("slug", slugs)
          .eq("is_published", true);

        if (error) throw error;
        const tenants = (data ?? []) as TenantBase[];
        const enhanced = mapTenantsToGuideRestaurants(tenants);

        // Preserve list order
        const bySlug = new Map(enhanced.map((r) => [r.slug, r]));
        const ordered = slugs
          .map((tenantSlug) => bySlug.get(tenantSlug))
          .filter(Boolean) as GuideRestaurant[];

        setRestaurants(ordered);
      } catch (err) {
        console.error("[ListDetail] Failed to load restaurants", err);
      } finally {
        setLoading(false);
      }
    };

    void loadRestaurants();
  }, [list]);

  if (!list) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 text-slate-300 hover:text-white"
            onClick={() => navigate("/lists")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to lists
          </Button>
          <Card className="border-slate-800 bg-slate-950/80">
            <CardContent className="p-6 text-center text-slate-300">
              This list could not be found.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:text-white"
            onClick={() => navigate("/lists")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All lists
          </Button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] md:items-center">
          <div className="space-y-4">
            <Badge className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
              <Sparkles className="h-3 w-3" />
              Blunari List · Atlanta
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {list.title}
            </h1>
            <p className="max-w-xl text-sm text-slate-300">
              {list.description}
            </p>
            <p className="text-xs text-slate-500">
              {list.restaurants.length} restaurants · Curated by Blunari
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg">
            <div className="relative h-44 w-full overflow-hidden">
              <img
                src={list.coverImageUrl}
                alt={list.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-medium text-slate-200">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Curated list
                </span>
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-slate-300">
                  Perfect for planning your next night out.
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Restaurants in this list
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: list.restaurants.length || 3 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
                  >
                    <div className="mb-3 h-40 rounded-xl bg-slate-800/80" />
                    <div className="mb-2 h-4 w-2/3 rounded bg-slate-800/80" />
                    <div className="mb-1 h-3 w-full rounded bg-slate-800/60" />
                    <div className="h-3 w-3/4 rounded bg-slate-800/60" />
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {restaurants.map((restaurant, index) => {
                const commentary = list.restaurants.find(
                  (entry) => entry.slug === restaurant.slug,
                );

                return (
                  <div
                    key={restaurant.id}
                    className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]"
                  >
                    <RestaurantCard
                      restaurant={restaurant}
                      index={index}
                      isFavorite={isFavorite(restaurant.slug)}
                      onToggleFavorite={() => toggleFavorite(restaurant.slug)}
                    />
                    <div className="flex flex-col justify-between gap-3 px-1 py-2 text-sm text-slate-300">
                      <div className="space-y-2">
                        <p className="font-semibold text-white">
                          Why we love it
                        </p>
                        <p className="text-sm text-slate-300">
                          {commentary?.commentary ??
                            "A standout in its category and a reliable go-to for locals."}
                        </p>
                        {commentary?.highlightTags &&
                          commentary.highlightTags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                              {commentary.highlightTags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-slate-700 bg-slate-900/60 text-slate-200"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/restaurants/${restaurant.slug}`)
                          }
                          className="inline-flex items-center gap-1 px-0 text-xs font-medium text-amber-300 hover:text-amber-200"
                        >
                          View full profile
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ListDetailPage;


