import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Users, TrendingUp, Star, Utensils, ChefHat, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    // Always fetch restaurants first for public visitors
    fetchFeaturedRestaurants();
    
    // If user is logged in as tenant owner/employee, check role and redirect
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    // Check if user has tenant access (employee or owner)
    const { data: provisioning } = await supabase
      .from("auto_provisioning")
      .select("tenant_id, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (provisioning) {
      // User is tenant owner/employee, redirect to dashboard
      navigate("/dashboard");
    }
    // Consumer user or no auth - show marketplace (already loaded)
  };

  const fetchFeaturedRestaurants = async () => {
    setLoading(true);
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
      setFeaturedRestaurants((data as Restaurant[]) || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
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
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          {/* Top navigation bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-16"
          >
            <div className="flex items-center gap-2">
              <Utensils className="w-8 h-8 text-amber-500" />
              <span className="text-2xl font-bold text-white">Blunari</span>
            </div>
            <div className="flex gap-4">
              <Button
                variant="ghost"
                className="text-white hover:text-amber-500 hover:bg-white/10"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                onClick={() => navigate("/discover")}
              >
                Explore Restaurants
              </Button>
            </div>
          </motion.div>

          {/* Hero content */}
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Discover & Book
                <span className="block bg-gradient-to-r from-amber-400 via-rose-400 to-amber-500 bg-clip-text text-transparent">
                  Unforgettable Dining
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
                Atlanta's premier platform for reservations and catering. Instant confirmation, no fees, trusted by thousands.
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        placeholder="Search restaurants, cuisines..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-12 h-14 text-lg border-0 focus-visible:ring-2 focus-visible:ring-amber-500"
                      />
                    </div>
                    <Button
                      onClick={handleSearch}
                      size="lg"
                      className="h-14 px-8 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-lg"
                    >
                      Search
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Quick filters */}
                  <div className="flex flex-wrap gap-2 mt-6 justify-center">
                    {["Italian", "Japanese", "Steakhouse", "Catering", "Fine Dining", "Brunch"].map((cuisine) => (
                      <Badge
                        key={cuisine}
                        variant="secondary"
                        className="cursor-pointer hover:bg-amber-500 hover:text-black transition-colors px-4 py-2"
                        onClick={() => navigate(`/discover?cuisine=${cuisine}`)}
                      >
                        {cuisine}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-8 mt-16 text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-500" />
                <span><span className="text-white font-bold">1,200+</span> Restaurants</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span><span className="text-white font-bold">89K+</span> Reservations</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span><span className="text-white font-bold">4.8</span> Average Rating</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Featured in Atlanta
            </h2>
            <p className="text-slate-400 text-lg">
              Discover the best dining experiences in the city
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                  <div className="h-48 bg-slate-700 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-6 bg-slate-700 rounded mb-2" />
                    <div className="h-4 bg-slate-700 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
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
                    className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-all duration-300 cursor-pointer group overflow-hidden"
                    onClick={() => handleRestaurantClick(restaurant.slug)}
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
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-500 transition-colors">
                        {restaurant.name}
                      </h3>
                      
                      {/* Cuisine badges */}
                      {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {restaurant.cuisine_types.slice(0, 2).map((cuisine) => (
                            <Badge key={cuisine} variant="secondary" className="text-xs">
                              {cuisine}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Rating and price */}
                      <div className="flex items-center justify-between text-sm">
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
                        <p className="text-slate-400 text-sm mt-2 flex items-center gap-1">
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
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              View All Restaurants
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Value propositions */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Instant Confirmation",
                description: "Book in seconds, confirm immediately. No waiting, no hassle.",
              },
              {
                icon: Award,
                title: "Verified Restaurants",
                description: "Every restaurant is verified and trusted by thousands of diners.",
              },
              {
                icon: Star,
                title: "Real Reviews",
                description: "Honest reviews from verified diners to help you decide.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <Card className="bg-slate-900 border-slate-800 p-8 text-center h-full">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-6">
                    <item.icon className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="w-6 h-6 text-amber-500" />
                <span className="text-xl font-bold text-white">Blunari</span>
              </div>
              <p className="text-slate-400 text-sm">
                Atlanta's premier dining reservation and catering platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Discover</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/discover" className="hover:text-amber-500">All Restaurants</a></li>
                <li><a href="/discover?cuisine=Italian" className="hover:text-amber-500">Italian</a></li>
                <li><a href="/discover?cuisine=Japanese" className="hover:text-amber-500">Japanese</a></li>
                <li><a href="/discover?featured=true" className="hover:text-amber-500">Featured</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Restaurants</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/auth" className="hover:text-amber-500">Restaurant Login</a></li>
                <li><a href="#" className="hover:text-amber-500">Partner With Us</a></li>
                <li><a href="#" className="hover:text-amber-500">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-amber-500">About Us</a></li>
                <li><a href="#" className="hover:text-amber-500">Contact</a></li>
                <li><a href="#" className="hover:text-amber-500">Privacy</a></li>
                <li><a href="#" className="hover:text-amber-500">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2025 Blunari. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceLandingPage;
