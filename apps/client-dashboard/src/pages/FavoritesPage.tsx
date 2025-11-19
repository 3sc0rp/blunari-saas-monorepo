import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { RestaurantCard } from "@/components/RestaurantCard";
import type { GuideRestaurant } from "@/types/dining-guide";
import { mapTenantsToGuideRestaurants } from "@/data/atlanta-guide";

type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, isFavorite, toggleFavorite, clearFavorites } = useFavorites();

  const [restaurants, setRestaurants] = useState<GuideRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      if (favorites.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .in("slug", favorites)
          .eq("is_published", true);

        if (error) throw error;
        const tenants = (data ?? []) as TenantBase[];
        const enhanced = mapTenantsToGuideRestaurants(tenants);

        // Preserve favorites order
        const bySlug = new Map(enhanced.map((r) => [r.slug, r]));
        const ordered = favorites
          .map((slug) => bySlug.get(slug))
          .filter(Boolean) as GuideRestaurant[];

        setRestaurants(ordered);
      } catch (err) {
        console.error("[Favorites] Error fetching restaurants", err);
      } finally {
        setLoading(false);
      }
    };

    void loadFavorites();
  }, [favorites]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-4 inline-flex items-center text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </button>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/40">
              <Heart className="h-3 w-3 fill-current" />
              Your saved places
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Favorites
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {favorites.length === 0
                ? "Save restaurants as you explore to build your personal dining list."
                : `You've saved ${favorites.length} restaurant${favorites.length === 1 ? "" : "s"} to revisit later.`}
            </p>
          </div>
          {favorites.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFavorites}
              className="rounded-full border-slate-700 bg-transparent px-4 text-xs font-medium text-slate-300 hover:border-rose-500 hover:text-rose-300"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: favorites.length || 3 }).map((_, index) => (
              <div
                key={index}
                className="h-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="mb-3 h-40 rounded-xl bg-slate-800/80 animate-pulse" />
                <div className="mb-2 h-4 w-2/3 rounded bg-slate-800/80 animate-pulse" />
                <div className="mb-1 h-3 w-full rounded bg-slate-800/60 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-slate-800/60 animate-pulse" />
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-slate-800 bg-slate-950/80 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center space-y-6 p-12 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-rose-500/20 blur-2xl" />
                  <Heart className="relative h-16 w-16 text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    No saved restaurants yet
                  </h3>
                  <p className="max-w-md text-sm text-slate-400">
                    As you explore Atlanta's dining scene, tap the heart icon on
                    any restaurant to save it here for easy access later.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate("/restaurants")}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-6 text-sm font-semibold text-black shadow shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start exploring
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant, index) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                index={index}
                isFavorite={isFavorite(restaurant.slug)}
                onToggleFavorite={() => toggleFavorite(restaurant.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;

