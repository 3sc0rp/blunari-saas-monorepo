import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Phone, Globe, Clock, Star, Heart, Share2, 
  Calendar, Users, Utensils, ChefHat, Image as ImageIcon, MessageSquare,
  Check, X, Wifi, ParkingCircle, Music, Accessibility, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import existing booking and catering widgets
import BookingWidget from "@/components/booking/BookingWidget";
import CateringWidget from "@/components/catering/CateringWidget";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_types: string[] | null;
  price_range: string | null;
  hero_image_url: string | null;
  gallery_images: string[] | null;
  location_address: string | null;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  location_neighborhood: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  total_bookings: number | null;
  accepts_reservations: boolean | null;
  accepts_catering: boolean | null;
  parking_available: boolean | null;
  outdoor_seating: boolean | null;
  private_dining: boolean | null;
  live_music: boolean | null;
  wifi_available: boolean | null;
  wheelchair_accessible: boolean | null;
  dress_code: string | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  menu_url: string | null;
  dietary_options: string[] | null;
}

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
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (slug) {
      fetchRestaurant();
      fetchReviews();
    }
  }, [slug]);

  const fetchRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      setRestaurant(data as Restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast({
        title: "Restaurant not found",
        description: "The restaurant you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/discover");
    } finally {
      setLoading(false);
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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "You can add it back anytime" : "Find it in your favorites list",
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
    ...(restaurant.gallery_images || [])
  ].filter(Boolean) as string[];

  const features = [
    { icon: ParkingCircle, label: "Parking", available: restaurant.parking_available },
    { icon: UtensilsCrossed, label: "Outdoor Seating", available: restaurant.outdoor_seating },
    { icon: Users, label: "Private Dining", available: restaurant.private_dining },
    { icon: Music, label: "Live Music", available: restaurant.live_music },
    { icon: Wifi, label: "WiFi", available: restaurant.wifi_available },
    { icon: Accessibility, label: "Accessible", available: restaurant.wheelchair_accessible },
  ].filter(f => f.available);

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
                onClick={() => navigate("/discover")}
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-slate-400 hover:text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                className={isFavorite ? "text-red-500" : "text-slate-400 hover:text-white"}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Gallery */}
      <section className="relative h-96 bg-slate-900">
        {allImages.length > 0 ? (
          <div className="relative h-full">
            <img
              src={allImages[selectedImage]}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            
            {/* Image thumbnails */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? "border-amber-500 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
            <ChefHat className="w-32 h-32 text-slate-700" />
          </div>
        )}
      </section>

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

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg">
                  <Star className="w-5 h-5 text-amber-500 fill-current" />
                  <span className="text-2xl font-bold text-white">
                    {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : "New"}
                  </span>
                  {restaurant.total_reviews && restaurant.total_reviews > 0 && (
                    <span className="text-slate-400">({restaurant.total_reviews} reviews)</span>
                  )}
                </div>
                {restaurant.total_bookings && restaurant.total_bookings > 0 && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{restaurant.total_bookings}+ bookings</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
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
                {features.length > 0 && features.slice(0, 2).map((feature) => (
                  <Badge key={feature.label} variant="secondary">
                    <feature.icon className="w-3 h-3 mr-1" />
                    {feature.label}
                  </Badge>
                ))}
              </div>
            </motion.div>

            <Separator className="bg-slate-800" />

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="bg-slate-800 w-full justify-start">
                <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                  Overview
                </TabsTrigger>
                {restaurant.accepts_reservations && (
                  <TabsTrigger value="book" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                    Book a Table
                  </TabsTrigger>
                )}
                {restaurant.accepts_catering && (
                  <TabsTrigger value="catering" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                    Catering
                  </TabsTrigger>
                )}
                <TabsTrigger value="reviews" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
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

                {/* Features */}
                {features.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Amenities</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {features.map((feature) => (
                          <div key={feature.label} className="flex items-center gap-2 text-slate-300">
                            <feature.icon className="w-5 h-5 text-amber-500" />
                            <span>{feature.label}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-4 mt-6">
                {reviews.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">No reviews yet</h3>
                    <p className="text-slate-400">Be the first to review this restaurant!</p>
                  </Card>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id} className="bg-slate-800 border-slate-700">
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

                        <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                          <button className="hover:text-white flex items-center gap-1">
                            <span>Helpful ({review.helpful_count || 0})</span>
                          </button>
                        </div>
                      </CardContent>
                    </Card>
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
      </div>
    </div>
  );
};

export default RestaurantProfilePage;
