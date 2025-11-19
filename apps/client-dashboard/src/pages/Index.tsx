import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { RestaurantCard } from "@/components/RestaurantCard";
import type { GuideRestaurant } from "@/types/dining-guide";
import {
  BLUNARI_LISTS,
  mapTenantsToGuideRestaurants,
  sortGuideRestaurantsByFeatured,
} from "@/data/atlanta-guide";

type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const [searchQuery, setSearchQuery] = useState("");
  const [trending, setTrending] = useState<GuideRestaurant[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      setLoadingTrending(true);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("is_published", true)
          .in("location_city", ["Atlanta", "Decatur"])
          .order("is_featured", { ascending: false })
          .order("average_rating", { ascending: false });

        if (error) throw error;
        const tenants = (data ?? []) as TenantBase[];
        const enhanced = sortGuideRestaurantsByFeatured(
          mapTenantsToGuideRestaurants(tenants),
        );
        setTrending(enhanced.slice(0, 12));
      } catch (err) {
        console.error("[Home] Error fetching trending restaurants", err);
      } finally {
        setLoadingTrending(false);
      }
    };

    void loadTrending();
  }, []);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      navigate("/restaurants");
      return;
    }
    const params = new URLSearchParams();
    params.set("q", query);
    navigate(`/restaurants?${params.toString()}`);
  };

  const handleCategoryClick = (category: {
    label: string;
    cuisine?: string;
    tagParam?: string;
  }) => {
    const params = new URLSearchParams();
    if (category.cuisine) params.set("cuisine", category.cuisine);
    if (category.tagParam) params.set("tag", category.tagParam);
    if (!category.cuisine && !category.tagParam)
      params.set("q", category.label);

    const suffix = params.toString();
    navigate(suffix ? `/restaurants?${suffix}` : "/restaurants");
  };

  const heroCategories = [
    { label: "Brunch", tagParam: "Brunch" },
    { label: "Sushi", cuisine: "Sushi" },
    { label: "Steak", cuisine: "Steakhouse" },
    { label: "Cocktails", tagParam: "Cocktail bar" },
    { label: "Vegan", tagParam: "Vegan-friendly" },
  ];

  const exploreCategories = [
    { label: "Brunch", tagParam: "Brunch" },
    { label: "Sushi", cuisine: "Sushi" },
    { label: "Steak", cuisine: "Steakhouse" },
    { label: "Coffee", labelOnly: true },
    { label: "Dessert", labelOnly: true },
    { label: "Late Night", tagParam: "Late night" },
    { label: "Vegan", tagParam: "Vegan-friendly" },
    { label: "Halal", tagParam: "Halal-friendly" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-slate-950 to-[#111827] text-white">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1.5 shadow shadow-amber-500/50">
              <Sparkles className="h-3 w-3 text-black" />
            </span>
            <span>Blunari</span>
            <span className="hidden text-slate-400 sm:inline">
              Atlanta Dining Guide
            </span>
          </button>

          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="Search restaurants, cuisines, neighborhoods…"
                aria-label="Search restaurants"
                className="h-11 rounded-full border border-slate-700 bg-slate-900/80 pl-11 pr-32 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/40 transition-all"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSearch}
                aria-label="Submit search"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 text-xs font-semibold text-black shadow shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="hidden items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30 sm:inline-flex">
              <MapPin className="h-3 w-3" />
              Atlanta
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/favorites")}
              className="rounded-full px-4 text-xs font-medium text-slate-200 hover:text-rose-300 hover:bg-rose-500/10"
            >
              <Heart className="mr-1.5 h-3.5 w-3.5" />
              Saved
              {favorites.length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-[16px] rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {favorites.length}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/catering")}
              className="rounded-full border-slate-700 bg-transparent px-4 text-xs font-medium text-slate-200 hover:border-amber-500 hover:text-amber-300"
            >
              Catering <span className="ml-1 text-[10px] text-slate-400">(Coming soon)</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <section className="flex flex-col gap-10 md:flex-row md:items-center">
          <div className="flex-1 space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Discover Atlanta’s{" "}
              <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
                best places to eat.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-xl text-sm text-slate-300 sm:text-base"
            >
              Curated by Blunari. Built for locals and food lovers. Real
              restaurants, real photos, and no fake scores—just the places
              worth your time.
            </motion.p>

            {/* Mobile search */}
            <div className="mt-2 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="Search restaurants, cuisines, neighborhoods…"
                  aria-label="Search restaurants"
                  className="h-12 rounded-full border border-slate-700 bg-slate-900/80 pl-11 pr-28 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/40 transition-all"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSearch}
                  aria-label="Submit search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 text-xs font-semibold text-black shadow shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  onClick={() => navigate("/restaurants")}
                  className="h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-8 text-sm font-semibold text-black shadow-lg shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700 hover:shadow-xl hover:shadow-amber-500/50 transition-all"
                >
                  Explore all restaurants
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/lists/top-20-atlanta-restaurants-2025")}
                  className="h-12 rounded-full border-2 border-slate-700 bg-transparent px-8 text-sm font-semibold text-slate-100 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300 transition-all"
                >
                  View Blunari Picks
                </Button>
              </motion.div>
            </div>

            {/* Quick hero chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {heroCategories.map((category, idx) => (
                <motion.button
                  key={category.label}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategoryClick(category)}
                  className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-100 shadow-sm hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {category.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Simple decorative card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex-1"
          >
            <Card className="border-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-slate-900/80 p-5 shadow-xl shadow-black/40">
              <CardContent className="space-y-4 p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-300/80">
                      This week in Atlanta
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      See where locals are booking tables right now.
                    </p>
                  </div>
                  <Badge className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    New openings
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Top Lists carousel */}
        <section className="mt-14 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              Top Lists
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lists")}
              className="h-8 text-xs font-medium text-slate-300 hover:text-amber-300"
            >
              View all lists
            </Button>
          </div>
          <div className="-mx-2 flex gap-4 overflow-x-auto pb-2 pl-2 pr-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/80">
            {BLUNARI_LISTS.map((list) => (
              <motion.button
                key={list.slug}
                type="button"
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/lists/${list.slug}`)}
                className="group flex min-w-[260px] max-w-xs flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 text-left shadow-md hover:border-amber-500/70"
              >
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={list.coverImageUrl}
                    alt={list.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>
                <div className="space-y-2 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Curated list
                  </p>
                  <p className="line-clamp-1 text-sm font-semibold text-white">
                    {list.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-400">
                    {list.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Trending now */}
        <section className="mt-14 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              Trending now in Atlanta
            </h2>
          </div>
          {loadingTrending ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="mb-3 h-40 rounded-xl bg-slate-800/80" />
                  <div className="mb-2 h-4 w-2/3 rounded bg-slate-800/80" />
                  <div className="mb-1 h-3 w-full rounded bg-slate-800/60" />
                  <div className="h-3 w-3/4 rounded bg-slate-800/60" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((restaurant, index) => (
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
        </section>

        {/* Explore by category */}
        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Explore by category
          </h2>
          <div className="flex flex-wrap gap-3">
            {exploreCategories.map((category, idx) => (
              <motion.button
                key={category.label}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  handleCategoryClick({
                    label: category.label,
                    cuisine: category.cuisine,
                    tagParam: category.tagParam,
                  })
                }
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {category.label}
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
