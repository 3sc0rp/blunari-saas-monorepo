import React from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Star,
  Utensils,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/LazyImage";
import { getImagePlaceholder } from "@/utils/image-utils";
import type { GuideRestaurant, Tag } from "@/types/dining-guide";
import { useRestaurantPrefetch } from "@/hooks/usePrefetch";

interface RestaurantCardProps {
  restaurant: GuideRestaurant;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const renderTagBadge = (tag: Tag) => {
  switch (tag) {
    case "Fine dining":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Romantic":
      return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    case "Brunch":
      return "bg-pink-500/15 text-pink-200 border-pink-500/30";
    case "Group-friendly":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    case "Late night":
      return "bg-purple-500/15 text-purple-200 border-purple-500/30";
    default:
      return "bg-slate-800/60 text-slate-200 border-slate-700";
  }
};

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  index,
  isFavorite,
  onToggleFavorite,
}) => {
  const { handleMouseEnter, handleMouseLeave, handleClick } =
    useRestaurantPrefetch(restaurant.slug);

  const neighborhood =
    restaurant.location_neighborhood || restaurant.location_city;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.01 }}
      className="h-full"
    >
      <Card
        role="article"
        tabIndex={0}
        aria-label={`${restaurant.name} - ${neighborhood || 'Atlanta'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/70 hover:border-amber-500/70 transition-all duration-300 cursor-pointer group overflow-hidden h-full hover:shadow-2xl hover:shadow-amber-500/20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image with overlay & score */}
        <div className="relative aspect-video overflow-hidden">
          {restaurant.hero_image_url ? (
            <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out">
              <LazyImage
                src={restaurant.hero_image_url}
                alt={restaurant.name}
                className="w-full h-full"
                blurDataURL={getImagePlaceholder(restaurant.hero_image_url)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-indigo-500/20 flex items-center justify-center">
              <Utensils className="w-16 h-16 text-slate-700" />
            </div>
          )}

          {/* Blunari Score */}
          {restaurant.blunari_score != null && (
            <div className="absolute top-3 left-3">
              <div className="rounded-full bg-slate-950/80 border border-amber-500/60 px-3 py-1.5 flex items-center gap-2 shadow-lg shadow-black/40">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                  {restaurant.blunari_score}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs text-slate-300 font-semibold">
                    Blunari Score
                  </span>
                  {restaurant.average_rating != null && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {restaurant.average_rating.toFixed(1)}
                      {restaurant.total_reviews != null &&
                        restaurant.total_reviews > 0 && (
                          <span className="text-slate-500">
                            · {restaurant.total_reviews.toLocaleString()} reviews
                          </span>
                        )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Neighborhood badge */}
          {neighborhood && (
            <Badge className="absolute bottom-3 left-3 bg-slate-950/80 text-slate-100 border-slate-700/80 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-medium">
              <MapPin className="w-3 h-3 text-amber-400" />
              {neighborhood}
            </Badge>
          )}

          {/* Favorite toggle */}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={(event) => {
                // Prevent card navigation when toggling favorites
                event.preventDefault();
                event.stopPropagation();
                onToggleFavorite();
              }}
              className="absolute top-3 right-3 rounded-full bg-slate-950/80 border border-slate-700/80 p-2 text-slate-300 hover:text-rose-400 hover:border-rose-500/70 hover:bg-slate-900/90 transition-all duration-200"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>
          )}
        </div>

        <CardContent className="p-5 space-y-3">
          <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
            {restaurant.name}
          </h3>

          {restaurant.meta?.tagline || restaurant.description ? (
            <p className="text-sm text-slate-400 line-clamp-2">
              {restaurant.meta?.tagline ?? restaurant.description}
            </p>
          ) : null}

          {/* Info pills: cuisines, price, tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(restaurant.cuisine_types ?? [])
              .slice(0, 2)
              .map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant="outline"
                  className="text-[11px] border-slate-700 text-slate-200 bg-slate-900/60"
                >
                  {cuisine}
                </Badge>
              ))}
            {restaurant.price_range && (
              <Badge
                variant="outline"
                className="text-[11px] border-amber-500/60 text-amber-300 bg-amber-500/10"
              >
                {restaurant.price_range}
              </Badge>
            )}
            {restaurant.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-[11px] border ${renderTagBadge(tag)}`}
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Subtle footer with reservations / catering */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              {restaurant.accepts_reservations && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Reservations
                </span>
              )}
              {restaurant.accepts_catering && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Catering
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-[11px] text-amber-300 hover:text-black hover:bg-amber-400/90"
              onClick={(event) => {
                event.stopPropagation();
                handleClick();
              }}
            >
              View details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
