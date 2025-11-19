import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  Heart,
  Share2,
  Calendar,
  Users,
  Utensils,
  ChefHat,
  Image as ImageIcon,
  MessageSquare,
  Check,
  X,
  Wifi,
  ParkingCircle,
  Music,
  Accessibility,
  UtensilsCrossed,
  ThumbsUp,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/LazyImage";
import { getImagePlaceholder } from "@/utils/image-utils";
import { RestaurantCard } from "@/components/RestaurantCard";
import type { GuideRestaurant } from "@/types/dining-guide";
import { mapTenantToGuideRestaurant, mapTenantsToGuideRestaurants } from "@/data/atlanta-guide";
import { useFavorites } from "@/contexts/FavoritesContext";

// Import existing booking and catering widgets
import BookingWidget from "@/components/booking/BookingWidget";
import CateringWidget from "@/components/catering/CateringWidget";

type Restaurant = GuideRestaurant;
type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

interface Review {
  id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  photo_urls: string[] | null;
  visit_date: string | null;
  party_size: number | null;
  reviewer_name: string | null;
  is_verified: boolean | null;
  helpful_count: number | null;
  restaurant_response: string | null;
  created_at: string;
}

const RestaurantProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite: isFavoriteGlobal, toggleFavorite: toggleFavoriteGlobal } = useFavorites();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Restaurant[]>([]);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showBookingCTA, setShowBookingCTA] = useState(false);

  // Swipe handlers for image gallery navigation
  const handleSwipeLeft = () => {
    if (!restaurant) return;
    const allImages = [
      restaurant.hero_image_url,
      ...(restaurant.gallery_images || [])
    ].filter(Boolean) as string[];
    
    if (allImages.length > 1) {
      setSelectedImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }
  };

  const handleSwipeRight = () => {
    if (!restaurant) return;
    const allImages = [
      restaurant.hero_image_url,
      ...(restaurant.gallery_images || [])
    ].filter(Boolean) as string[];
    
    if (allImages.length > 1) {
      setSelectedImage((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    }
  };

  // Configure swipe handlers for gallery
  const gallerySwipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: false, // Only track touch, not mouse
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 50, // Minimum swipe distance in pixels
  });

  // Configure swipe handlers for lightbox
  const lightboxSwipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  useEffect(() => {
    if (slug) {
      fetchRestaurant();
      fetchReviews();
    }
  }, [slug]);

  // Sticky CTA on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBookingCTA(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      const tenant = data as TenantBase;
      const guideRestaurant = mapTenantToGuideRestaurant(tenant);
      setRestaurant(guideRestaurant);
      void fetchSimilar(guideRestaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast({
        title: "Restaurant not found",
        description: "The restaurant you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/restaurants");
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = async (base: Restaurant) => {
    try {
      let query = supabase
        .from("tenants")
        .select("*")
        .eq("is_published", true)
        .neq("slug", base.slug);

      if (base.location_city) {
        query = query.eq("location_city", base.location_city);
      }

      const primaryCuisine = base.cuisine_types?.[0];
      if (primaryCuisine) {
        query = query.overlaps("cuisine_types", [primaryCuisine]);
      }

      if (base.price_range) {
        query = query.eq("price_range", base.price_range);
      }

      const { data, error } = await query.limit(4);
      if (error) throw error;

      const tenants = (data ?? []) as TenantBase[];
      const mapped = mapTenantsToGuideRestaurants(tenants);
      setSimilar(mapped as Restaurant[]);
    } catch (error) {
      console.error("Error fetching similar restaurants:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!tenant) return;

      const { data, error } = await supabase
        .from("restaurant_reviews")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews((data as Review[]) || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name,
        text: `Check out ${restaurant?.name} on Blunari`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Restaurant link copied to clipboard",
      });
    }
  };

  const isFavorite = useMemo(
    () => (restaurant ? isFavoriteGlobal(restaurant.slug) : false),
    [isFavoriteGlobal, restaurant],
  );

  const toggleFavorite = () => {
    if (!restaurant) return;
    const next = !isFavorite;
    toggleFavoriteGlobal(restaurant.slug);
    toast({
      title: next ? "Added to favorites" : "Removed from favorites",
      description: next
        ? "Find it in your favorites on the home and lists pages."
        : "You can add it back anytime.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-amber-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const allImages = [
    restaurant.hero_image_url,
    ...(restaurant.gallery_images || []),
  ].filter(Boolean) as string[];

  const features = [
    { icon: ParkingCircle, label: "Parking", available: restaurant.parking_available },
    { icon: UtensilsCrossed, label: "Outdoor Seating", available: restaurant.outdoor_seating },
    { icon: Users, label: "Private Dining", available: restaurant.private_dining },
    { icon: Music, label: "Live Music", available: restaurant.live_music },
    { icon: Wifi, label: "WiFi", available: restaurant.wifi_available },
    { icon: Accessibility, label: "Accessible", available: restaurant.wheelchair_accessible },
  ].filter((f) => f.available);

  const highlights = restaurant.meta?.highlights ?? [];
  const picks = restaurant.meta?.recommendedDishes ?? [];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Enhanced Header with Glassmorphism */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50 shadow-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/restaurants")}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </motion.div>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  <Utensils className="w-6 h-6 text-amber-500" />
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  Blunari
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  aria-label="Share restaurant"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={isFavorite ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className={`transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    isFavorite ? "text-rose-500 hover:text-rose-400" : "text-slate-400 hover:text-white"
                  } hover:bg-slate-800`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Enhanced Hero Gallery with Lightbox - Lazy loaded with Swipe Support */}
      <section className="relative h-[500px] bg-slate-900 group">
        {allImages.length > 0 ? (
          <div {...gallerySwipeHandlers} className="relative h-full touch-pan-y">
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <LazyImage
                src={allImages[selectedImage]}
                alt={restaurant.name}
                className="w-full h-full"
                blurDataURL={getImagePlaceholder(allImages[selectedImage])}
              />
            </motion.div>
            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            
            {/* Lightbox trigger */}
            <motion.button
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white p-2 rounded-lg border border-slate-700 hover:border-amber-500 transition-all opacity-0 group-hover:opacity-100"
              onClick={() => setLightboxOpen(true)}
            >
              <Maximize2 className="w-5 h-5" />
            </motion.button>

            {/* Navigation arrows - Mobile-friendly */}
            {allImages.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(selectedImage === 0 ? allImages.length - 1 : selectedImage - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-sm text-white p-4 w-14 h-14 min-w-[56px] min-h-[56px] rounded-full border border-slate-700 hover:border-amber-500 transition-all opacity-0 group-hover:opacity-100 touch-manipulation flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(selectedImage === allImages.length - 1 ? 0 : selectedImage + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-sm text-white p-4 w-14 h-14 min-w-[56px] min-h-[56px] rounded-full border border-slate-700 hover:border-amber-500 transition-all opacity-0 group-hover:opacity-100 touch-manipulation flex items-center justify-center"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}
            
            {/* Enhanced image thumbnails - Mobile-friendly */}
            {allImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 max-w-4xl overflow-x-auto px-4 scrollbar-none">
                {allImages.map((img, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-24 h-24 min-w-[96px] min-h-[96px] sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all touch-manipulation ${
                      selectedImage === idx 
                        ? "border-amber-500 scale-105 shadow-lg shadow-amber-500/50" 
                        : "border-slate-700 opacity-60 hover:opacity-100 hover:border-amber-400"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Image counter */}
            {allImages.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-white text-sm font-medium"
              >
                {selectedImage + 1} / {allImages.length}
              </motion.div>
            )}

            {/* Mobile swipe hint - Fades after first interaction */}
            {allImages.length > 1 && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: 3, repeatDelay: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none lg:hidden"
              >
                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-500/50 shadow-lg">
                  <ChevronLeft className="w-4 h-4 text-amber-400" />
                  <span className="text-white text-xs font-medium">Swipe</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <ChefHat className="w-32 h-32 text-slate-700" />
            </motion.div>
          </div>
        )}
      </section>

      {/* Lightbox Modal with Swipe Support */}
      {lightboxOpen && allImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div {...lightboxSwipeHandlers} className="relative max-w-7xl w-full max-h-[90vh] touch-pan-y" onClick={(e) => e.stopPropagation()}>
            <motion.img
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={allImages[selectedImage]}
              alt={restaurant.name}
              className="w-full h-full object-contain rounded-lg"
            />
            
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white p-3 rounded-full border border-slate-700 hover:border-red-500 transition-all"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Navigation in lightbox - Mobile-friendly */}
            {allImages.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(selectedImage === 0 ? allImages.length - 1 : selectedImage - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-sm text-white p-5 w-16 h-16 min-w-[64px] min-h-[64px] rounded-full border border-slate-700 hover:border-amber-500 transition-all touch-manipulation flex items-center justify-center"
                >
                  <ChevronLeft className="w-8 h-8" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, x: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(selectedImage === allImages.length - 1 ? 0 : selectedImage + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-sm text-white p-5 w-16 h-16 min-w-[64px] min-h-[64px] rounded-full border border-slate-700 hover:border-amber-500 transition-all touch-manipulation flex items-center justify-center"
                >
                  <ChevronRight className="w-8 h-8" />
                </motion.button>

                {/* Counter in lightbox */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-slate-700 text-white font-medium text-base sm:text-lg">
                  {selectedImage + 1} / {allImages.length}
                </div>
              </>
            )}
        </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
              {/* Restaurant Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{restaurant.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-slate-300">
                    {restaurant.cuisine_types && restaurant.cuisine_types.map((cuisine, idx) => (
                      <React.Fragment key={cuisine}>
                        {idx > 0 && <span className="text-slate-600">•</span>}
                        <span>{cuisine}</span>
                      </React.Fragment>
                    ))}
                    {restaurant.price_range && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="font-semibold">{restaurant.price_range}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Score & Rating */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {restaurant.blunari_score != null && (
                  <div className="flex items-center gap-3 rounded-full bg-slate-900/90 px-4 py-2 border border-amber-500/50 shadow-sm shadow-amber-500/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-black">
                      {restaurant.blunari_score}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold text-slate-200">
                        Blunari Score
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {restaurant.meta?.badge ?? "Editor’s pick for Atlanta"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
                  <Star className="w-5 h-5 text-amber-500 fill-current" />
                  <span className="text-2xl font-bold text-white">
                    {restaurant.average_rating
                      ? restaurant.average_rating.toFixed(1)
                      : "New"}
                  </span>
                  {restaurant.total_reviews && restaurant.total_reviews > 0 && (
                    <span className="text-slate-400">
                      ({restaurant.total_reviews} reviews)
                    </span>
                  )}
                </div>
                {restaurant.total_bookings && restaurant.total_bookings > 0 && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{restaurant.total_bookings}+ bookings</span>
                  </div>
                )}
              </div>

              {/* Primary CTAs */}
              <div className="mt-2 flex flex-wrap gap-3">
                {restaurant.menu_url && (
                  <Button
                    className="rounded-full bg-amber-500 px-5 text-sm font-semibold text-black hover:bg-amber-600"
                    onClick={() =>
                      window.open(restaurant.menu_url as string, "_blank")
                    }
                  >
                    <Utensils className="mr-2 h-4 w-4" />
                    View menu
                  </Button>
                )}
                {restaurant.contact_phone && (
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-700 px-4 text-sm text-slate-100 hover:border-amber-500 hover:text-amber-300"
                    onClick={() => {
                      window.location.href = `tel:${restaurant.contact_phone}`;
                    }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call to reserve
                  </Button>
                )}
                {restaurant.location_address && (
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-700 px-4 text-sm text-slate-100 hover:border-amber-500 hover:text-amber-300"
                    onClick={() => {
                      const query = encodeURIComponent(
                        `${restaurant.name} ${restaurant.location_address} ${restaurant.location_city ?? ""}`,
                      );
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${query}`,
                        "_blank",
                      );
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Directions
                  </Button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {restaurant.accepts_reservations && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    <Check className="w-3 h-3 mr-1" />
                    Reservations Available
                  </Badge>
                )}
                {restaurant.accepts_catering && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                    <Check className="w-3 h-3 mr-1" />
                    Catering Services
                  </Badge>
                )}
                {features.length > 0 &&
                  features.slice(0, 2).map((feature) => (
                    <Badge key={feature.label} variant="secondary">
                      <feature.icon className="w-3 h-3 mr-1" />
                      {feature.label}
                    </Badge>
                  ))}
              </div>
            </motion.div>

            <Separator className="bg-slate-800" />

            {/* Enhanced Tabs with Animation */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 w-full justify-start p-1 rounded-xl">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-300 rounded-lg font-semibold h-11 min-h-[44px] px-4 sm:px-6 text-sm sm:text-base touch-manipulation"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                {restaurant.accepts_reservations && (
                  <TabsTrigger 
                    value="book" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-300 rounded-lg font-semibold h-11 min-h-[44px] px-4 sm:px-6 text-sm sm:text-base touch-manipulation"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book a Table
                  </TabsTrigger>
                )}
                {restaurant.accepts_catering && (
                  <TabsTrigger 
                    value="catering" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-300 rounded-lg font-semibold h-11 min-h-[44px] px-4 sm:px-6 text-sm sm:text-base touch-manipulation"
                  >
                    <Utensils className="w-4 h-4 mr-2" />
                    Catering
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="reviews" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-300 rounded-lg font-semibold h-11 min-h-[44px] px-4 sm:px-6 text-sm sm:text-base touch-manipulation"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reviews ({restaurant.total_reviews || 0})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Description */}
                {restaurant.description && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-3">About</h3>
                      <p className="text-slate-300 leading-relaxed">{restaurant.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Highlights */}
                {highlights.length > 0 && (
                  <Card className="bg-slate-900/60 border-slate-800">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Highlights
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {highlights.map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className="rounded-full border-slate-700 bg-slate-900/80 text-xs text-slate-200"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Blunari Picks */}
                {picks.length > 0 && (
                  <Card className="bg-slate-900/60 border-slate-800">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                          <h3 className="text-xl font-semibold text-white">
                            Blunari Picks
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          Recommended dishes from our editors
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {picks.map((dish) => (
                          <div
                            key={dish.name}
                            className="rounded-xl bg-slate-900/80 p-4 border border-slate-800/80"
                          >
                            <p className="text-sm font-semibold text-white">
                              {dish.name}
                            </p>
                            {dish.highlightTagline && (
                              <p className="mt-1 text-xs text-emerald-300">
                                {dish.highlightTagline}
                              </p>
                            )}
                            {dish.description && (
                              <p className="mt-1 text-xs text-slate-400">
                                {dish.description}
                              </p>
                            )}
                            {dish.price && (
                              <p className="mt-2 text-xs font-medium text-slate-200">
                                {dish.price}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Amenities */}
                {features.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          <h3 className="text-xl font-bold text-white">Amenities</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {features.map((feature, idx) => (
                            <motion.div
                              key={feature.label}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ scale: 1.05, x: 5 }}
                              className="flex items-center gap-3 text-slate-300 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/30 transition-all cursor-default group"
                            >
                              <feature.icon className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                              <span className="font-medium">{feature.label}</span>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Dietary Options */}
                {restaurant.dietary_options && restaurant.dietary_options.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Dietary Options</h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.dietary_options.map((option) => (
                          <Badge key={option} variant="secondary" className="text-sm">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Menu Link */}
                {restaurant.menu_url && (
                  <Alert className="bg-amber-500/10 border-amber-500/50">
                    <Utensils className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-slate-300">
                      <a href={restaurant.menu_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                        View Full Menu
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Book Tab */}
              {restaurant.accepts_reservations && (
                <TabsContent value="book" className="mt-6">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <BookingWidget slug={restaurant.slug} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Catering Tab */}
              {restaurant.accepts_catering && (
                <TabsContent value="catering" className="mt-6">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <CateringWidget slug={restaurant.slug} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Enhanced Reviews Tab */}
              <TabsContent value="reviews" className="space-y-4 mt-6">
                {reviews.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 p-12 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5" />
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="relative"
                      >
                        <div className="relative inline-block mb-4">
                          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                          <MessageSquare className="w-16 h-16 text-slate-600 mx-auto relative" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No reviews yet</h3>
                        <p className="text-slate-400">Be the first to share your dining experience!</p>
                      </motion.div>
                    </Card>
                  </motion.div>
                ) : (
                  reviews.map((review, idx) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-slate-700 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">
                                {review.reviewer_name || "Anonymous"}
                              </span>
                              {review.is_verified && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                                  Verified Diner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? "text-amber-500 fill-current" : "text-slate-600"
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.visit_date && (
                                <span>• Dined on {new Date(review.visit_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {review.title && (
                          <h4 className="font-semibold text-white mb-2">{review.title}</h4>
                        )}
                        
                        {review.review_text && (
                          <p className="text-slate-300 mb-3">{review.review_text}</p>
                        )}

                        {review.photo_urls && review.photo_urls.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {review.photo_urls.slice(0, 4).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Review photo"
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        )}

                        {review.restaurant_response && (
                          <div className="mt-4 pl-4 border-l-2 border-amber-500 bg-slate-900/50 p-3 rounded-r">
                            <p className="text-sm font-semibold text-amber-400 mb-1">Response from restaurant</p>
                            <p className="text-sm text-slate-300">{review.restaurant_response}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors group"
                          >
                            <ThumbsUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Helpful ({review.helpful_count || 0})</span>
                          </motion.button>
                        </div>
                      </CardContent>
                    </Card>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Contact Card */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-white mb-4">Contact & Location</h3>
                  
                  {restaurant.location_address && (
                    <div className="flex gap-3 text-slate-300">
                      <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p>{restaurant.location_address}</p>
                        <p>
                          {restaurant.location_city}, {restaurant.location_state} {restaurant.location_zip}
                        </p>
                        {restaurant.location_neighborhood && (
                          <p className="text-sm text-slate-400 mt-1">{restaurant.location_neighborhood}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {restaurant.contact_phone && (
                    <div className="flex gap-3 text-slate-300">
                      <Phone className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <a href={`tel:${restaurant.contact_phone}`} className="hover:text-amber-400">
                        {restaurant.contact_phone}
                      </a>
                    </div>
                  )}

                  {restaurant.website_url && (
                    <div className="flex gap-3 text-slate-300">
                      <Globe className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <a
                        href={restaurant.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 truncate"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  <Separator className="bg-slate-700" />

                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={() => setSelectedTab("book")}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Make a Reservation
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4">At a Glance</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Price Range</span>
                      <span className="font-semibold">{restaurant.price_range || "N/A"}</span>
                    </div>
                    {restaurant.dress_code && (
                      <div className="flex justify-between text-slate-300">
                        <span>Dress Code</span>
                        <span className="font-semibold">{restaurant.dress_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>Rating</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-current" />
                        {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : "New"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Similar places */}
        {similar.length > 0 && (
          <section className="mt-12 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold text-white">
                Similar places
              </h3>
              <span className="text-xs text-slate-400">
                Based on neighborhood, cuisine, and vibe
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((item, index) => (
                <RestaurantCard
                  key={item.id}
                  restaurant={item}
                  index={index}
                  isFavorite={isFavoriteGlobal(item.slug)}
                  onToggleFavorite={() => toggleFavoriteGlobal(item.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Claim profile CTA */}
        <section className="mt-12">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Own this restaurant? Claim your profile.
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Verify ownership to update details, photos, and connect your
                  Blunari reservations and catering tools.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-amber-500 text-sm font-semibold text-amber-300 hover:bg-amber-500 hover:text-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  onClick={() => navigate("/claim")}
                >
                  Claim this restaurant
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-medium text-slate-400 hover:text-amber-300"
                  onClick={() => navigate("/auth")}
                >
                  Sign in as restaurant
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Social Sharing Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 p-8">
            <CardContent>
              <h3 className="text-2xl font-bold text-white mb-4">Share this restaurant</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Love {restaurant.name}? Share it with your friends and family!
              </p>
              <div className="flex justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                      "_blank",
                    )
                  }
                  aria-label="Share on Facebook"
                  className="p-4 w-14 h-14 min-w-[56px] min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-lg hover:shadow-blue-600/50 touch-manipulation flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Facebook className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=Check%20out%20${encodeURIComponent(restaurant.name)}%20on%20Blunari!`,
                      "_blank",
                    )
                  }
                  aria-label="Share on Twitter"
                  className="p-4 w-14 h-14 min-w-[56px] min-h-[56px] bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-all shadow-lg hover:shadow-sky-500/50 touch-manipulation flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <Twitter className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  aria-label="Share on Instagram"
                  className="p-4 w-14 h-14 min-w-[56px] min-h-[56px] bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full transition-all shadow-lg hover:shadow-purple-600/50 touch-manipulation flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <Instagram className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    window.location.href = `mailto:?subject=Check out ${restaurant.name}&body=I found this amazing restaurant: ${window.location.href}`;
                  }}
                  aria-label="Share via email"
                  className="p-4 w-14 h-14 min-w-[56px] min-h-[56px] bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-all shadow-lg hover:shadow-slate-600/50 touch-manipulation flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <Mail className="w-5 h-5" />
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sticky Booking CTA (appears on scroll) */}
      {showBookingCTA && restaurant.accepts_reservations && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-current" />
                    <span className="text-lg font-bold text-white">
                      {restaurant.average_rating?.toFixed(1) || "New"}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">{restaurant.name}</h4>
                  <p className="text-slate-400 text-sm">
                    {restaurant.location_neighborhood || restaurant.location_city}
                  </p>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={() => setSelectedTab("book")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-lg hover:shadow-amber-500/50 transition-all h-14 min-h-[56px] px-6 text-base sm:text-lg touch-manipulation"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Now
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RestaurantProfilePage;
