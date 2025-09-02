export type PartnerTier = "Bronze" | "Silver" | "Gold";
export type PartnerStatus = "Active" | "Pending" | "Suspended" | "Inactive";
export type DemoStatus = "Active" | "Expired" | "Scheduled for Cleanup";
export type RestaurantTemplate =
  | "Italian"
  | "Fine Dining"
  | "Casual"
  | "Coffee Shop";

export interface AgencyPartner {
  id: string;
  name: string;
  email: string;
  company: string;
  tier: PartnerTier;
  status: PartnerStatus;
  joinedAt: string;
  lastActive: string;
  totalCommission: number;
  monthlyCommission: number;
  conversionRate: number;
  satisfactionScore: number;
  demoTenantsCreated: number;
  activeDemos: number;
  avatar?: string;
  phone?: string;
  website?: string;
}

export interface DemoTenant {
  id: string;
  name: string;
  template: RestaurantTemplate;
  createdAt: string;
  expiresAt: string;
  status: DemoStatus;
  partnerId: string;
  partnerName: string;
  demoUrl: string;
  views: number;
  bookings: number;
  lastAccessed?: string;
  clientEmail?: string;
  notes?: string;
}

export interface AgencyKit {
  id: string;
  name: string;
  version: string;
  description: string;
  downloadUrl: string;
  fileSize: string;
  lastUpdated: string;
  downloadCount: number;
  type: "WordPress Plugin" | "HTML Kit" | "Documentation" | "Branding Assets";
}

export interface IntegrationCode {
  type: "WordPress Shortcode" | "HTML Embed" | "Widget URL" | "API Integration";
  code: string;
  description: string;
  parameters?: Record<string, string>;
}

export interface RevenueAnalytics {
  period: string;
  totalRevenue: number;
  commissionPaid: number;
  averageCommissionRate: number;
  topPartners: Array<{
    partnerId: string;
    name: string;
    revenue: number;
    growth: number;
  }>;
  conversionMetrics: {
    demoToTrial: number;
    trialToPayment: number;
    overallConversion: number;
  };
}

export interface DemoTemplate {
  id: RestaurantTemplate;
  name: string;
  description: string;
  features: string[];
  previewImage: string;
  estimatedSetupTime: string;
  category: string;
  popularityScore: number;
}
