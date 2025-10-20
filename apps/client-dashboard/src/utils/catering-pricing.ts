/**
 * Catering Package Pricing Utilities
 * 
 * Handles price calculations for different pricing models:
 * - per_person: Price multiplied by guest count
 * - per_tray: Fixed price per tray, calculate tray count from guest count
 * - fixed: One-time flat fee regardless of guest count
 */

import { CateringPackage, CateringPricingType } from "@/types/catering";

export interface PriceCalculation {
  subtotal: number;        // Base price in dollars
  guestCount: number;      // Number of guests
  trayCount?: number;      // Number of trays (for per_tray pricing)
  pricePerUnit: number;    // Price per person or per tray in dollars
  pricingType: CateringPricingType;
  breakdown: string;       // Human-readable breakdown
}

/**
 * Calculate total price for a catering package based on guest count
 * 
 * @param pkg - Catering package with pricing information
 * @param guestCount - Number of guests for the event
 * @returns Price calculation details
 */
export function calculateCateringPrice(
  pkg: CateringPackage,
  guestCount: number
): PriceCalculation {
  const pricingType = pkg.pricing_type || 'per_person'; // Default to per_person for backward compatibility
  
  switch (pricingType) {
    case 'per_person': {
      const pricePerPerson = pkg.price_per_person / 100; // Convert cents to dollars
      const subtotal = pricePerPerson * guestCount;
      
      return {
        subtotal,
        guestCount,
        pricePerUnit: pricePerPerson,
        pricingType: 'per_person',
        breakdown: `$${pricePerPerson.toFixed(2)} × ${guestCount} guests = $${subtotal.toFixed(2)}`
      };
    }
    
    case 'per_tray': {
      if (!pkg.base_price || !pkg.serves_count) {
        throw new Error('Package missing base_price or serves_count for per_tray pricing');
      }
      
      const pricePerTray = pkg.base_price / 100; // Convert cents to dollars
      const servesCount = pkg.serves_count;
      
      // Calculate how many trays needed (round up)
      const trayCount = Math.ceil(guestCount / servesCount);
      const subtotal = pricePerTray * trayCount;
      
      return {
        subtotal,
        guestCount,
        trayCount,
        pricePerUnit: pricePerTray,
        pricingType: 'per_tray',
        breakdown: `$${pricePerTray.toFixed(2)} × ${trayCount} ${trayCount === 1 ? 'tray' : 'trays'} (${guestCount} guests) = $${subtotal.toFixed(2)}`
      };
    }
    
    case 'fixed': {
      if (!pkg.base_price) {
        throw new Error('Package missing base_price for fixed pricing');
      }
      
      const fixedPrice = pkg.base_price / 100; // Convert cents to dollars
      
      return {
        subtotal: fixedPrice,
        guestCount,
        pricePerUnit: fixedPrice,
        pricingType: 'fixed',
        breakdown: `Fixed price: $${fixedPrice.toFixed(2)}`
      };
    }
    
    default:
      throw new Error(`Unknown pricing type: ${pricingType}`);
  }
}

/**
 * Get the display price string for a package card
 * Shows either "$X.XX /person", "$X.XX /tray", or "$X.XX total"
 * 
 * @param pkg - Catering package
 * @returns Object with price value IN CENTS (for AnimatedPrice component) and unit text
 */
export function getPackageDisplayPrice(pkg: CateringPackage): { 
  value: number; 
  unit: string;
  description?: string;
} {
  const pricingType = pkg.pricing_type || 'per_person';
  
  switch (pricingType) {
    case 'per_person':
      return {
        value: pkg.price_per_person, // Return in cents (AnimatedPrice will divide by 100)
        unit: '/person'
      };
      
    case 'per_tray':
      if (!pkg.base_price) {
        throw new Error('Package missing base_price for per_tray pricing');
      }
      return {
        value: pkg.base_price, // Return in cents (AnimatedPrice will divide by 100)
        unit: '/tray',
        description: pkg.tray_description || (pkg.serves_count ? `Each tray serves ${pkg.serves_count} guests` : undefined)
      };
      
    case 'fixed':
      if (!pkg.base_price) {
        throw new Error('Package missing base_price for fixed pricing');
      }
      return {
        value: pkg.base_price, // Return in cents (AnimatedPrice will divide by 100)
        unit: 'total'
      };
      
    default:
      throw new Error(`Unknown pricing type: ${pricingType}`);
  }
}

/**
 * Validate guest count against package constraints
 * For per_tray pricing, also considers tray serving sizes
 * 
 * @param pkg - Catering package
 * @param guestCount - Number of guests to validate
 * @returns Error message if invalid, null if valid
 */
export function validateGuestCount(
  pkg: CateringPackage,
  guestCount: number
): string | null {
  if (guestCount < pkg.min_guests) {
    return `Minimum ${pkg.min_guests} guests required for this package`;
  }
  
  if (pkg.max_guests && guestCount > pkg.max_guests) {
    return `Maximum ${pkg.max_guests} guests allowed for this package`;
  }
  
  // For per_tray pricing, add helpful guidance
  if (pkg.pricing_type === 'per_tray' && pkg.serves_count) {
    const trayCount = Math.ceil(guestCount / pkg.serves_count);
    const optimalGuests = trayCount * pkg.serves_count;
    
    // If there's significant waste, warn the user
    if (guestCount < optimalGuests - pkg.serves_count / 2) {
      return null; // Valid but might suggest optimization in UI
    }
  }
  
  return null; // Valid
}

/**
 * Get estimated total price in cents (for database storage)
 * 
 * @param pkg - Catering package
 * @param guestCount - Number of guests
 * @returns Price in cents
 */
export function calculateTotalPriceCents(
  pkg: CateringPackage,
  guestCount: number
): number {
  const calculation = calculateCateringPrice(pkg, guestCount);
  return Math.round(calculation.subtotal * 100);
}
