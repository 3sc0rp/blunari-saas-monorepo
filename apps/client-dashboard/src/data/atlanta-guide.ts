import {
  BlunariList,
  BlunariListRestaurant,
  GuideMenuSection,
  GuideRestaurant,
  GuideRestaurantMeta,
  Neighborhood,
  PriceTier,
  Tag,
} from "@/types/dining-guide";

// --- Guide Meta ----------------------------------------------------------------

export const ATLANTA_GUIDE_META: GuideRestaurantMeta[] = [
  {
    slug: "bacchanalia-atlanta",
    neighborhood: "Westside",
    blunariScoreOverride: 96,
    badge: "Editor’s Pick",
    tagline: "Seasonal tasting menus in an Atlanta institution.",
    tags: ["Fine dining", "Romantic", "Group-friendly"],
    highlights: [
      "Four-course seasonal tasting menu",
      "Ingredients from the restaurant’s own farm",
      "Sophisticated yet warm industrial-chic room",
    ],
    recommendedDishes: [
      {
        name: "Seasonal Tasting Menu",
        description: "Ever-evolving four-course progression showcasing peak local produce.",
      },
      {
        name: "Cheese Cart",
        description: "Rotating selection of artisanal cheeses with house-made accompaniments.",
      },
      {
        name: "Complimentary Petit Fours",
        description: "A polished finish to an already memorable evening.",
      },
    ],
  },
  {
    slug: "the-optimist-atlanta",
    neighborhood: "Westside",
    blunariScoreOverride: 93,
    badge: "Seafood Essential",
    tagline: "Oyster bar energy with polished coastal plates.",
    tags: ["Casual", "Cocktail bar", "Group-friendly"],
    highlights: [
      "Serious raw bar with rotating oyster selection",
      "Wood-fired fish and coastal classics",
      "Lively room perfect for groups",
    ],
    recommendedDishes: [
      {
        name: "Daily Oyster Selection",
        description: "Curated mix of East and West Coast oysters with classic accompaniments.",
      },
      {
        name: "Whole Fish Special",
        description: "Market fish roasted over wood, finished with bright coastal sauces.",
      },
    ],
  },
  {
    slug: "staplehouse-atlanta",
    neighborhood: "Old Fourth Ward",
    blunariScoreOverride: 97,
    badge: "Destination Dining",
    tagline: "Intimate tasting menus with heart and purpose.",
    tags: ["Fine dining", "Romantic"],
    highlights: [
      "Ever-changing tasting menu",
      "Profits support industry workers in need",
      "Small, quietly confident dining room",
    ],
  },
  {
    slug: "lazy-betty-atlanta",
    neighborhood: "Candler Park",
    blunariScoreOverride: 98,
    badge: "Chef’s Counter Experience",
    tagline: "Avant-garde tasting menu at an intimate counter.",
    tags: ["Fine dining", "Romantic"],
    highlights: [
      "Multi-course tasting with global influences",
      "Counter seating with a view into the kitchen",
      "Playful, highly technical plates",
    ],
  },
  {
    slug: "umi-atlanta",
    neighborhood: "Buckhead",
    blunariScoreOverride: 94,
    badge: "Sushi Landmark",
    tagline: "Buckhead’s sleek, always-buzzing sushi room.",
    tags: ["Romantic", "Cocktail bar"],
    highlights: [
      "Masterfully prepared nigiri and maki",
      "Premium fish flown in daily",
      "Dimly lit room with a polished crowd",
    ],
  },
  {
    slug: "bones-restaurant-atlanta",
    neighborhood: "Buckhead",
    blunariScoreOverride: 95,
    badge: "Classic Steakhouse",
    tagline: "Old-school Atlanta power steakhouse.",
    tags: ["Fine dining", "Group-friendly"],
    highlights: [
      "Aged prime steaks and classic sides",
      "Deep wine list and professional service",
      "A favorite for business dinners and celebrations since 1979",
    ],
  },
  {
    slug: "kimball-house-decatur",
    neighborhood: "Decatur",
    blunariScoreOverride: 92,
    badge: "Oyster & Cocktail Bar",
    tagline: "Victorian-era oyster bar with serious cocktails.",
    tags: ["Cocktail bar", "Casual", "Brunch"],
    highlights: [
      "Impressive raw bar program",
      "One of the city’s best cocktail lists",
      "Historic Decatur setting with vintage charm",
    ],
  },
  {
    slug: "marcel-atlanta",
    neighborhood: "Westside",
    blunariScoreOverride: 94,
    badge: "French Steakhouse",
    tagline: "Belle Époque glamour with serious steaks.",
    tags: ["Fine dining", "Romantic"],
    highlights: [
      "French-inspired steakhouse classics",
      "Old-world service and rich ambience",
      "Perfect for anniversaries and date nights",
    ],
  },
  {
    slug: "superica-atlanta",
    neighborhood: "Westside",
    blunariScoreOverride: 90,
    badge: "Tex-Mex Favorite",
    tagline: "High-energy Tex-Mex built for groups.",
    tags: ["Casual", "Group-friendly", "Brunch"],
    highlights: [
      "From-scratch Tex-Mex staples",
      "Margaritas and a lively patio scene",
      "Great for celebrations and big groups",
    ],
  },
];

// --- Curated Lists ------------------------------------------------------------

export const BLUNARI_LISTS: BlunariList[] = [
  {
    slug: "top-20-atlanta-restaurants-2025",
    title: "Top 20 Atlanta Restaurants – 2025",
    description: "Our definitive short list of Atlanta dining institutions and new classics.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80&auto=format&fit=crop",
    accentColor: "#6366F1",
    restaurants: [
      "bacchanalia-atlanta",
      "the-optimist-atlanta",
      "staplehouse-atlanta",
      "gunshow-atlanta",
      "bones-restaurant-atlanta",
      "miller-union-atlanta",
      "kimball-house-decatur",
      "lazy-betty-atlanta",
      "umi-atlanta",
      "marcel-atlanta",
      "grana-atlanta",
      "atlas-atlanta",
      "beetlecat-atlanta",
      "kyma-atlanta",
      "superica-atlanta",
    ].map<BlunariListRestaurant>((slug, index) => ({
      slug,
      commentary:
        index === 0
          ? "A benchmark tasting-menu experience that still feels personal."
          : "A must-visit stop on any serious Atlanta food crawl.",
    })),
  },
  {
    slug: "best-date-night-spots",
    title: "Best Date Night Spots",
    description: "Dim lights, polished service, and just the right amount of buzz.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80&auto=format&fit=crop",
    accentColor: "#EC4899",
    restaurants: [
      {
        slug: "bacchanalia-atlanta",
        commentary: "A special-occasion classic that still feels quietly exciting.",
        highlightTags: ["Romantic", "Fine dining"],
      },
      {
        slug: "lazy-betty-atlanta",
        commentary: "Chef’s counter intimacy, perfect for food-obsessed couples.",
        highlightTags: ["Fine dining", "Romantic"],
      },
      {
        slug: "umi-atlanta",
        commentary: "Sleek Buckhead sushi with an always-buzzy room.",
        highlightTags: ["Romantic", "Cocktail bar"],
      },
      {
        slug: "marcel-atlanta",
        commentary: "Old-world steakhouse glamour with serious steaks and martinis.",
        highlightTags: ["Romantic", "Fine dining"],
      },
    ],
  },
  {
    slug: "best-sushi-in-atlanta",
    title: "Best Sushi in Atlanta",
    description: "From pristine omakase counters to lively neighborhood sushi bars.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1200&q=80&auto=format&fit=crop",
    accentColor: "#22D3EE",
    restaurants: [
      {
        slug: "umi-atlanta",
        commentary: "The Buckhead standard-bearer for pristine fish and polished vibes.",
        highlightTags: ["Romantic"],
      },
      {
        slug: "the-optimist-atlanta",
        commentary: "Technically a seafood house, but the raw bar program is a must.",
        highlightTags: ["Cocktail bar"],
      },
      {
        slug: "kimball-house-decatur",
        commentary: "An oyster bar first, but seafood lovers are right at home here.",
      },
    ],
  },
  {
    slug: "hidden-gems-in-midtown-and-beyond",
    title: "Hidden Gems in Midtown & Beyond",
    description: "Neighborhood favorites that locals whisper about to friends.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1421622548261-c45bfe178854?w=1200&q=80&auto=format&fit=crop",
    accentColor: "#F97316",
    restaurants: [
      {
        slug: "miller-union-atlanta",
        commentary: "Modern Southern cooking that feels both comforting and precise.",
        highlightTags: ["Casual"],
      },
      {
        slug: "superica-atlanta",
        commentary: "High-energy Tex-Mex that’s secretly one of the most consistent kitchens in town.",
        highlightTags: ["Group-friendly", "Brunch"],
      },
      {
        slug: "beetlecat-atlanta",
        commentary: "Nautical-themed seafood hangout with a great rooftop when the weather cooperates.",
        highlightTags: ["Casual", "Cocktail bar"],
      },
    ],
  },
];

// --- Helpers -------------------------------------------------------------------

type TenantBase = Omit<GuideRestaurant, "blunari_score" | "tags" | "meta">;

const PRICE_ORDER: PriceTier[] = ["$", "$$", "$$$", "$$$$"];

function normaliseNeighborhood(value: string | null): Neighborhood {
  if (!value) return "Other";
  const normalized = value.toLowerCase();
  if (normalized.includes("midtown") && !normalized.includes("west")) return "Midtown";
  if (normalized.includes("west midtown") || normalized.includes("westside")) return "Westside";
  if (normalized.includes("buckhead")) return "Buckhead";
  if (normalized.includes("old fourth ward")) return "Old Fourth Ward";
  if (normalized.includes("inman park")) return "Inman Park";
  if (normalized.includes("decatur")) return "Decatur";
  if (normalized.includes("candler park")) return "Candler Park";
  if (normalized.includes("dunwoody")) return "Dunwoody";
  return "Other";
}

function deriveTags(tenant: TenantBase, meta?: GuideRestaurantMeta): Tag[] {
  const fromMeta = meta?.tags ?? [];
  const derived: Tag[] = [];

  if (tenant.price_range === "$$$" || tenant.price_range === "$$$$")
    derived.push("Fine dining");
  if (tenant.price_range === "$" || tenant.price_range === "$$")
    derived.push("Casual");

  const cuisines = tenant.cuisine_types ?? [];
  const description = tenant.description?.toLowerCase() ?? "";

  if (cuisines.some((c) => c.toLowerCase().includes("brunch")) || description.includes("brunch"))
    derived.push("Brunch");

  if (description.includes("late night")) derived.push("Late night");

  const dietary = tenant.dietary_options ?? [];
  if (dietary.some((d) => d.toLowerCase().includes("vegan"))) derived.push("Vegan-friendly");
  if (dietary.some((d) => d.toLowerCase().includes("halal"))) derived.push("Halal-friendly");

  // This is intentionally opinionated for the seeded Atlanta set
  if ((tenant.location_neighborhood ?? "").toLowerCase().includes("buckhead"))
    derived.push("Cocktail bar");

  return Array.from(new Set([...fromMeta, ...derived]));
}

function computeBlunariScore(tenant: TenantBase, meta?: GuideRestaurantMeta): number | null {
  if (meta?.blunariScoreOverride != null) return meta.blunariScoreOverride;
  if (tenant.average_rating == null) return null;
  // Map a 1–5 rating into a 80–100-ish Blunari score for display
  const raw = Math.round(tenant.average_rating * 20);
  return Math.max(80, Math.min(99, raw));
}

export function mapTenantToGuideRestaurant(tenant: TenantBase): GuideRestaurant {
  const meta = ATLANTA_GUIDE_META.find((m) => m.slug === tenant.slug);

  return {
    ...tenant,
    location_neighborhood:
      tenant.location_neighborhood ?? meta?.neighborhood ?? null,
    blunari_score: computeBlunariScore(tenant, meta),
    tags: deriveTags(tenant, meta),
    meta,
  };
}

export function mapTenantsToGuideRestaurants(tenants: TenantBase[]): GuideRestaurant[] {
  return tenants.map(mapTenantToGuideRestaurant);
}

export function sortGuideRestaurantsByFeatured(
  restaurants: GuideRestaurant[],
): GuideRestaurant[] {
  return [...restaurants].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;

    if (a.blunari_score != null && b.blunari_score != null) {
      return b.blunari_score - a.blunari_score;
    }

    if (a.price_range && b.price_range) {
      return (
        PRICE_ORDER.indexOf(b.price_range) - PRICE_ORDER.indexOf(a.price_range)
      );
    }

    return (b.total_bookings ?? 0) - (a.total_bookings ?? 0);
  });
}


