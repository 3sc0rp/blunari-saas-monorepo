import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Star, ChefHat, SlidersHorizontal, X, Utensils, ArrowLeft, 
  TrendingUp, Sparkles, Clock, CheckCircle2, Filter, ArrowUpDown, Loader2, ChevronRight, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useFavorites } from "@/contexts/FavoritesContext";
import type { GuideRestaurant, Tag } from "@/types/dining-guide";
import { mapTenantsToGuideRestaurants } from "@/data/atlanta-guide";

type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

const CUISINE_TYPES = [
  "Italian", "Japanese", "American", "Mexican", "Chinese", 
  "French", "Thai", "Mediterranean", "Indian", "Steakhouse",
  "Seafood", "Korean", "Vietnamese", "Spanish", "Greek"
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher"
];

const RestaurantDiscoveryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [restaurants, setRestaurants] = useState<GuideRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Filters
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    searchParams.get("cuisine") ? [searchParams.get("cuisine")!] : []
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get("tag"),
  );
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [hasReservations, setHasReservations] = useState(false);
  const [hasCatering, setHasCatering] = useState(false);
  const [hasOutdoorSeating, setHasOutdoorSeating] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState<string>("relevance");

  // Infinite scroll pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 12;

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setSearching(false);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(0);
    setRestaurants([]);
    setHasMore(true);
    fetchRestaurants(0, true);
  }, [debouncedSearch, selectedCuisines, selectedPriceRanges, selectedDietary, onlyFeatured, hasReservations, hasCatering, hasOutdoorSeating, hasParking, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, page]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setPage(0);
    setRestaurants([]);
    setHasMore(true);
    await fetchRestaurants(0, true);
    return Promise.resolve();
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchRestaurants(nextPage, false);
  };

  const fetchRestaurants = async (pageNum: number = 0, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      let query = supabase
        .from("tenants")
        .select("*")
        .eq("is_published", true)
        .in("location_city", ["Atlanta", "Decatur"]);

      // Search query (using debounced value)
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }

      // Cuisine filter
      if (selectedCuisines.length > 0) {
        query = query.overlaps("cuisine_types", selectedCuisines);
      }

      // Price range filter
      if (selectedPriceRanges.length > 0) {
        query = query.in("price_range", selectedPriceRanges);
      }

      // Dietary options filter
      if (selectedDietary.length > 0) {
        query = query.overlaps("dietary_options", selectedDietary);
      }

      // Feature filters
      if (onlyFeatured) {
        query = query.eq("is_featured", true);
      }
      if (hasReservations) {
        query = query.eq("accepts_reservations", true);
      }
      if (hasCatering) {
        query = query.eq("accepts_catering", true);
      }
      if (hasOutdoorSeating) {
        query = query.eq("outdoor_seating", true);
      }
      if (hasParking) {
        query = query.eq("parking_available", true);
      }

      // Sorting
      switch (sortBy) {
        case "rating":
          query = query.order("average_rating", { ascending: false, nullsFirst: false });
          break;
        case "reviews":
          query = query.order("total_reviews", { ascending: false, nullsFirst: false });
          break;
        case "name":
          query = query.order("name", { ascending: true });
          break;
        default: // relevance
          query = query.order("is_featured", { ascending: false })
                       .order("average_rating", { ascending: false, nullsFirst: false });
      }

      // Pagination
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      const tenants = (data ?? []) as TenantBase[];
      let newRestaurants = mapTenantsToGuideRestaurants(tenants);

      // Client-side tag filter (derived from guide tags)
      if (selectedTag) {
        const tag = selectedTag as Tag;
        newRestaurants = newRestaurants.filter((restaurant) =>
          restaurant.tags.includes(tag),
        );
      }
      
      // Check if we got fewer items than requested (end of results)
      if (newRestaurants.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (reset) {
        setRestaurants(newRestaurants);
      } else {
        setRestaurants(prev => [...prev, ...newRestaurants]);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCuisines.length > 0) params.set("cuisine", selectedCuisines[0]);
    setSearchParams(params);
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  const togglePriceRange = (price: string) => {
    setSelectedPriceRanges(prev =>
      prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]
    );
  };

  const toggleDietary = (dietary: string) => {
    setSelectedDietary(prev =>
      prev.includes(dietary) ? prev.filter(d => d !== dietary) : [...prev, dietary]
    );
  };

  const clearFilters = () => {
    setSelectedCuisines([]);
    setSelectedPriceRanges([]);
    setSelectedDietary([]);
    setOnlyFeatured(false);
    setHasReservations(false);
    setHasCatering(false);
    setHasOutdoorSeating(false);
    setHasParking(false);
    setSelectedTag(null);
    setSearchQuery("");
    setSearchParams({});
  };

  const activeFiltersCount = 
    selectedCuisines.length + 
    selectedPriceRanges.length + 
    selectedDietary.length + 
    (selectedTag ? 1 : 0) +
    (onlyFeatured ? 1 : 0) + 
    (hasReservations ? 1 : 0) + 
    (hasCatering ? 1 : 0) + 
    (hasOutdoorSeating ? 1 : 0) + 
    (hasParking ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Enhanced Header with glassmorphism */}
      <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50 shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ x: -4 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </motion.div>
              <motion.div 
                className="flex items-center gap-2 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate("/")}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-amber-500/20 rounded-lg blur-lg"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <Utensils className="w-7 h-7 text-amber-500 relative z-10" />
                </div>
                <span className="text-2xl font-bold text-white group-hover:text-amber-500 transition-colors">
                  Blunari
                </span>
              </motion.div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="hidden items-center gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 sm:flex">
                <MapPin className="w-3 h-3 mr-1" />
                Atlanta, GA
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("/favorites")}
                className="rounded-full px-3 text-xs font-medium text-slate-200 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <Heart className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </Button>
            </div>
          </div>

          {/* Enhanced search bar with live feedback */}
          <div className="mt-5 flex gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors z-10" />
              {searching && (
                <Loader2 className="absolute right-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin z-10" />
              )}
              <Input
                placeholder="Search restaurants, cuisines, or neighborhoods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 pr-14 h-14 bg-slate-800 border-2 border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white placeholder:text-slate-400 rounded-xl transition-all duration-300 font-medium"
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-20"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>
            
            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  aria-label={`Open filters${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : ''}`}
                  className="h-14 px-5 border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-white lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-amber-500 text-black border-0">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-900 border-slate-800 w-[85vw] max-w-md overflow-y-auto">
                <SheetHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <SheetTitle className="text-white text-lg">Filters</SheetTitle>
                      <SheetDescription className="text-slate-400 text-sm">
                        Refine your restaurant search
                      </SheetDescription>
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-10 min-h-[40px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 touch-manipulation"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                {/* Mobile-optimized filters with larger touch targets */}
                <div className="space-y-6 py-4">
                  {/* Cuisine Types */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <Label className="text-white font-semibold text-base">Cuisine</Label>
                      {selectedCuisines.length > 0 && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                          {selectedCuisines.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {CUISINE_TYPES.map((cuisine) => (
                        <div key={cuisine} className="flex items-center space-x-3 group">
                          <Checkbox
                            id={`mobile-cuisine-${cuisine}`}
                            checked={selectedCuisines.includes(cuisine)}
                            onCheckedChange={() => toggleCuisine(cuisine)}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 h-5 w-5"
                          />
                          <label
                            htmlFor={`mobile-cuisine-${cuisine}`}
                            className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2"
                          >
                            {cuisine}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  {/* Price Range */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-400 text-xl">$</span>
                      <Label className="text-white font-semibold text-base">Price Range</Label>
                      {selectedPriceRanges.length > 0 && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                          {selectedPriceRanges.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-3">
                      {["$", "$$", "$$$", "$$$$"].map((price) => (
                        <div key={price} className="flex items-center space-x-3 group">
                          <Checkbox
                            id={`mobile-price-${price}`}
                            checked={selectedPriceRanges.includes(price)}
                            onCheckedChange={() => togglePriceRange(price)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 h-5 w-5"
                          />
                          <label
                            htmlFor={`mobile-price-${price}`}
                            className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 font-medium flex-1 py-2"
                          >
                            {price}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  {/* Dietary Options */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      <Label className="text-white font-semibold text-base">Dietary Options</Label>
                      {selectedDietary.length > 0 && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                          {selectedDietary.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-3">
                      {DIETARY_OPTIONS.map((dietary) => (
                        <div key={dietary} className="flex items-center space-x-3 group">
                          <Checkbox
                            id={`mobile-dietary-${dietary}`}
                            checked={selectedDietary.includes(dietary)}
                            onCheckedChange={() => toggleDietary(dietary)}
                            className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-5 w-5"
                          />
                          <label
                            htmlFor={`mobile-dietary-${dietary}`}
                            className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2"
                          >
                            {dietary}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  {/* Features */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <Label className="text-white font-semibold text-base">Features</Label>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 group">
                        <Checkbox
                          id="mobile-featured"
                          checked={onlyFeatured}
                          onCheckedChange={(checked) => setOnlyFeatured(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-5 w-5"
                        />
                        <label htmlFor="mobile-featured" className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2">
                          Featured Only
                        </label>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <Checkbox
                          id="mobile-reservations"
                          checked={hasReservations}
                          onCheckedChange={(checked) => setHasReservations(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-5 w-5"
                        />
                        <label htmlFor="mobile-reservations" className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2">
                          Accepts Reservations
                        </label>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <Checkbox
                          id="mobile-catering"
                          checked={hasCatering}
                          onCheckedChange={(checked) => setHasCatering(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-5 w-5"
                        />
                        <label htmlFor="mobile-catering" className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2">
                          Catering Available
                        </label>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <Checkbox
                          id="mobile-outdoor"
                          checked={hasOutdoorSeating}
                          onCheckedChange={(checked) => setHasOutdoorSeating(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-5 w-5"
                        />
                        <label htmlFor="mobile-outdoor" className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2">
                          Outdoor Seating
                        </label>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <Checkbox
                          id="mobile-parking"
                          checked={hasParking}
                          onCheckedChange={(checked) => setHasParking(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-5 w-5"
                        />
                        <label htmlFor="mobile-parking" className="text-base text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-1 flex-1 py-2">
                          Parking Available
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom sticky apply button for mobile */}
                <div className="sticky bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 -mx-6 -mb-6 mt-6">
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-base"
                    onClick={() => {
                      // Sheet will auto-close, filters already applied
                    }}
                  >
                    Show {restaurants.length} Result{restaurants.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Results count and sort */}
          <div className="mt-4 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-slate-400"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span>
                  Found <span className="text-white font-semibold">{restaurants.length}</span> restaurant
                  {restaurants.length !== 1 ? "s" : ""}
                  {debouncedSearch && (
                    <span> for &quot;<span className="text-amber-500">{debouncedSearch}</span>&quot;</span>
                  )}
                </span>
              )}
            </motion.div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-10 bg-slate-800 border-slate-700 text-white">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="relevance" className="text-white">Relevance</SelectItem>
                <SelectItem value="rating" className="text-white">Highest Rated</SelectItem>
                <SelectItem value="reviews" className="text-white">Most Reviewed</SelectItem>
                <SelectItem value="name" className="text-white">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters (Desktop) - Premium Design */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-white">Filters</h3>
                    {activeFiltersCount > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Cuisine Types */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <Label className="text-white font-semibold">Cuisine</Label>
                      {selectedCuisines.length > 0 && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                          {selectedCuisines.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                      {CUISINE_TYPES.map((cuisine) => (
                        <div key={cuisine} className="flex items-center space-x-2.5 group">
                          <Checkbox
                            id={`cuisine-${cuisine}`}
                            checked={selectedCuisines.includes(cuisine)}
                            onCheckedChange={() => toggleCuisine(cuisine)}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          />
                          <label
                            htmlFor={`cuisine-${cuisine}`}
                            className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5"
                          >
                            {cuisine}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-400 text-lg">$</span>
                      <Label className="text-white font-semibold">Price Range</Label>
                      {selectedPriceRanges.length > 0 && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                          {selectedPriceRanges.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {["$", "$$", "$$$", "$$$$"].map((price) => (
                        <div key={price} className="flex items-center space-x-2.5 group">
                          <Checkbox
                            id={`price-${price}`}
                            checked={selectedPriceRanges.includes(price)}
                            onCheckedChange={() => togglePriceRange(price)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <label
                            htmlFor={`price-${price}`}
                            className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5 font-medium"
                          >
                            {price}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Options */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <Label className="text-white font-semibold">Dietary Options</Label>
                      {selectedDietary.length > 0 && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                          {selectedDietary.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {DIETARY_OPTIONS.map((dietary) => (
                        <div key={dietary} className="flex items-center space-x-2.5 group">
                          <Checkbox
                            id={`dietary-${dietary}`}
                            checked={selectedDietary.includes(dietary)}
                            onCheckedChange={() => toggleDietary(dietary)}
                            className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          />
                          <label
                            htmlFor={`dietary-${dietary}`}
                            className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5"
                          >
                            {dietary}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <Label className="text-white font-semibold">Features</Label>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-2.5 group">
                        <Checkbox
                          id="featured"
                          checked={onlyFeatured}
                          onCheckedChange={(checked) => setOnlyFeatured(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="featured" className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5">
                          Featured Only
                        </label>
                      </div>
                      <div className="flex items-center space-x-2.5 group">
                        <Checkbox
                          id="reservations"
                          checked={hasReservations}
                          onCheckedChange={(checked) => setHasReservations(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="reservations" className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5">
                          Accepts Reservations
                        </label>
                      </div>
                      <div className="flex items-center space-x-2.5 group">
                        <Checkbox
                          id="catering"
                          checked={hasCatering}
                          onCheckedChange={(checked) => setHasCatering(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="catering" className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5">
                          Catering Available
                        </label>
                      </div>
                      <div className="flex items-center space-x-2.5 group">
                        <Checkbox
                          id="outdoor"
                          checked={hasOutdoorSeating}
                          onCheckedChange={(checked) => setHasOutdoorSeating(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="outdoor" className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5">
                          Outdoor Seating
                        </label>
                      </div>
                      <div className="flex items-center space-x-2.5 group">
                        <Checkbox
                          id="parking"
                          checked={hasParking}
                          onCheckedChange={(checked) => setHasParking(checked as boolean)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="parking" className="text-sm text-slate-300 cursor-pointer hover:text-white transition-all group-hover:translate-x-0.5">
                          Parking Available
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content with Pull-to-Refresh */}
          <div className="flex-1">
            <PullToRefresh
              onRefresh={handleRefresh}
              pullingContent={
                <div className="text-center py-4 text-slate-400 flex flex-col items-center gap-2">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    <ArrowLeft className="w-5 h-5 rotate-90" />
                  </motion.div>
                  <span className="text-sm">Pull to refresh</span>
                </div>
              }
              refreshingContent={
                <div className="text-center py-4 text-amber-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Refreshing...</span>
                </div>
              }
              resistance={2}
              maxPullDownDistance={120}
              pullDownThreshold={80}
              className="min-h-screen"
            >
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Restaurants in Atlanta
                    </h1>
                    <p className="text-slate-400">
                      {loading ? "Loading..." : `${restaurants.length} restaurants found`}
                    </p>
                  </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filters */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden border-slate-700 text-white">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge className="ml-2 bg-amber-500 text-black">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-slate-900 border-slate-800 text-white w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="text-white">Filters</SheetTitle>
                      <SheetDescription className="text-slate-400">
                        Refine your restaurant search
                      </SheetDescription>
                    </SheetHeader>
                    {/* Same filter content as sidebar */}
                    <div className="mt-6 space-y-6">
                      {/* Add all filter sections here - same as sidebar */}
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="reviews">Most Reviewed</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Tags - Premium Design */}
            <AnimatePresence>
              {activeFiltersCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                      {selectedCuisines.map((cuisine, index) => (
                        <motion.div
                          key={cuisine}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30 hover:scale-105 cursor-pointer transition-all duration-200 px-3 py-2 gap-1.5 min-h-[36px] touch-manipulation"
                            onClick={() => toggleCuisine(cuisine)}
                          >
                            <span className="font-medium text-sm sm:text-base">{cuisine}</span>
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </motion.div>
                          </Badge>
                        </motion.div>
                      ))}
                      {selectedPriceRanges.map((price, index) => (
                        <motion.div
                          key={price}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, delay: (selectedCuisines.length + index) * 0.03 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30 hover:scale-105 cursor-pointer transition-all duration-200 px-3 py-2 gap-1.5 min-h-[36px] touch-manipulation"
                            onClick={() => togglePriceRange(price)}
                          >
                            <span className="font-medium text-sm sm:text-base">{price}</span>
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </motion.div>
                          </Badge>
                        </motion.div>
                      ))}
                      {selectedDietary.map((option, index) => (
                        <motion.div
                          key={option}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, delay: (selectedCuisines.length + selectedPriceRanges.length + index) * 0.03 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30 hover:scale-105 cursor-pointer transition-all duration-200 px-3 py-2 gap-1.5 min-h-[36px] touch-manipulation"
                            onClick={() => toggleDietary(option)}
                          >
                            <span className="font-medium text-sm sm:text-base">{option}</span>
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </motion.div>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {/* Clear All Button - Mobile-friendly */}
                    {activeFiltersCount > 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-9 min-h-[36px] px-4 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all duration-200 touch-manipulation"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear All
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Restaurant Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 overflow-hidden h-full">
                      {/* Image skeleton with shimmer */}
                      <div className="relative h-56 bg-slate-800 overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                      </div>
                      <CardContent className="p-5 space-y-3">
                        {/* Title skeleton */}
                        <div className="h-6 bg-slate-800 rounded-lg w-3/4 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                        </div>
                        {/* Description skeleton */}
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-800 rounded w-full relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                          </div>
                          <div className="h-4 bg-slate-800 rounded w-2/3 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                          </div>
                        </div>
                        {/* Badges skeleton */}
                        <div className="flex gap-2">
                          <div className="h-6 bg-slate-800 rounded-full w-16 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                          </div>
                          <div className="h-6 bg-slate-800 rounded-full w-20 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800 p-12 text-center relative overflow-hidden">
                  {/* Decorative gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-rose-500/5" />
                  
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
                      <ChefHat className="w-20 h-20 text-slate-600 mx-auto relative" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No restaurants found</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                      We couldn't find any restaurants matching your criteria. Try adjusting your filters or search query.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={clearFilters} 
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg hover:shadow-amber-500/25 transition-all"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear All Filters
                      </Button>
                      <Button 
                        onClick={() => setSearchQuery("")} 
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        Clear Search
                      </Button>
                    </div>
                  </motion.div>
                </Card>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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

                {/* Infinite scroll trigger & loading indicator */}
                {hasMore && (
                  <div ref={loadMoreRef} className="mt-12 text-center">
                    {loadingMore && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 py-8"
                      >
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        <p className="text-slate-400 text-sm">Loading more restaurants...</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* End of results message */}
                {!hasMore && restaurants.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 text-center py-8"
                  >
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-slate-300 text-sm font-medium">
                        You've seen all {restaurants.length} restaurants
                      </span>
                    </div>
                  </motion.div>
                )}
              </>
            )}
              </div>
            </PullToRefresh>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDiscoveryPage;
