import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Star, MapPin, ChefHat, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/LazyImage';
import { getImagePlaceholder } from '@/utils/image-utils';
import { useRestaurantPrefetch } from '@/hooks/usePrefetch';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_types: string[] | null;
  price_range: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  hero_image_url: string | null;
  location_city: string | null;
  location_neighborhood: string | null;
  is_featured: boolean | null;
  accepts_reservations: boolean | null;
  accepts_catering: boolean | null;
  outdoor_seating: boolean | null;
  parking_available: boolean | null;
  dietary_options: string[] | null;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, index }) => {
  const { handleMouseEnter, handleMouseLeave, handleClick } = useRestaurantPrefetch(restaurant.slug);

  // Price range is already a string like "$", "$$", "$$$" from database
  // No need to format - just display as-is
  const formatPriceRange = (priceRange: string) => {
    return priceRange;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
    >
      <Card
        className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-amber-500 transition-all duration-300 cursor-pointer group overflow-hidden h-full hover:shadow-2xl hover:shadow-amber-500/20"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image with gradient overlay - Lazy loaded & prefetched */}
        <div className="relative h-56 overflow-hidden">
          {restaurant.hero_image_url ? (
            <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-500">
              <LazyImage
                src={restaurant.hero_image_url}
                alt={restaurant.name}
                className="w-full h-full"
                blurDataURL={getImagePlaceholder(restaurant.hero_image_url)}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
              <ChefHat className="w-20 h-20 text-slate-600 group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}
          
          {/* Featured badge */}
          {restaurant.is_featured && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute top-3 left-3"
            >
              <Badge className="bg-amber-500 text-black border-0 shadow-lg font-semibold">
                <TrendingUp className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </motion.div>
          )}

          {/* Quick action button (visible on hover) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>

        <CardContent className="p-5">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          
          {/* Description */}
          {restaurant.description && (
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
              {restaurant.description}
            </p>
          )}

          {/* Enhanced rating display */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800">
            {restaurant.average_rating ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(restaurant.average_rating!)
                          ? "fill-amber-500 text-amber-500"
                          : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-white">{restaurant.average_rating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-slate-500 text-sm">No reviews yet</span>
            )}
            {restaurant.total_reviews && restaurant.total_reviews > 0 && (
              <span className="text-slate-500 text-sm">({restaurant.total_reviews} reviews)</span>
            )}
          </div>

          {/* Cuisine types */}
          {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {restaurant.cuisine_types.slice(0, 3).map((cuisine) => (
                <Badge 
                  key={cuisine} 
                  variant="secondary" 
                  className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {cuisine}
                </Badge>
              ))}
              {restaurant.cuisine_types.length > 3 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-slate-800 text-slate-500"
                >
                  +{restaurant.cuisine_types.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Location & Price */}
          <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{restaurant.location_neighborhood || restaurant.location_city}</span>
            </div>
            {restaurant.price_range && (
              <span className="text-amber-500 font-bold">{formatPriceRange(restaurant.price_range)}</span>
            )}
          </div>

          {/* Action badges */}
          <div className="flex flex-wrap gap-2">
            {restaurant.accepts_reservations && (
              <Badge 
                variant="outline" 
                className="text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/5"
              >
                Reservations
              </Badge>
            )}
            {restaurant.accepts_catering && (
              <Badge 
                variant="outline" 
                className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/5"
              >
                Catering
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
