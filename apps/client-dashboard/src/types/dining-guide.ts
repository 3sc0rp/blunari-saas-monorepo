import type React from "react";

// Core taxonomy for the Atlanta dining guide

export type Neighborhood =
  | "Midtown"
  | "Buckhead"
  | "Old Fourth Ward"
  | "Inman Park"
  | "West Midtown"
  | "Westside"
  | "Decatur"
  | "Candler Park"
  | "Dunwoody"
  | "Glenwood Park"
  | "Other";

export type PriceTier = "$" | "$$" | "$$$" | "$$$$";

export type Tag =
  | "Romantic"
  | "Fine dining"
  | "Casual"
  | "Rooftop"
  | "Late night"
  | "Brunch"
  | "Vegan-friendly"
  | "Halal-friendly"
  | "Cocktail bar"
  | "Group-friendly";

export interface GuideMenuItem {
  name: string;
  description?: string;
  price?: string;
  highlightTagline?: string;
}

export interface GuideMenuSection {
  id: string;
  title: string;
  description?: string;
  items: GuideMenuItem[];
}

export interface GuideRestaurantMeta {
  slug: string;
  neighborhood?: Neighborhood;
  blunariScoreOverride?: number;
  badge?: string;
  tagline?: string;
  tags?: Tag[];
  highlights?: string[];
  recommendedDishes?: GuideMenuItem[];
  menuSections?: GuideMenuSection[];
}

export interface BlunariListRestaurant {
  slug: string;
  commentary: string;
  highlightTags?: Tag[];
}

export interface BlunariList {
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string;
  accentColor?: string;
  restaurants: BlunariListRestaurant[];
}

// Shared restaurant view model used across the consumer-facing experience.
// This is intentionally a superset of the public fields from the `tenants` table,
// augmented with guide-specific fields like Blunari score and tags.

export interface GuideRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_types: string[] | null;
  price_range: PriceTier | null;
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

  dietary_options: string[] | null;
  dress_code: string | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  menu_url: string | null;

  is_featured: boolean | null;

  // Guide-specific fields
  blunari_score: number | null;
  // Normalised tags used for filtering and display
  tags: Tag[];
  meta?: GuideRestaurantMeta;
}

export type ReactChildren = {
  children?: React.ReactNode;
};


