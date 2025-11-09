-- Seed Script: 15 Premium Atlanta Restaurants with Realistic Data
-- This script populates the tenants table with sample restaurants for marketplace testing
-- Run this in Supabase SQL Editor

-- Note: This inserts into the tenants table which serves as restaurant profiles
-- Each restaurant is a tenant in the multi-tenant system

-- 1. Bacchanalia - Upscale Contemporary American
INSERT INTO tenants (
  name, slug, business_name, description, 
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, live_music, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published, is_featured
) VALUES (
  'Bacchanalia',
  'bacchanalia-atlanta',
  'Bacchanalia Restaurant Group LLC',
  'An Atlanta landmark for over 30 years, Bacchanalia offers an ever-changing four-course prix fixe menu featuring seasonal ingredients from our farm. Our contemporary American cuisine is complemented by an extensive wine list and impeccable service in an elegant industrial-chic setting.',
  ARRAY['Contemporary American', 'Fine Dining', 'Farm-to-Table'],
  '$$$$',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
    'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800'
  ],
  '1198 Howell Mill Road NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.8,
  342,
  1250,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  ARRAY['Vegetarian Options', 'Gluten-Free Options'],
  'Upscale Casual',
  true,
  true
);

-- 2. The Optimist - Coastal Seafood
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, live_music, wifi_available, wheelchair_accessible,
  dietary_options, is_published, is_featured
) VALUES (
  'The Optimist',
  'the-optimist-atlanta',
  'The Optimist Seafood LLC',
  'A vibrant oyster bar and seafood destination featuring the freshest catches prepared simply to let quality ingredients shine. Our lively atmosphere, extensive raw bar, and coastal-inspired cocktails make every visit a celebration of the sea.',
  ARRAY['Seafood', 'Oyster Bar', 'Contemporary American'],
  '$$$',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  ],
  '914 Howell Mill Road NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.6,
  428,
  2100,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  ARRAY['Gluten-Free Options', 'Dairy-Free Options'],
  true,
  true
);

-- 3. Staplehouse - Innovative American
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published, is_featured
) VALUES (
  'Staplehouse',
  'staplehouse-atlanta',
  'Staplehouse Restaurant Inc',
  'A community-driven restaurant serving inventive, locally-sourced tasting menus in an intimate setting. Every dish tells a story, and 100% of our profits support people in the service industry facing unexpected hardship.',
  ARRAY['Contemporary American', 'Tasting Menu', 'Farm-to-Table'],
  '$$$$',
  'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
  ],
  '541 Edgewood Avenue SE',
  'Atlanta',
  'GA',
  '30312',
  'Old Fourth Ward',
  4.9,
  215,
  890,
  true,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  ARRAY['Vegetarian Options', 'Vegan Options'],
  'Smart Casual',
  true,
  true
);

-- 4. Gunshow - Interactive Dining
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published, is_featured
) VALUES (
  'Gunshow',
  'gunshow-atlanta',
  'Gunshow Dining LLC',
  'An exhilarating dim sum-style experience where chefs roam the dining room presenting their latest creations. Choose what appeals to you in this interactive, theatrical approach to dining. Each night is a unique culinary adventure.',
  ARRAY['Contemporary American', 'Fusion', 'Dim Sum Style'],
  '$$$',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800'
  ],
  '924 Garrett Street',
  'Atlanta',
  'GA',
  '30316',
  'Glenwood Park',
  4.7,
  389,
  1680,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  ARRAY['Vegetarian Options', 'Gluten-Free Options'],
  true,
  false
);

-- 5. Bones Restaurant - Classic Steakhouse
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, live_music, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published, is_featured
) VALUES (
  'Bones Restaurant',
  'bones-restaurant-atlanta',
  'Bones Restaurant Inc',
  'Atlanta''s legendary steakhouse since 1979, Bones delivers perfectly aged prime beef, fresh seafood, and impeccable service. A favorite of business leaders and celebrities, we offer classic American steakhouse fare in an elegant yet comfortable atmosphere.',
  ARRAY['Steakhouse', 'American', 'Seafood'],
  '$$$$',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
  ],
  '3130 Piedmont Road NE',
  'Atlanta',
  'GA',
  '30305',
  'Buckhead',
  4.7,
  512,
  3200,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  ARRAY['Gluten-Free Options'],
  'Business Casual',
  true,
  true
);

-- 6. Miller Union - Southern Contemporary
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Miller Union',
  'miller-union-atlanta',
  'Miller Union Restaurant',
  'Modern Southern cuisine showcasing the best of Georgia''s farms and waters. Our thoughtfully crafted menu changes daily, featuring honest, ingredient-driven dishes in a warm, industrial-chic space with a welcoming neighborhood feel.',
  ARRAY['Southern', 'Contemporary American', 'Farm-to-Table'],
  '$$$',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800'
  ],
  '999 Brady Avenue NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.6,
  298,
  1450,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['Vegetarian Options', 'Gluten-Free Options'],
  true
);

-- 7. Kimball House - Oyster Bar & Craft Cocktails
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Kimball House',
  'kimball-house-decatur',
  'Kimball House LLC',
  'A stunning Victorian-era inspired oyster bar in historic Decatur. We specialize in pristine oysters, craft cocktails, and coastal cuisine served in a beautifully restored space with soaring ceilings and vintage charm.',
  ARRAY['Seafood', 'Oyster Bar', 'American'],
  '$$$',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
  ],
  '303 East Howard Avenue',
  'Decatur',
  'GA',
  '30030',
  'Decatur',
  4.5,
  385,
  1820,
  true,
  true,
  false,
  true,
  true,
  true,
  true,
  ARRAY['Gluten-Free Options', 'Dairy-Free Options'],
  true
);

-- 8. Lazy Betty - Avant-Garde Tasting Menu
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published, is_featured
) VALUES (
  'Lazy Betty',
  'lazy-betty-atlanta',
  'Lazy Betty Inc',
  'An intimate 24-seat restaurant offering a bold, ever-evolving tasting menu. Each course is a work of art, blending global influences with Southern ingredients. Our counter seating puts you in the middle of the culinary action.',
  ARRAY['Contemporary American', 'Tasting Menu', 'Fine Dining'],
  '$$$$',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800'
  ],
  '1530 DeKalb Avenue NE',
  'Atlanta',
  'GA',
  '30307',
  'Candler Park',
  4.9,
  167,
  645,
  true,
  false,
  true,
  false,
  true,
  true,
  ARRAY['Vegetarian Options', 'Vegan Options', 'Gluten-Free Options'],
  'Smart Casual',
  true,
  true
);

-- 9. Umi - Contemporary Japanese
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Umi',
  'umi-atlanta',
  'Umi Sushi Bar',
  'Sophisticated Japanese cuisine and exceptional sushi in an elegant Buckhead setting. Our master chefs craft traditional and innovative rolls using the freshest fish, flown in daily. The sleek, modern atmosphere is perfect for both intimate dinners and business meetings.',
  ARRAY['Japanese', 'Sushi', 'Asian'],
  '$$$',
  'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
  ],
  '3050 Peachtree Road NW',
  'Atlanta',
  'GA',
  '30305',
  'Buckhead',
  4.6,
  421,
  2350,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  ARRAY['Vegetarian Options', 'Gluten-Free Options'],
  true
);

-- 10. Marcel - French Steakhouse
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, live_music, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published, is_featured
) VALUES (
  'Marcel',
  'marcel-atlanta',
  'Marcel Steakhouse',
  'A Parisian-style steakhouse bringing French elegance to Westside. Our menu features prime cuts, classic French preparations, and an extensive wine list. The stunning Belle Époque-inspired interior transports you to the grand brasseries of Paris.',
  ARRAY['French', 'Steakhouse', 'Fine Dining'],
  '$$$$',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800'
  ],
  '1170 Howell Mill Road NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.7,
  298,
  1580,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['Gluten-Free Options'],
  'Upscale Casual',
  true,
  true
);

-- 11. Grana - Italian Trattoria
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Grana',
  'grana-atlanta',
  'Grana Italian Kitchen',
  'Rustic Italian cuisine with a focus on house-made pastas, wood-fired pizzas, and regional specialties. Our warm, family-friendly atmosphere and commitment to authentic flavors make every meal feel like a trip to Italy.',
  ARRAY['Italian', 'Pizza', 'Mediterranean'],
  '$$',
  'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
  ],
  '4505 Ashford Dunwoody Road NE',
  'Atlanta',
  'GA',
  '30346',
  'Dunwoody',
  4.4,
  567,
  3100,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['Vegetarian Options', 'Vegan Options', 'Gluten-Free Options'],
  true
);

-- 12. Atlas - Contemporary American
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, live_music, wifi_available, wheelchair_accessible,
  dietary_options, dress_code, is_published
) VALUES (
  'Atlas',
  'atlas-atlanta',
  'Atlas Restaurant Group',
  'A stunning art deco-inspired restaurant in the St. Regis Atlanta. Our globally-inspired American menu showcases premium ingredients with refined technique. Live music Friday and Saturday evenings adds to the sophisticated ambiance.',
  ARRAY['Contemporary American', 'Fine Dining', 'International'],
  '$$$$',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
  ],
  '88 West Paces Ferry Road NW',
  'Atlanta',
  'GA',
  '30305',
  'Buckhead',
  4.8,
  289,
  1340,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  true,
  ARRAY['Vegetarian Options', 'Gluten-Free Options'],
  'Business Casual',
  true
);

-- 13. Beetlecat - New England Seafood
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Beetlecat',
  'beetlecat-atlanta',
  'Beetlecat Seafood',
  'A lively New England-style seafood shack serving fresh catches, raw bar selections, and coastal classics. Our nautical-themed space and rooftop patio create a fun, casual atmosphere perfect for sharing plates and craft cocktails.',
  ARRAY['Seafood', 'American', 'Raw Bar'],
  '$$',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
  ],
  '1170 Howell Mill Road NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.5,
  489,
  2640,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['Gluten-Free Options', 'Dairy-Free Options'],
  true
);

-- 14. Kyma - Greek Seafood
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Kyma',
  'kyma-atlanta',
  'Kyma Greek Cuisine',
  'Authentic Greek cuisine focusing on the freshest seafood and Mediterranean flavors. Our menu celebrates the culinary traditions of Greece with modern presentations. The bright, airy dining room evokes the Greek islands.',
  ARRAY['Greek', 'Seafood', 'Mediterranean'],
  '$$$',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800'
  ],
  '3085 Piedmont Road NE',
  'Atlanta',
  'GA',
  '30305',
  'Buckhead',
  4.6,
  398,
  1890,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['Vegetarian Options', 'Vegan Options', 'Gluten-Free Options'],
  true
);

-- 15. Superica - Tex-Mex
INSERT INTO tenants (
  name, slug, business_name, description,
  cuisine_types, price_range,
  hero_image_url, gallery_images,
  location_address, location_city, location_state, location_zip, location_neighborhood,
  average_rating, total_reviews, total_bookings,
  accepts_reservations, accepts_catering,
  parking_available, outdoor_seating, private_dining, wifi_available, wheelchair_accessible,
  dietary_options, is_published
) VALUES (
  'Superica',
  'superica-atlanta',
  'Superica Tex-Mex',
  'High-energy Tex-Mex with bold flavors, creative margaritas, and a vibrant atmosphere. From our famous queso to sizzling fajitas, every dish is made from scratch using fresh ingredients. The perfect spot for groups and celebrations.',
  ARRAY['Mexican', 'Tex-Mex', 'Latin'],
  '$$',
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  ARRAY[
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
  ],
  '1105 Howell Mill Road NW',
  'Atlanta',
  'GA',
  '30318',
  'Westside',
  4.4,
  678,
  4200,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  ARRAY['Vegetarian Options', 'Vegan Options', 'Gluten-Free Options', 'Dairy-Free Options'],
  true
);

-- Add some sample reviews for featured restaurants
-- Reviews for Bacchanalia
INSERT INTO restaurant_reviews (
  tenant_id, rating, title, review_text, reviewer_name, is_verified, helpful_count, is_published
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'bacchanalia-atlanta'),
  5,
  'Exceptional Dining Experience',
  'From start to finish, Bacchanalia exceeded all expectations. Each course was perfectly executed with seasonal ingredients that sang. The service was attentive without being intrusive. A true gem in Atlanta''s dining scene.',
  'Sarah M.',
  true,
  24,
  true
);

-- Reviews for The Optimist
INSERT INTO restaurant_reviews (
  tenant_id, rating, title, review_text, reviewer_name, is_verified, helpful_count, is_published
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'the-optimist-atlanta'),
  5,
  'Best Oysters in Atlanta',
  'The raw bar is incredible - we tried 6 different oyster varieties and they were all impeccably fresh. The whole fish special was cooked to perfection. Vibrant atmosphere perfect for groups.',
  'Michael R.',
  true,
  31,
  true
);

-- Reviews for Lazy Betty
INSERT INTO restaurant_reviews (
  tenant_id, rating, title, review_text, reviewer_name, is_verified, helpful_count, is_published
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'lazy-betty-atlanta'),
  5,
  'Mind-Blowing Culinary Journey',
  'This was unlike any dining experience I''ve ever had. Each of the 15+ courses was a work of art, both visually and in flavor. The counter seating lets you watch the magic happen. Worth every penny.',
  'Jennifer L.',
  true,
  42,
  true
);

-- Note: Images are from Unsplash (royalty-free)
-- After running this script, verify the data in Supabase dashboard
-- Test the marketplace features: search, filters, sorting, and profile pages
