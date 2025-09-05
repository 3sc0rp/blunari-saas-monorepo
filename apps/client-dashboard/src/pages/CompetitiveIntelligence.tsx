import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Search,
  Eye,
  MapPin,
  Star,
  DollarSign,
  Users,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Lightbulb,
  Brain,
  Radar,
  Crosshair,
  Telescope,
  Binoculars,
  Compass,
  Flag,
  Shield,
  Gauge,
  Globe,
  Building,
  Phone,
  Mail,
  ExternalLink,
  Info,
  Settings,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileText,
} from "lucide-react";

// Competitive intelligence interfaces
export interface Competitor {
  id: string;
  name: string;
  business_type: "restaurant" | "cafe" | "fast_food" | "fine_dining" | "bakery" | "other";
  location: {
    address: string;
    latitude: number;
    longitude: number;
    distance_km: number;
  };
  contact: {
    phone?: string;
    website?: string;
    email?: string;
    social_media: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      yelp?: string;
    };
  };
  metrics: CompetitorMetrics;
  pricing: PricingIntelligence;
  menu_analysis: MenuAnalysis;
  marketing_analysis: MarketingAnalysis;
  customer_feedback: CustomerFeedbackAnalysis;
  last_updated: string;
  status: "active" | "inactive" | "closed" | "monitoring";
}

export interface CompetitorMetrics {
  overall_rating: number;
  total_reviews: number;
  monthly_review_growth: number;
  estimated_revenue: number;
  market_share_percentage: number;
  customer_satisfaction_score: number;
  service_quality_score: number;
  food_quality_score: number;
  value_for_money_score: number;
  atmosphere_score: number;
}

export interface PricingIntelligence {
  average_meal_price: number;
  price_range: {
    min: number;
    max: number;
  };
  popular_items: Array<{
    name: string;
    price: number;
    category: string;
    popularity_score: number;
  }>;
  pricing_strategy: "premium" | "competitive" | "budget" | "value";
  price_comparison_vs_market: number; // percentage difference
}

export interface MenuAnalysis {
  total_items: number;
  categories: Array<{
    name: string;
    item_count: number;
    avg_price: number;
  }>;
  cuisine_types: string[];
  dietary_options: {
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean;
    keto: boolean;
    halal: boolean;
  };
  unique_offerings: string[];
  menu_innovation_score: number;
}

export interface MarketingAnalysis {
  social_media_presence: {
    platform: string;
    followers: number;
    engagement_rate: number;
    posting_frequency: number;
    content_quality_score: number;
  }[];
  promotional_activities: {
    current_promotions: string[];
    seasonal_campaigns: string[];
    loyalty_program: boolean;
    delivery_partnerships: string[];
  };
  brand_positioning: string;
  marketing_budget_estimate: number;
  digital_presence_score: number;
}

export interface CustomerFeedbackAnalysis {
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  common_compliments: string[];
  common_complaints: string[];
  response_rate_to_reviews: number;
  trending_topics: Array<{
    topic: string;
    mentions: number;
    sentiment: "positive" | "negative" | "neutral";
  }>;
}

export interface MarketInsight {
  id: string;
  title: string;
  category: "opportunity" | "threat" | "trend" | "recommendation";
  description: string;
  impact_level: "high" | "medium" | "low";
  confidence_score: number;
  data_sources: string[];
  actionable_steps: string[];
  created_at: string;
  status: "new" | "reviewed" | "acted_upon" | "dismissed";
}

export interface CompetitiveReport {
  id: string;
  title: string;
  report_type: "market_overview" | "competitor_analysis" | "pricing_study" | "trend_analysis";
  generated_at: string;
  period_covered: {
    start_date: string;
    end_date: string;
  };
  key_findings: string[];
  recommendations: string[];
  market_position: {
    rank: number;
    total_competitors: number;
    percentile: number;
  };
  data: any;
}

// Mock data for competitive intelligence
const mockCompetitors: Competitor[] = [
  {
    id: "comp-1",
    name: "Bella Vista Restaurant",
    business_type: "fine_dining",
    location: {
      address: "123 Main St, Downtown",
      latitude: 40.7128,
      longitude: -74.0060,
      distance_km: 0.8
    },
    contact: {
      phone: "+1-555-0123",
      website: "https://bellavista.com",
      social_media: {
        facebook: "bellavista",
        instagram: "bellavista_restaurant",
        yelp: "bella-vista-restaurant"
      }
    },
    metrics: {
      overall_rating: 4.3,
      total_reviews: 892,
      monthly_review_growth: 12,
      estimated_revenue: 180000,
      market_share_percentage: 15.2,
      customer_satisfaction_score: 87,
      service_quality_score: 85,
      food_quality_score: 91,
      value_for_money_score: 78,
      atmosphere_score: 93
    },
    pricing: {
      average_meal_price: 45,
      price_range: { min: 28, max: 85 },
      popular_items: [
        { name: "Lobster Risotto", price: 38, category: "Main Course", popularity_score: 95 },
        { name: "Truffle Pasta", price: 32, category: "Main Course", popularity_score: 88 },
        { name: "Chocolate Soufflé", price: 14, category: "Dessert", popularity_score: 92 }
      ],
      pricing_strategy: "premium",
      price_comparison_vs_market: 15.5
    },
    menu_analysis: {
      total_items: 68,
      categories: [
        { name: "Appetizers", item_count: 12, avg_price: 16 },
        { name: "Main Courses", item_count: 24, avg_price: 42 },
        { name: "Desserts", item_count: 8, avg_price: 12 },
        { name: "Beverages", item_count: 24, avg_price: 8 }
      ],
      cuisine_types: ["Italian", "Mediterranean"],
      dietary_options: {
        vegetarian: true,
        vegan: true,
        gluten_free: true,
        keto: false,
        halal: false
      },
      unique_offerings: ["Truffle tasting menu", "Wine pairing dinners", "Chef's table experience"],
      menu_innovation_score: 78
    },
    marketing_analysis: {
      social_media_presence: [
        { platform: "Instagram", followers: 8500, engagement_rate: 4.2, posting_frequency: 5, content_quality_score: 85 },
        { platform: "Facebook", followers: 3200, engagement_rate: 2.8, posting_frequency: 3, content_quality_score: 78 }
      ],
      promotional_activities: {
        current_promotions: ["Happy Hour 4-6 PM", "Wine Wednesday 50% off bottles"],
        seasonal_campaigns: ["Valentine's Special Menu", "Summer Patio Dining"],
        loyalty_program: true,
        delivery_partnerships: ["DoorDash", "Uber Eats"]
      },
      brand_positioning: "Upscale casual dining with authentic Italian cuisine",
      marketing_budget_estimate: 12000,
      digital_presence_score: 82
    },
    customer_feedback: {
      sentiment_breakdown: { positive: 78, neutral: 15, negative: 7 },
      common_compliments: ["Excellent service", "Amazing atmosphere", "Fresh ingredients"],
      common_complaints: ["Long wait times", "Expensive", "Limited parking"],
      response_rate_to_reviews: 85,
      trending_topics: [
        { topic: "truffle dishes", mentions: 45, sentiment: "positive" },
        { topic: "wait times", mentions: 23, sentiment: "negative" },
        { topic: "atmosphere", mentions: 67, sentiment: "positive" }
      ]
    },
    last_updated: "2025-01-04T10:30:00Z",
    status: "active"
  },
  {
    id: "comp-2",
    name: "Street Eats Bistro",
    business_type: "fast_food",
    location: {
      address: "456 Oak Ave, Midtown",
      latitude: 40.7589,
      longitude: -73.9851,
      distance_km: 1.2
    },
    contact: {
      phone: "+1-555-0456",
      website: "https://streeteats.com",
      social_media: {
        instagram: "streeteats_bistro",
        twitter: "streeteats",
        yelp: "street-eats-bistro"
      }
    },
    metrics: {
      overall_rating: 4.1,
      total_reviews: 1240,
      monthly_review_growth: 28,
      estimated_revenue: 95000,
      market_share_percentage: 8.7,
      customer_satisfaction_score: 82,
      service_quality_score: 88,
      food_quality_score: 79,
      value_for_money_score: 92,
      atmosphere_score: 75
    },
    pricing: {
      average_meal_price: 18,
      price_range: { min: 8, max: 32 },
      popular_items: [
        { name: "Gourmet Burger", price: 16, category: "Main Course", popularity_score: 96 },
        { name: "Loaded Fries", price: 12, category: "Side", popularity_score: 89 },
        { name: "Craft Milkshake", price: 8, category: "Beverage", popularity_score: 85 }
      ],
      pricing_strategy: "value",
      price_comparison_vs_market: -8.2
    },
    menu_analysis: {
      total_items: 42,
      categories: [
        { name: "Burgers", item_count: 8, avg_price: 16 },
        { name: "Sandwiches", item_count: 6, avg_price: 14 },
        { name: "Sides", item_count: 12, avg_price: 8 },
        { name: "Beverages", item_count: 16, avg_price: 6 }
      ],
      cuisine_types: ["American", "Fusion"],
      dietary_options: {
        vegetarian: true,
        vegan: true,
        gluten_free: false,
        keto: true,
        halal: true
      },
      unique_offerings: ["Build-your-own burger", "Weekly chef specials", "Local craft beer"],
      menu_innovation_score: 85
    },
    marketing_analysis: {
      social_media_presence: [
        { platform: "Instagram", followers: 12500, engagement_rate: 6.8, posting_frequency: 8, content_quality_score: 92 },
        { platform: "TikTok", followers: 5800, engagement_rate: 12.5, posting_frequency: 12, content_quality_score: 88 }
      ],
      promotional_activities: {
        current_promotions: ["Buy 2 Get 1 Free Burgers", "Student Discount 20%"],
        seasonal_campaigns: ["Summer BBQ Series", "Back to School Special"],
        loyalty_program: true,
        delivery_partnerships: ["DoorDash", "Grubhub", "Uber Eats"]
      },
      brand_positioning: "Fast-casual with gourmet quality at affordable prices",
      marketing_budget_estimate: 8500,
      digital_presence_score: 94
    },
    customer_feedback: {
      sentiment_breakdown: { positive: 81, neutral: 12, negative: 7 },
      common_compliments: ["Great value", "Fast service", "Creative menu"],
      common_complaints: ["Limited seating", "Noisy environment", "Inconsistent quality"],
      response_rate_to_reviews: 92,
      trending_topics: [
        { topic: "value for money", mentions: 89, sentiment: "positive" },
        { topic: "speed of service", mentions: 56, sentiment: "positive" },
        { topic: "seating", mentions: 34, sentiment: "negative" }
      ]
    },
    last_updated: "2025-01-04T09:15:00Z",
    status: "active"
  }
];

const mockMarketInsights: MarketInsight[] = [
  {
    id: "insight-1",
    title: "Growing Demand for Plant-Based Options",
    category: "opportunity",
    description: "Analysis shows 34% increase in searches for vegan/vegetarian options in your area over the past 6 months.",
    impact_level: "high",
    confidence_score: 87,
    data_sources: ["Google Trends", "Social Media Analytics", "Customer Surveys"],
    actionable_steps: [
      "Expand plant-based menu section",
      "Partner with local vegan suppliers",
      "Launch targeted marketing campaign for health-conscious customers"
    ],
    created_at: "2025-01-04T08:30:00Z",
    status: "new"
  },
  {
    id: "insight-2",
    title: "Competitor Price Increase Opportunity",
    category: "opportunity",
    description: "Main competitor 'Bella Vista' increased prices by 12% last month, creating pricing advantage opportunity.",
    impact_level: "medium",
    confidence_score: 95,
    data_sources: ["Menu Analysis", "Price Monitoring", "Customer Feedback"],
    actionable_steps: [
      "Highlight value proposition in marketing",
      "Consider strategic price positioning",
      "Launch 'Better Value' campaign"
    ],
    created_at: "2025-01-03T14:20:00Z",
    status: "reviewed"
  },
  {
    id: "insight-3",
    title: "Rising Delivery Demand in Evening Hours",
    category: "trend",
    description: "Delivery orders in 7-9 PM slot increased 45% compared to last quarter across local market.",
    impact_level: "medium",
    confidence_score: 82,
    data_sources: ["Delivery Platform Data", "Industry Reports"],
    actionable_steps: [
      "Optimize kitchen workflow for evening rush",
      "Expand delivery-optimized menu items",
      "Increase delivery marketing during peak hours"
    ],
    created_at: "2025-01-02T16:45:00Z",
    status: "acted_upon"
  }
];

const CompetitiveIntelligence: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [competitors] = useState<Competitor[]>(mockCompetitors);
  const [marketInsights] = useState<MarketInsight[]>(mockMarketInsights);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("all");

  const filteredCompetitors = useMemo(() => {
    return competitors.filter(comp => {
      const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           comp.location.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedBusinessType === "all" || comp.business_type === selectedBusinessType;
      return matchesSearch && matchesType;
    });
  }, [competitors, searchQuery, selectedBusinessType]);

  const marketPosition = useMemo(() => {
    const totalCompetitors = competitors.length + 1; // +1 for our restaurant
    const ourEstimatedRating = 4.2; // Mock our rating
    const betterRated = competitors.filter(c => c.metrics.overall_rating > ourEstimatedRating).length;
    const rank = betterRated + 1;
    const percentile = Math.round(((totalCompetitors - rank) / totalCompetitors) * 100);
    
    return { rank, totalCompetitors, percentile };
  }, [competitors]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "closed": return "bg-red-100 text-red-800";
      case "monitoring": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "opportunity": return "bg-green-100 text-green-800";
      case "threat": return "bg-red-100 text-red-800";
      case "trend": return "bg-blue-100 text-blue-800";
      case "recommendation": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddCompetitor = () => {
    toast({
      title: "Add Competitor",
      description: "Competitor tracking feature will be implemented soon.",
    });
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Data Refreshed",
        description: "Competitive intelligence data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Competitive Intelligence</h1>
          <p className="text-muted-foreground">
            Monitor competitors, analyze market trends, and discover growth opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshData} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>

          <Button onClick={handleAddCompetitor}>
            <Plus className="w-4 h-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </motion.div>

      {/* Market Position Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Rank</p>
                <p className="text-2xl font-bold text-blue-600">#{marketPosition.rank}</p>
                <p className="text-xs text-blue-600">of {marketPosition.totalCompetitors} competitors</p>
              </div>
              <Target className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Percentile</p>
                <p className="text-2xl font-bold text-green-600">{marketPosition.percentile}%</p>
                <p className="text-xs text-green-600">Better than average</p>
              </div>
              <Award className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Insights</p>
                <p className="text-2xl font-bold text-purple-600">
                  {marketInsights.filter(i => i.status === "new").length}
                </p>
                <p className="text-xs text-purple-600">New opportunities</p>
              </div>
              <Lightbulb className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competitors Tracked</p>
                <p className="text-2xl font-bold text-orange-600">{competitors.length}</p>
                <p className="text-xs text-orange-600">Active monitoring</p>
              </div>
              <Radar className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="insights">Market Insights</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Market Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Market Share Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitors.slice(0, 3).map((competitor) => (
                    <div key={competitor.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{competitor.name}</span>
                        <span className="text-sm">{competitor.metrics.market_share_percentage}%</span>
                      </div>
                      <Progress value={competitor.metrics.market_share_percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{competitor.business_type}</span>
                        <span>{competitor.location.distance_km}km away</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Recent Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketInsights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getCategoryColor(insight.category)}>
                              {insight.category}
                            </Badge>
                            <span className={`text-xs font-medium ${getImpactColor(insight.impact_level)}`}>
                              {insight.impact_level} impact
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {insight.confidence_score}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Competitive Landscape */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-500" />
                Competitive Landscape
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{competitor.name}</h4>
                        <Badge className={getStatusColor(competitor.status)}>
                          {competitor.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold">{competitor.metrics.overall_rating}</span>
                        <span className="text-xs text-muted-foreground">
                          ({competitor.metrics.total_reviews} reviews)
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Avg. Price:</span>
                          <span className="font-medium">{formatCurrency(competitor.pricing.average_meal_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span>{competitor.location.distance_km}km</span>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setSelectedCompetitor(competitor);
                          setShowCompetitorDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search competitors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="fast_food">Fast Food</SelectItem>
                    <SelectItem value="fine_dining">Fine Dining</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Competitors List */}
          <div className="space-y-4">
            {filteredCompetitors.map((competitor) => (
              <Card key={competitor.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg">{competitor.name}</h3>
                        <Badge className={getStatusColor(competitor.status)}>
                          {competitor.status}
                        </Badge>
                        <Badge variant="outline">
                          {competitor.business_type.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Performance</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{competitor.metrics.overall_rating} ({competitor.metrics.total_reviews})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Satisfaction:</span>
                              <span>{competitor.metrics.customer_satisfaction_score}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Pricing</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg. Price:</span>
                              <span className="font-medium">{formatCurrency(competitor.pricing.average_meal_price)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Strategy:</span>
                              <span className="capitalize">{competitor.pricing.pricing_strategy}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Market</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Share:</span>
                              <span>{competitor.metrics.market_share_percentage}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Revenue:</span>
                              <span>{formatCurrency(competitor.metrics.estimated_revenue)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Location</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{competitor.location.distance_km}km away</span>
                            </div>
                            <p className="text-muted-foreground text-xs">{competitor.location.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedCompetitor(competitor);
                          setShowCompetitorDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI-Powered Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketInsights.map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(insight.category)}>
                          {insight.category}
                        </Badge>
                        <span className={`text-sm font-medium ${getImpactColor(insight.impact_level)}`}>
                          {insight.impact_level} impact
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {insight.confidence_score}% confidence
                        </span>
                      </div>
                      <Badge variant="outline">{insight.status}</Badge>
                    </div>
                    
                    <h4 className="font-semibold mb-2">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-1">Data Sources:</h5>
                        <div className="flex flex-wrap gap-1">
                          {insight.data_sources.map((source, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                        <ul className="space-y-1">
                          {insight.actionable_steps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button size="sm">Act on Insight</Button>
                      <Button size="sm" variant="outline">Mark as Reviewed</Button>
                      <Button size="sm" variant="outline">Dismiss</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Competitive Reports
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Monthly Market Analysis</h4>
                    <Badge>Auto-generated</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Comprehensive analysis of market trends, competitor performance, and opportunities for December 2024.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Generated on Jan 1, 2025</span>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Pricing Strategy Report</h4>
                    <Badge variant="secondary">Custom</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Analysis of competitor pricing strategies and recommendations for optimal pricing positioning.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Generated on Dec 28, 2024</span>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Competitor Detail Dialog */}
      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCompetitor?.name}</DialogTitle>
            <DialogDescription>
              Detailed competitive analysis and intelligence
            </DialogDescription>
          </DialogHeader>

          {selectedCompetitor && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Business Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{selectedCompetitor.business_type.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor(selectedCompetitor.status)}>
                        {selectedCompetitor.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span>{selectedCompetitor.location.distance_km}km</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Performance Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Overall Rating:</span>
                      <span className="font-medium">{selectedCompetitor.metrics.overall_rating}/5.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Reviews:</span>
                      <span>{selectedCompetitor.metrics.total_reviews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Share:</span>
                      <span>{selectedCompetitor.metrics.market_share_percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Analysis */}
              <div>
                <h4 className="font-semibold mb-3">Pricing Analysis</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Meal Price:</span>
                      <span className="font-medium">{formatCurrency(selectedCompetitor.pricing.average_meal_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price Range:</span>
                      <span>{formatCurrency(selectedCompetitor.pricing.price_range.min)} - {formatCurrency(selectedCompetitor.pricing.price_range.max)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Strategy:</span>
                      <span className="capitalize">{selectedCompetitor.pricing.pricing_strategy}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-sm mb-2">Popular Items</h5>
                    <div className="space-y-1">
                      {selectedCompetitor.pricing.popular_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-medium">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Analysis */}
              <div>
                <h4 className="font-semibold mb-3">Menu Analysis</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-sm mb-2">Categories</h5>
                    <div className="space-y-1">
                      {selectedCompetitor.menu_analysis.categories.map((category, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{category.name}</span>
                          <span>{category.item_count} items (avg. {formatCurrency(category.avg_price)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-sm mb-2">Unique Offerings</h5>
                    <ul className="space-y-1">
                      {selectedCompetitor.menu_analysis.unique_offerings.map((offering, index) => (
                        <li key={index} className="text-sm flex items-start gap-1">
                          <span>•</span>
                          {offering}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Customer Feedback */}
              <div>
                <h4 className="font-semibold mb-3">Customer Feedback Analysis</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-sm mb-2">Sentiment Breakdown</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Positive</span>
                        <span className="text-sm font-medium">{selectedCompetitor.customer_feedback.sentiment_breakdown.positive}%</span>
                      </div>
                      <Progress value={selectedCompetitor.customer_feedback.sentiment_breakdown.positive} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-sm mb-2">Common Feedback</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-green-600">Compliments:</span>
                        <ul className="text-xs">
                          {selectedCompetitor.customer_feedback.common_compliments.slice(0, 2).map((compliment, index) => (
                            <li key={index}>• {compliment}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-red-600">Complaints:</span>
                        <ul className="text-xs">
                          {selectedCompetitor.customer_feedback.common_complaints.slice(0, 2).map((complaint, index) => (
                            <li key={index}>• {complaint}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompetitorDialog(false)}>
              Close
            </Button>
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Website
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompetitiveIntelligence;
