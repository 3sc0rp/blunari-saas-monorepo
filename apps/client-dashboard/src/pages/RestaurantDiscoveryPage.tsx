import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Star, ChefHat, SlidersHorizontal, X, Utensils, ArrowLeft, TrendingUp } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_types: string[] | null;
  price_range: string | null;
  hero_image_url: string | null;
  location_city: string | null;
  location_neighborhood: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  is_featured: boolean | null;
  accepts_reservations: boolean | null;
  accepts_catering: boolean | null;
  outdoor_seating: boolean | null;
  parking_available: boolean | null;
  dietary_options: string[] | null;
}

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
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  
  // Filters
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    searchParams.get("cuisine") ? [searchParams.get("cuisine")!] : []
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

  useEffect(() => {
    fetchRestaurants();
  }, [searchQuery, selectedCuisines, selectedPriceRanges, selectedDietary, onlyFeatured, hasReservations, hasCatering, hasOutdoorSeating, hasParking, sortBy]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tenants")
        .select("*")
        .eq("is_published", true)
        .eq("location_city", "Atlanta");

      // Search query
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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

      const { data, error } = await query;

      if (error) throw error;
      setRestaurants((data as Restaurant[]) || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
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
    setSearchQuery("");
    setSearchParams({});
  };

  const activeFiltersCount = 
    selectedCuisines.length + 
    selectedPriceRanges.length + 
    selectedDietary.length + 
    (onlyFeatured ? 1 : 0) + 
    (hasReservations ? 1 : 0) + 
    (hasCatering ? 1 : 0) + 
    (hasOutdoorSeating ? 1 : 0) + 
    (hasParking ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Utensils className="w-6 h-6 text-amber-500" />
                <span className="text-xl font-bold text-white">Blunari</span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-white hover:text-amber-500"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>

          {/* Search bar */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search restaurants, cuisines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Search
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters (Desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-amber-500 hover:text-amber-400"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Cuisine Types */}
                <div>
                  <Label className="text-white mb-3 block">Cuisine</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {CUISINE_TYPES.map((cuisine) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={selectedCuisines.includes(cuisine)}
                          onCheckedChange={() => toggleCuisine(cuisine)}
                        />
                        <label
                          htmlFor={`cuisine-${cuisine}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {cuisine}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="text-white mb-3 block">Price Range</Label>
                  <div className="space-y-2">
                    {["$", "$$", "$$$", "$$$$"].map((price) => (
                      <div key={price} className="flex items-center space-x-2">
                        <Checkbox
                          id={`price-${price}`}
                          checked={selectedPriceRanges.includes(price)}
                          onCheckedChange={() => togglePriceRange(price)}
                        />
                        <label
                          htmlFor={`price-${price}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {price}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dietary Options */}
                <div>
                  <Label className="text-white mb-3 block">Dietary Options</Label>
                  <div className="space-y-2">
                    {DIETARY_OPTIONS.map((dietary) => (
                      <div key={dietary} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dietary-${dietary}`}
                          checked={selectedDietary.includes(dietary)}
                          onCheckedChange={() => toggleDietary(dietary)}
                        />
                        <label
                          htmlFor={`dietary-${dietary}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {dietary}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <Label className="text-white mb-3 block">Features</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="featured"
                        checked={onlyFeatured}
                        onCheckedChange={(checked) => setOnlyFeatured(checked as boolean)}
                      />
                      <label htmlFor="featured" className="text-sm text-slate-300 cursor-pointer">
                        Featured Only
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reservations"
                        checked={hasReservations}
                        onCheckedChange={(checked) => setHasReservations(checked as boolean)}
                      />
                      <label htmlFor="reservations" className="text-sm text-slate-300 cursor-pointer">
                        Accepts Reservations
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="catering"
                        checked={hasCatering}
                        onCheckedChange={(checked) => setHasCatering(checked as boolean)}
                      />
                      <label htmlFor="catering" className="text-sm text-slate-300 cursor-pointer">
                        Catering Available
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="outdoor"
                        checked={hasOutdoorSeating}
                        onCheckedChange={(checked) => setHasOutdoorSeating(checked as boolean)}
                      />
                      <label htmlFor="outdoor" className="text-sm text-slate-300 cursor-pointer">
                        Outdoor Seating
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="parking"
                        checked={hasParking}
                        onCheckedChange={(checked) => setHasParking(checked as boolean)}
                      />
                      <label htmlFor="parking" className="text-sm text-slate-300 cursor-pointer">
                        Parking Available
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
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

            {/* Active Filters Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedCuisines.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 cursor-pointer"
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    {cuisine}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
                {selectedPriceRanges.map((price) => (
                  <Badge
                    key={price}
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 cursor-pointer"
                    onClick={() => togglePriceRange(price)}
                  >
                    {price}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Restaurant Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                    <div className="h-48 bg-slate-700 rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-6 bg-slate-700 rounded mb-2" />
                      <div className="h-4 bg-slate-700 rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700 p-12 text-center">
                <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No restaurants found</h3>
                <p className="text-slate-400 mb-4">Try adjusting your filters or search query</p>
                <Button onClick={clearFilters} className="bg-amber-500 hover:bg-amber-600 text-black">
                  Clear All Filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {restaurants.map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-all duration-300 cursor-pointer group overflow-hidden h-full"
                      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        {restaurant.hero_image_url ? (
                          <img
                            src={restaurant.hero_image_url}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
                            <ChefHat className="w-16 h-16 text-slate-600" />
                          </div>
                        )}
                        {restaurant.is_featured && (
                          <Badge className="absolute top-3 left-3 bg-amber-500 text-black border-0">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-4">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-500 transition-colors line-clamp-1">
                          {restaurant.name}
                        </h3>
                        
                        {/* Description */}
                        {restaurant.description && (
                          <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                            {restaurant.description}
                          </p>
                        )}

                        {/* Cuisine badges */}
                        {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {restaurant.cuisine_types.slice(0, 3).map((cuisine) => (
                              <Badge key={cuisine} variant="secondary" className="text-xs">
                                {cuisine}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Rating and price */}
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-semibold">
                              {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : "New"}
                            </span>
                            {restaurant.total_reviews && restaurant.total_reviews > 0 && (
                              <span className="text-slate-400">({restaurant.total_reviews})</span>
                            )}
                          </div>
                          {restaurant.price_range && (
                            <span className="text-slate-300 font-semibold">{restaurant.price_range}</span>
                          )}
                        </div>

                        {/* Location */}
                        {restaurant.location_neighborhood && (
                          <p className="text-slate-400 text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {restaurant.location_neighborhood}
                          </p>
                        )}

                        {/* Action badges */}
                        <div className="flex gap-2 mt-3">
                          {restaurant.accepts_reservations && (
                            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">
                              Reservations
                            </Badge>
                          )}
                          {restaurant.accepts_catering && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                              Catering
                            </Badge>
                          )}
                          {restaurant.outdoor_seating && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                              Outdoor
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDiscoveryPage;
