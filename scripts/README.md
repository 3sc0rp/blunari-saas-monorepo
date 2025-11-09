# Blunari Scripts Directory

This directory contains utility scripts and database seed files for development and testing.

## Database Seed Scripts

### `seed-atlanta-restaurants.sql`

Populates the database with 15 premium Atlanta restaurants with realistic data for marketplace testing.

**Included Data:**
- 15 diverse restaurants across multiple cuisines
- Realistic descriptions and details
- Price ranges from $$ to $$$$
- Multiple Atlanta neighborhoods (Westside, Buckhead, Decatur, etc.)
- Amenities (parking, outdoor seating, WiFi, etc.)
- Dietary options (vegetarian, vegan, gluten-free, etc.)
- Rating and review counts
- Hero and gallery images (from Unsplash)
- Sample reviews for featured restaurants

**Restaurant Variety:**
1. Bacchanalia - Fine Dining Contemporary American (Featured)
2. The Optimist - Coastal Seafood & Oyster Bar (Featured)
3. Staplehouse - Innovative American Tasting Menu (Featured)
4. Gunshow - Interactive Dim Sum Style Dining
5. Bones Restaurant - Classic Steakhouse (Featured)
6. Miller Union - Modern Southern Farm-to-Table
7. Kimball House - Victorian Oyster Bar & Cocktails
8. Lazy Betty - Avant-Garde Tasting Menu (Featured)
9. Umi - Contemporary Japanese & Sushi
10. Marcel - French Steakhouse (Featured)
11. Grana - Italian Trattoria & Pizza
12. Atlas - Art Deco Contemporary American
13. Beetlecat - New England Seafood Shack
14. Kyma - Greek Seafood & Mediterranean
15. Superica - Tex-Mex & Margaritas

### How to Run Seed Script

**Option 1: Supabase SQL Editor (Recommended)**

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Click "New Query"
4. Copy the contents of `seed-atlanta-restaurants.sql`
5. Paste into the SQL editor
6. Click "Run" or press `Ctrl/Cmd + Enter`
7. Verify the data was inserted successfully

**Verification After Running:**
```sql
-- Check restaurant count
SELECT COUNT(*) FROM tenants WHERE is_published = true;
-- Should return: 15

-- Check featured restaurants
SELECT name, slug FROM tenants WHERE is_featured = true;
-- Should return: 6 restaurants

-- Check reviews
SELECT COUNT(*) FROM restaurant_reviews WHERE is_published = true;
-- Should return: 3 reviews
```

**Test Marketplace Features:**
- Visit landing page and click "Explore Restaurants"
- Test search, filters (cuisine, price, dietary, features)
- Test sorting (rating, price, name)
- Click restaurants to view profile pages
- Verify images, amenities, and reviews display correctly

---

## Widget Booking Direct API Test

The `test-widget-booking-direct.html` file provides a standalone test environment for the widget booking system.

### Usage

1. Open `test-widget-booking-direct.html` in your browser directly
2. Click "Run Complete Flow" or test each step individually
3. Watch the console logs and on-screen output

### What It Tests

1. **Token Creation** - Creates a widget authentication token
2. **Hold Creation** - Creates a booking hold with a time slot
3. **Reservation Confirmation** - Confirms the reservation and creates the booking

### Why This Helps

- **No Cache**: Bypasses React build cache completely
- **No Dependencies**: Pure HTML/JavaScript, runs anywhere
- **Detailed Logging**: Shows every API call and response
- **Field Validation**: Checks if all required fields are present

---

## Cleanup

To remove all sample restaurant data:

```sql
-- Delete reviews first (foreign key constraint)
DELETE FROM restaurant_reviews 
WHERE tenant_id IN (
  SELECT id FROM tenants 
  WHERE slug LIKE '%-atlanta' OR slug LIKE '%-decatur'
);

-- Delete restaurants
DELETE FROM tenants 
WHERE slug IN (
  'bacchanalia-atlanta', 'the-optimist-atlanta', 'staplehouse-atlanta',
  'gunshow-atlanta', 'bones-restaurant-atlanta', 'miller-union-atlanta',
  'kimball-house-decatur', 'lazy-betty-atlanta', 'umi-atlanta',
  'marcel-atlanta', 'grana-atlanta', 'atlas-atlanta',
  'beetlecat-atlanta', 'kyma-atlanta', 'superica-atlanta'
);
```

## Production Notes

⚠️ **Do NOT run seed scripts in production!** Development and testing only.

For production:
1. Replace Unsplash URLs with your own hosted images
2. Get proper licenses for any stock photos
3. Use real restaurant data from your clients
4. Implement proper image CDN (Cloudinary, Imgix, etc.)
5. Add proper SEO metadata
