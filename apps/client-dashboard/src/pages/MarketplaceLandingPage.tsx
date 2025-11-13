import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Calendar, Users, TrendingUp, Star, Utensils, ChefHat, 
  Award, ArrowRight, Sparkles, Clock, Shield, CheckCircle2, Heart,
  Phone, Mail, Instagram, Facebook, Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LazyImage } from "@/components/LazyImage";
import { getImagePlaceholder } from "@/utils/image-utils";

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
}

const MarketplaceLandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Marketplace] Component mounted, user:', user ? 'logged in' : 'anonymous');
    
    // Always fetch restaurants first for public visitors
    fetchFeaturedRestaurants();
    
    // If user is logged in as tenant owner/employee, check role and redirect
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    console.log('[Marketplace] Checking user role for user:', user.id);
    
    // Check if user has tenant access (employee or owner)
    const { data: provisioning } = await supabase
      .from("auto_provisioning")
      .select("tenant_id, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (provisioning) {
      // User is tenant owner/employee, redirect to dashboard
      console.log('[Marketplace] User is tenant owner/employee, redirecting to dashboard');
      navigate("/dashboard");
    } else {
      console.log('[Marketplace] User is consumer, showing marketplace');
    }
    // Consumer user or no auth - show marketplace (already loaded)
  };

  const fetchFeaturedRestaurants = async () => {
    setLoading(true);
    console.log('[Marketplace] Fetching featured restaurants...');
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("is_published", true)
        .eq("location_city", "Atlanta")
        .order("is_featured", { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(8);

      if (error) throw error;
      console.log('[Marketplace] Fetched restaurants:', data?.length || 0);
      setFeaturedRestaurants((data as Restaurant[]) || []);
    } catch (error) {
      console.error("[Marketplace] Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleRestaurantClick = (slug: string) => {
    navigate(`/restaurant/${slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Enhanced background with mesh gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-rose-900/20 via-transparent to-transparent" />
        
        {/* Animated background elements with improved animation */}
        <div className="absolute inset-0 opacity-30">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-amber-500/30 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-rose-500/30 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          {/* Enhanced top navigation bar with glassmorphism */}
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-16 backdrop-blur-xl bg-slate-900/50 px-6 py-4 rounded-2xl border border-slate-800/50 shadow-2xl"
          >
            <motion.div 
              className="flex items-center gap-3 cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate("/")}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-amber-500/20 rounded-lg blur-lg"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Utensils className="w-8 h-8 text-amber-500 relative z-10" />
              </div>
              <span className="text-2xl font-bold text-white group-hover:text-amber-500 transition-colors">
                Blunari
              </span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Atlanta
              </Badge>
            </motion.div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-white hover:text-amber-500 hover:bg-white/10 transition-all duration-300 h-10 min-h-[40px] px-4 sm:px-6 touch-manipulation text-sm sm:text-base"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 h-10 min-h-[40px] px-4 sm:px-6 touch-manipulation text-sm sm:text-base"
                onClick={() => navigate("/discover")}
              >
                <span className="hidden sm:inline">Explore Restaurants</span>
                <span className="sm:hidden">Explore</span>
                <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.nav>

          {/* Enhanced hero content with better typography */}
          <div className="text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              {/* Trust badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 backdrop-blur-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-200">
                  Trusted by 89,000+ diners across Atlanta
                </span>
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-tight tracking-tight">
                Discover & Book
                <motion.span 
                  className="block bg-gradient-to-r from-amber-400 via-rose-400 to-amber-500 bg-clip-text text-transparent mt-2"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                  }}
                >
                  Unforgettable Dining
                </motion.span>
              </h1>
              <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Atlanta's premier platform for reservations and catering. 
                <span className="text-white font-semibold"> Instant confirmation</span>, 
                <span className="text-white font-semibold"> zero fees</span>, and 
                <span className="text-white font-semibold"> verified restaurants</span>.
              </p>
            </motion.div>

            {/* Enhanced search bar with premium styling */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-white/98 backdrop-blur-2xl border-0 shadow-2xl shadow-black/50 hover:shadow-amber-500/10 transition-shadow duration-500 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                      <Input
                        placeholder="Search restaurants, cuisines, or neighborhoods..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-14 h-16 text-lg border-2 border-transparent focus-visible:border-amber-500 focus-visible:ring-4 focus-visible:ring-amber-500/20 rounded-xl transition-all duration-300 font-medium"
                      />
                      {searchQuery && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          onClick={() => setSearchQuery("")}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          ✕
                        </motion.button>
                      )}
                    </div>
                    <Button
                      onClick={handleSearch}
                      size="lg"
                      className="h-16 px-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105"
                    >
                      Search
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Enhanced quick filters with animations */}
                  <motion.div 
                    className="flex flex-wrap gap-3 mt-8 justify-center"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    {["Italian", "Japanese", "Steakhouse", "Catering", "Fine Dining", "Brunch"].map((cuisine, index) => (
                      <motion.div
                        key={cuisine}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-amber-500 hover:text-black hover:scale-110 transition-all duration-300 px-5 py-3 min-h-[44px] text-sm sm:text-base font-semibold border border-slate-200 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20 touch-manipulation"
                          onClick={() => navigate(`/discover?cuisine=${cuisine}`)}
                        >
                          {cuisine}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Enhanced stats with premium cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto"
            >
              {[
                { icon: Utensils, value: "1,200+", label: "Premium Restaurants", color: "amber" },
                { icon: Users, value: "89K+", label: "Happy Diners", color: "rose" },
                { icon: Star, value: "4.8", label: "Average Rating", color: "purple" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="relative group"
                >
                  <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 overflow-hidden">
                    <CardContent className="p-6 text-center relative z-10">
                      <motion.div
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-${stat.color}-500/10 mb-4`}
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <stat.icon className={`w-7 h-7 text-${stat.color}-500`} />
                      </motion.div>
                      <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                      <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                    </CardContent>
                    {/* Animated glow effect */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r from-${stat.color}-500/0 via-${stat.color}-500/10 to-${stat.color}-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Restaurants Section with premium design */}
      <section className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6"
            >
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-500">Featured Restaurants</span>
            </motion.div>
            <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
              Top Picks in{" "}
              <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
                Atlanta
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Handpicked dining experiences from award-winning chefs and beloved local favorites
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 overflow-hidden">
                  <div className="relative">
                    <div className="h-56 bg-slate-700/50 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-800/80 to-transparent" />
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="h-6 bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="h-4 bg-slate-700/50 rounded-lg w-3/4 animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-slate-700/50 rounded-full w-20 animate-pulse" />
                      <div className="h-6 bg-slate-700/50 rounded-full w-24 animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredRestaurants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-6">
                <Utensils className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No restaurants yet</h3>
              <p className="text-slate-400 mb-8">
                We're adding amazing restaurants to Atlanta. Check back soon!
              </p>
              <Button
                onClick={() => navigate("/discover")}
                variant="outline"
                className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
              >
                Explore All Locations
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredRestaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card
                    className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 cursor-pointer group overflow-hidden relative"
                    onClick={() => handleRestaurantClick(restaurant.slug)}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:via-transparent group-hover:to-rose-500/5 transition-all duration-500 pointer-events-none" />
                    
                    {/* Image - Lazy loaded */}
                    <div className="relative h-56 overflow-hidden">
                      {restaurant.hero_image_url ? (
                        <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out">
                          <LazyImage
                            src={restaurant.hero_image_url}
                            alt={restaurant.name}
                            className="w-full h-full"
                            blurDataURL={getImagePlaceholder(restaurant.hero_image_url)}
                          />
                          {/* Image overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                            animate={{
                              x: ["-100%", "100%"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <ChefHat className="w-16 h-16 text-slate-600 relative z-10" />
                        </div>
                      )}
                      {restaurant.is_featured && (
                        <Badge className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black border-0 shadow-lg font-semibold px-3 py-1">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {/* Quick action button on hover */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <Button
                          size="sm"
                          className="bg-white/95 hover:bg-white text-black font-semibold shadow-lg backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestaurantClick(restaurant.slug);
                          }}
                        >
                          View Menu
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </motion.div>
                    </div>

                    <CardContent className="p-5 relative z-10">
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors duration-300 line-clamp-1">
                          {restaurant.name}
                        </h3>
                        
                        {/* Cuisine badges with icons */}
                        {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {restaurant.cuisine_types.slice(0, 2).map((cuisine) => (
                              <Badge 
                                key={cuisine} 
                                variant="secondary" 
                                className="text-xs font-semibold bg-slate-700/50 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                              >
                                {cuisine}
                              </Badge>
                            ))}
                            {restaurant.cuisine_types.length > 2 && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs bg-slate-700/50 text-slate-400"
                              >
                                +{restaurant.cuisine_types.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Rating and price with enhanced styling */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${
                                    i < Math.floor(restaurant.average_rating || 0)
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-slate-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-bold text-white">
                              {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : "New"}
                            </span>
                            {restaurant.total_reviews && restaurant.total_reviews > 0 && (
                              <span className="text-xs text-slate-400">
                                ({restaurant.total_reviews.toLocaleString()})
                              </span>
                            )}
                          </div>
                          {restaurant.price_range && (
                            <span className="text-base text-amber-500 font-bold tracking-wider">
                              {restaurant.price_range}
                            </span>
                          )}
                        </div>

                        {/* Location with better icon */}
                        {restaurant.location_neighborhood && (
                          <div className="flex items-center gap-2 text-sm text-slate-400 pt-2">
                            <MapPin className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">{restaurant.location_neighborhood}</span>
                          </div>
                        )}

                        {/* Enhanced action badges */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {restaurant.accepts_reservations && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Book Now
                            </Badge>
                          )}
                          {restaurant.accepts_catering && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              Catering
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button
              size="lg"
              onClick={() => navigate("/discover")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-12 min-h-[48px] px-8 touch-manipulation text-base sm:text-lg"
            >
              View All Restaurants
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Value Propositions Section */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Why Choose Blunari?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The most trusted platform for dining reservations in Atlanta
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Instant Confirmation",
                description: "Book in seconds and receive immediate confirmation. No waiting, no uncertainty, no hassle.",
                color: "emerald",
                features: ["Real-time availability", "24/7 booking", "Instant confirmation"],
              },
              {
                icon: Shield,
                title: "Verified Restaurants",
                description: "Every restaurant is personally verified and trusted by thousands of satisfied diners.",
                color: "amber",
                features: ["Verified quality", "Trusted partners", "Regular inspections"],
              },
              {
                icon: Star,
                title: "Authentic Reviews",
                description: "Read honest reviews from real, verified diners who've actually experienced these restaurants.",
                color: "purple",
                features: ["Verified diners only", "Photo reviews", "Helpful ratings"],
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-slate-700/50 hover:border-amber-500/50 p-8 text-center h-full relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10">
                  {/* Animated background glow */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br from-${item.color}-500/0 to-${item.color}-500/0 group-hover:from-${item.color}-500/5 group-hover:to-transparent transition-all duration-500`}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-${item.color}-500/10 to-${item.color}-500/5 border border-${item.color}-500/20 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <item.icon className={`w-10 h-10 text-${item.color}-500`} />
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    
                    <p className="text-slate-400 leading-relaxed mb-6">
                      {item.description}
                    </p>

                    {/* Feature list */}
                    <div className="space-y-2">
                      {item.features.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 + i * 0.1 }}
                          className="flex items-center justify-center gap-2 text-sm text-slate-500 group-hover:text-slate-400 transition-colors"
                        >
                          <CheckCircle2 className={`w-4 h-4 text-${item.color}-500`} />
                          <span>{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-16"
          >
            <Card className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-amber-500/20 p-12 backdrop-blur-sm">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Ready to discover amazing dining?
                </h3>
                <p className="text-slate-300 mb-8 text-lg">
                  Join 89,000+ diners who trust Blunari for their restaurant reservations
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate("/discover")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg px-8 h-14 min-h-[56px] shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 transition-all duration-300 touch-manipulation"
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    Explore Restaurants
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth")}
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-bold text-lg h-14 min-h-[56px] transition-all duration-300 touch-manipulation"
                  >
                    For Restaurant Owners
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-black border-t border-slate-800/50 relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <motion.div 
                className="flex items-center gap-3 mb-6 group cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-lg blur-lg group-hover:blur-xl transition-all" />
                  <Utensils className="w-8 h-8 text-amber-500 relative z-10" />
                </div>
                <span className="text-2xl font-bold text-white group-hover:text-amber-500 transition-colors">
                  Blunari
                </span>
              </motion.div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
                Atlanta's premier dining reservation and catering platform. Discover, book, and enjoy unforgettable dining experiences.
              </p>
              
              {/* Social Links */}
              <div className="flex gap-3">
                {[
                  { icon: Instagram, label: "Instagram", href: "#" },
                  { icon: Facebook, label: "Facebook", href: "#" },
                  { icon: Twitter, label: "Twitter", href: "#" },
                ].map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-black border border-slate-700 hover:border-amber-500 transition-all duration-300 touch-manipulation"
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Discover</h4>
              <ul className="space-y-3">
                {[
                  { label: "All Restaurants", href: "/discover" },
                  { label: "Italian Cuisine", href: "/discover?cuisine=Italian" },
                  { label: "Japanese Cuisine", href: "/discover?cuisine=Japanese" },
                  { label: "Featured", href: "/discover?featured=true" },
                  { label: "Top Rated", href: "/discover?sort=rating" },
                ].map((link) => (
                  <li key={link.label}>
                    <a 
                      href={link.href} 
                      className="text-slate-400 hover:text-amber-500 text-sm transition-colors duration-300 flex items-center gap-2 group py-1.5 min-h-[36px] touch-manipulation"
                    >
                      <span className="w-0 h-px bg-amber-500 group-hover:w-4 transition-all duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">For Restaurants</h4>
              <ul className="space-y-3">
                {[
                  { label: "Restaurant Login", href: "/auth" },
                  { label: "Partner With Us", href: "#" },
                  { label: "Pricing", href: "#" },
                  { label: "Features", href: "#" },
                  { label: "Support", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <a 
                      href={link.href} 
                      className="text-slate-400 hover:text-amber-500 text-sm transition-colors duration-300 flex items-center gap-2 group py-1.5 min-h-[36px] touch-manipulation"
                    >
                      <span className="w-0 h-px bg-amber-500 group-hover:w-4 transition-all duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "About Us", href: "#" },
                  { label: "Contact", href: "#" },
                  { label: "Careers", href: "#" },
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <a 
                      href={link.href} 
                      className="text-slate-400 hover:text-amber-500 text-sm transition-colors duration-300 flex items-center gap-2 group py-1.5 min-h-[36px] touch-manipulation"
                    >
                      <span className="w-0 h-px bg-amber-500 group-hover:w-4 transition-all duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              &copy; 2025 Blunari. All rights reserved. Made with{" "}
              <Heart className="w-4 h-4 inline-block text-rose-500 fill-rose-500" /> in Atlanta
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="tel:+1234567890" className="hover:text-amber-500 transition-colors flex items-center gap-2">
                <Phone className="w-4 h-4" />
                (123) 456-7890
              </a>
              <a href="mailto:hello@blunari.ai" className="hover:text-amber-500 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                hello@blunari.ai
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceLandingPage;
