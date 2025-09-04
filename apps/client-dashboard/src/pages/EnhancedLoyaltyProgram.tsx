import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Star,
  Gift,
  Crown,
  Trophy,
  Target,
  TrendingUp,
  Award,
  Sparkles,
  Heart,
  Flame,
  Zap,
  Diamond,
  Medal,
  ShieldCheck,
  Calendar,
  DollarSign,
  Percent,
  Users,
  BarChart3,
  Settings,
  Search,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  UserPlus,
  UserCheck,
  Coins,
  MapPin,
  Bell,
  Smartphone,
  Mail,
  Share2,
  QrCode,
} from "lucide-react";

// Enhanced loyalty program interfaces
export interface LoyaltyProgram {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  type: LoyaltyProgramType;
  status: "active" | "inactive" | "draft";
  point_rate: number; // points per dollar spent
  point_value: number; // dollar value per point
  welcome_bonus: number;
  birthday_bonus: number;
  referral_bonus: number;
  minimum_spend_threshold: number;
  tier_system_enabled: boolean;
  gamification_enabled: boolean;
  social_sharing_enabled: boolean;
  expiry_months?: number;
  max_points_per_transaction?: number;
  blackout_dates?: string[];
  terms_and_conditions: string;
  created_at: string;
  updated_at: string;
}

export type LoyaltyProgramType = 
  | "points"
  | "cashback"
  | "visits"
  | "spend_based"
  | "tier_based"
  | "hybrid";

export interface LoyaltyTier {
  id: string;
  program_id: string;
  name: string;
  minimum_points: number;
  minimum_spend?: number;
  minimum_visits?: number;
  color: string;
  icon: string;
  benefits: LoyaltyBenefit[];
  multiplier: number;
  upgrade_bonus: number;
  annual_fee?: number;
  exclusive_perks: string[];
}

export interface LoyaltyBenefit {
  id: string;
  type: BenefitType;
  name: string;
  description: string;
  value: number;
  value_type: "percentage" | "fixed" | "multiplier";
  applicable_items?: string[];
  min_purchase_amount?: number;
  max_discount_amount?: number;
  usage_limit_per_customer?: number;
  usage_limit_total?: number;
  valid_from?: string;
  valid_until?: string;
  terms?: string;
}

export type BenefitType = 
  | "discount"
  | "free_item"
  | "priority_booking"
  | "free_delivery"
  | "points_multiplier"
  | "birthday_treat"
  | "early_access"
  | "exclusive_menu"
  | "vip_support"
  | "custom";

export interface CustomerLoyalty {
  id: string;
  customer_id: string;
  program_id: string;
  tier_id?: string;
  points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_spent: number;
  visit_count: number;
  current_streak: number;
  longest_streak: number;
  enrollment_date: string;
  last_activity_date: string;
  tier_progress_percentage: number;
  next_tier_name?: string;
  points_to_next_tier?: number;
  achievements: LoyaltyAchievement[];
  preferences: LoyaltyPreferences;
}

export interface LoyaltyAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  points_awarded: number;
  achieved_at: string;
  category: "spending" | "visits" | "referrals" | "social" | "seasonal" | "special";
}

export interface LoyaltyPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  newsletter_subscription: boolean;
  birthday_rewards: boolean;
  promotional_offers: boolean;
  tier_updates: boolean;
  point_expiry_reminders: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  customer_loyalty_id: string;
  order_id?: string;
  transaction_type: "earn" | "redeem" | "expire" | "adjust" | "bonus";
  points_change: number;
  balance_after: number;
  description: string;
  reference_type?: "order" | "referral" | "birthday" | "achievement" | "manual";
  reference_id?: string;
  created_at: string;
  expires_at?: string;
}

export interface LoyaltyReward {
  id: string;
  program_id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: RewardType;
  reward_value: number;
  reward_data?: any; // JSON data for specific reward configurations
  category: string;
  availability: number; // -1 for unlimited
  usage_limit_per_customer: number;
  min_tier_required?: string;
  image_url?: string;
  terms_conditions?: string;
  active: boolean;
  featured: boolean;
  sort_order: number;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export type RewardType = 
  | "discount_percentage"
  | "discount_fixed"
  | "free_item"
  | "free_drink"
  | "free_appetizer"
  | "free_dessert"
  | "upgrade"
  | "gift_card"
  | "merchandise"
  | "experience"
  | "custom";

export interface LoyaltyAnalytics {
  total_members: number;
  active_members: number;
  new_members_this_month: number;
  member_retention_rate: number;
  average_points_per_member: number;
  total_points_issued: number;
  total_points_redeemed: number;
  redemption_rate: number;
  revenue_from_loyalty_members: number;
  average_order_value_members: number;
  average_order_value_non_members: number;
  top_tier_distribution: Array<{ tier: string; count: number; percentage: number }>;
  monthly_enrollment_trend: Array<{ month: string; enrollments: number }>;
  reward_popularity: Array<{ reward: string; redemptions: number }>;
  tier_progression_analytics: Array<{ tier: string; average_days_to_reach: number }>;
}

// Mock data
const mockLoyaltyProgram: LoyaltyProgram = {
  id: "1",
  tenant_id: "tenant-1",
  name: "Taste Rewards",
  description: "Earn points with every visit and unlock exclusive rewards",
  type: "hybrid",
  status: "active",
  point_rate: 1, // 1 point per $1 spent
  point_value: 0.01, // $0.01 per point
  welcome_bonus: 100,
  birthday_bonus: 250,
  referral_bonus: 500,
  minimum_spend_threshold: 10,
  tier_system_enabled: true,
  gamification_enabled: true,
  social_sharing_enabled: true,
  expiry_months: 12,
  max_points_per_transaction: 1000,
  terms_and_conditions: "Standard terms and conditions apply...",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-09-04T20:00:00Z",
};

const mockTiers: LoyaltyTier[] = [
  {
    id: "1",
    program_id: "1",
    name: "Food Explorer",
    minimum_points: 0,
    minimum_spend: 0,
    color: "#64748b",
    icon: "🍽️",
    benefits: [],
    multiplier: 1,
    upgrade_bonus: 0,
    exclusive_perks: ["Welcome bonus", "Birthday reward"],
  },
  {
    id: "2", 
    program_id: "1",
    name: "Flavor Enthusiast",
    minimum_points: 500,
    minimum_spend: 500,
    color: "#eab308",
    icon: "⭐",
    benefits: [],
    multiplier: 1.25,
    upgrade_bonus: 100,
    exclusive_perks: ["5% bonus points", "Priority support", "Special occasion discounts"],
  },
  {
    id: "3",
    program_id: "1", 
    name: "Culinary Connoisseur",
    minimum_points: 1500,
    minimum_spend: 1500,
    color: "#9333ea",
    icon: "👑",
    benefits: [],
    multiplier: 1.5,
    upgrade_bonus: 250,
    exclusive_perks: ["50% bonus points", "Complimentary appetizers", "Exclusive menu previews", "VIP events"],
  },
  {
    id: "4",
    program_id: "1",
    name: "Gourmet Legend",
    minimum_points: 5000,
    minimum_spend: 5000,
    color: "#dc2626",
    icon: "💎",
    benefits: [],
    multiplier: 2,
    upgrade_bonus: 500,
    exclusive_perks: ["Double points", "Chef's table access", "Custom menu experiences", "Annual dining credits"],
  },
];

const mockRewards: LoyaltyReward[] = [
  {
    id: "1",
    program_id: "1",
    name: "Free Appetizer",
    description: "Choose any appetizer from our menu",
    points_required: 250,
    reward_type: "free_appetizer",
    reward_value: 12,
    category: "Food",
    availability: -1,
    usage_limit_per_customer: 1,
    active: true,
    featured: true,
    sort_order: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-09-04T20:00:00Z",
  },
  {
    id: "2",
    program_id: "1",
    name: "15% Off Entire Order",
    description: "Save 15% on your next order",
    points_required: 500,
    reward_type: "discount_percentage",
    reward_value: 15,
    category: "Discount",
    availability: -1,
    usage_limit_per_customer: 2,
    active: true,
    featured: false,
    sort_order: 2,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-09-04T20:00:00Z",
  },
  {
    id: "3",
    program_id: "1",
    name: "Free Dessert",
    description: "Complimentary dessert of your choice",
    points_required: 300,
    reward_type: "free_dessert",
    reward_value: 8,
    category: "Food",
    availability: -1,
    usage_limit_per_customer: 1,
    active: true,
    featured: true,
    sort_order: 3,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-09-04T20:00:00Z",
  },
];

const mockCustomerLoyalty: CustomerLoyalty[] = [
  {
    id: "1",
    customer_id: "customer-1",
    program_id: "1",
    tier_id: "3",
    points_balance: 1250,
    total_points_earned: 2750,
    total_points_redeemed: 1500,
    total_spent: 2800,
    visit_count: 28,
    current_streak: 5,
    longest_streak: 12,
    enrollment_date: "2024-01-15T00:00:00Z",
    last_activity_date: "2024-09-04T19:30:00Z",
    tier_progress_percentage: 75,
    next_tier_name: "Gourmet Legend",
    points_to_next_tier: 3750,
    achievements: [
      {
        id: "1",
        name: "First Purchase",
        description: "Made your first purchase",
        icon: "🎉",
        badge_color: "#22c55e",
        points_awarded: 50,
        achieved_at: "2024-01-15T12:00:00Z",
        category: "special",
      },
      {
        id: "2",
        name: "Loyal Customer",
        description: "Completed 10 visits",
        icon: "❤️",
        badge_color: "#ef4444",
        points_awarded: 100,
        achieved_at: "2024-03-20T15:30:00Z",
        category: "visits",
      },
    ],
    preferences: {
      email_notifications: true,
      sms_notifications: true,
      push_notifications: false,
      newsletter_subscription: true,
      birthday_rewards: true,
      promotional_offers: true,
      tier_updates: true,
      point_expiry_reminders: true,
    },
  },
];

const mockAnalytics: LoyaltyAnalytics = {
  total_members: 1247,
  active_members: 892,
  new_members_this_month: 89,
  member_retention_rate: 78.5,
  average_points_per_member: 456,
  total_points_issued: 568432,
  total_points_redeemed: 234567,
  redemption_rate: 41.3,
  revenue_from_loyalty_members: 89567,
  average_order_value_members: 34.50,
  average_order_value_non_members: 28.75,
  top_tier_distribution: [
    { tier: "Food Explorer", count: 623, percentage: 49.9 },
    { tier: "Flavor Enthusiast", count: 387, percentage: 31.0 },
    { tier: "Culinary Connoisseur", count: 189, percentage: 15.2 },
    { tier: "Gourmet Legend", count: 48, percentage: 3.9 },
  ],
  monthly_enrollment_trend: [
    { month: "Jan", enrollments: 67 },
    { month: "Feb", enrollments: 89 },
    { month: "Mar", enrollments: 102 },
    { month: "Apr", enrollments: 95 },
    { month: "May", enrollments: 87 },
    { month: "Jun", enrollments: 76 },
    { month: "Jul", enrollments: 93 },
    { month: "Aug", enrollments: 89 },
    { month: "Sep", enrollments: 89 },
  ],
  reward_popularity: [
    { reward: "Free Appetizer", redemptions: 234 },
    { reward: "15% Off Order", redemptions: 187 },
    { reward: "Free Dessert", redemptions: 156 },
  ],
  tier_progression_analytics: [
    { tier: "Flavor Enthusiast", average_days_to_reach: 45 },
    { tier: "Culinary Connoisseur", average_days_to_reach: 120 },
    { tier: "Gourmet Legend", average_days_to_reach: 365 },
  ],
};

const EnhancedLoyaltyProgram: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [loyaltyProgram] = useState<LoyaltyProgram>(mockLoyaltyProgram);
  const [tiers] = useState<LoyaltyTier[]>(mockTiers);
  const [rewards, setRewards] = useState<LoyaltyReward[]>(mockRewards);
  const [customers] = useState<CustomerLoyalty[]>(mockCustomerLoyalty);
  const [analytics] = useState<LoyaltyAnalytics>(mockAnalytics);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  
  // Form states
  const [rewardForm, setRewardForm] = useState<Partial<LoyaltyReward>>({
    name: "",
    description: "",
    points_required: 100,
    reward_type: "discount_percentage",
    reward_value: 10,
    category: "Discount",
    availability: -1,
    usage_limit_per_customer: 1,
    active: true,
    featured: false,
  });

  const filteredRewards = useMemo(() => {
    return rewards.filter(reward =>
      reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rewards, searchTerm]);

  const getTierByPoints = (points: number): LoyaltyTier => {
    return tiers
      .filter(tier => points >= tier.minimum_points)
      .sort((a, b) => b.minimum_points - a.minimum_points)[0] || tiers[0];
  };

  const getNextTier = (currentTierPoints: number): LoyaltyTier | null => {
    return tiers
      .filter(tier => tier.minimum_points > currentTierPoints)
      .sort((a, b) => a.minimum_points - b.minimum_points)[0] || null;
  };

  const handleCreateReward = async () => {
    try {
      setIsLoading(true);
      
      if (!rewardForm.name || !rewardForm.description || !rewardForm.points_required) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const newReward: LoyaltyReward = {
        id: `reward-${Date.now()}`,
        program_id: loyaltyProgram.id,
        name: rewardForm.name!,
        description: rewardForm.description!,
        points_required: rewardForm.points_required || 100,
        reward_type: rewardForm.reward_type || "discount_percentage",
        reward_value: rewardForm.reward_value || 10,
        category: rewardForm.category || "Discount",
        availability: rewardForm.availability || -1,
        usage_limit_per_customer: rewardForm.usage_limit_per_customer || 1,
        active: rewardForm.active !== false,
        featured: rewardForm.featured || false,
        sort_order: rewards.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setRewards(prev => [...prev, newReward]);
      setShowRewardDialog(false);
      resetRewardForm();
      
      toast({
        title: "Success",
        description: "New reward created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reward",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetRewardForm = () => {
    setRewardForm({
      name: "",
      description: "",
      points_required: 100,
      reward_type: "discount_percentage",
      reward_value: 10,
      category: "Discount",
      availability: -1,
      usage_limit_per_customer: 1,
      active: true,
      featured: false,
    });
    setEditingReward(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
          <h1 className="text-3xl font-bold text-foreground">Enhanced Loyalty Program</h1>
          <p className="text-muted-foreground">
            Gamified rewards system with tier progression and achievements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Program Settings
          </Button>
          <Button onClick={() => setShowRewardDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Reward
          </Button>
        </div>
      </motion.div>

      {/* Program Status Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{loyaltyProgram.name}</h3>
                <p className="text-muted-foreground">{loyaltyProgram.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {loyaltyProgram.status}
                  </Badge>
                  <Badge variant="outline">
                    {loyaltyProgram.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {analytics.total_members.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <div className="text-sm text-green-600">
                +{analytics.new_members_this_month} this month
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="gamification">Gamification</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{analytics.active_members}</p>
                    <p className="text-xs text-green-600">
                      {formatPercentage((analytics.active_members / analytics.total_members) * 100)} of total
                    </p>
                  </div>
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Redemption Rate</p>
                    <p className="text-2xl font-bold">{formatPercentage(analytics.redemption_rate)}</p>
                    <p className="text-xs text-muted-foreground">Points redeemed vs issued</p>
                  </div>
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Member AOV</p>
                    <p className="text-2xl font-bold">{formatCurrency(analytics.average_order_value_members)}</p>
                    <p className="text-xs text-green-600">
                      vs {formatCurrency(analytics.average_order_value_non_members)} non-members
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Retention Rate</p>
                    <p className="text-2xl font-bold">{formatPercentage(analytics.member_retention_rate)}</p>
                    <p className="text-xs text-muted-foreground">30-day retention</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Program Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Program Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Point Rate</Label>
                    <p className="text-lg font-semibold">
                      {loyaltyProgram.point_rate} point per ${loyaltyProgram.point_rate}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Point Value</Label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(loyaltyProgram.point_value)} per point
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Welcome Bonus</Label>
                    <p className="text-lg font-semibold text-green-600">
                      {loyaltyProgram.welcome_bonus} pts
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Birthday Bonus</Label>
                    <p className="text-lg font-semibold text-purple-600">
                      {loyaltyProgram.birthday_bonus} pts
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Referral Bonus</Label>
                    <p className="text-lg font-semibold text-blue-600">
                      {loyaltyProgram.referral_bonus} pts
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Program Features</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Tier System</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Gamification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Social Sharing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>Points Expire in {loyaltyProgram.expiry_months}mo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tier Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.top_tier_distribution.map((tier, index) => (
                    <div key={tier.tier} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: tiers[index]?.color || '#64748b' }}
                          />
                          <span className="font-medium">{tier.tier}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{tier.count}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            ({tier.percentage}%)
                          </span>
                        </div>
                      </div>
                      <Progress value={tier.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          {/* Tier Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, index) => (
              <Card key={tier.id} className="relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: tier.color }}
                />
                <CardContent className="p-6">
                  <div className="text-center space-y-3">
                    <div className="text-3xl">{tier.icon}</div>
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tier.minimum_points}+ points
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">
                          {tier.multiplier}x points
                        </span>
                      </div>
                      
                      {tier.upgrade_bonus > 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <Gift className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            +{tier.upgrade_bonus} bonus points
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">
                        EXCLUSIVE PERKS
                      </Label>
                      <div className="space-y-1">
                        {tier.exclusive_perks.slice(0, 3).map((perk, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {perk}
                          </p>
                        ))}
                        {tier.exclusive_perks.length > 3 && (
                          <p className="text-xs text-muted-foreground font-medium">
                            +{tier.exclusive_perks.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          {/* Rewards Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search rewards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => (
              <Card key={reward.id} className={`relative ${
                reward.featured ? "border-yellow-300 bg-yellow-50" : ""
              }`}>
                {reward.featured && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-yellow-50">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{reward.name}</h4>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-lg text-primary">
                          {reward.points_required} pts
                        </span>
                      </div>
                      
                      <Badge variant="outline">
                        {reward.category}
                      </Badge>
                    </div>

                    {reward.reward_type.includes('discount') && (
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <span className="text-green-700 font-semibold">
                          {reward.reward_type === 'discount_percentage' 
                            ? `${reward.reward_value}% Off`
                            : formatCurrency(reward.reward_value) + ' Off'
                          }
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Limit: {reward.usage_limit_per_customer === -1 
                          ? 'Unlimited' 
                          : `${reward.usage_limit_per_customer} per customer`
                        }
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {reward.active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span>{reward.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Member Management</h3>
              <p className="text-muted-foreground">
                View and manage loyalty program members, their tier status, and point balances.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Detailed insights into program performance, member behavior, and reward effectiveness.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamification" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gamification Features</h3>
              <p className="text-muted-foreground">
                Configure achievements, challenges, and social features to boost engagement.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Reward Dialog */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Reward</DialogTitle>
            <DialogDescription>
              Add a new reward to your loyalty program
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward_name">Reward Name *</Label>
                <Input
                  id="reward_name"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Free Appetizer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points_required">Points Required *</Label>
                <Input
                  id="points_required"
                  type="number"
                  min="1"
                  value={rewardForm.points_required}
                  onChange={(e) => setRewardForm(prev => ({ 
                    ...prev, 
                    points_required: parseInt(e.target.value) || 100
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={rewardForm.description}
                onChange={(e) => setRewardForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the reward and any terms..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward_type">Reward Type</Label>
                <Select
                  value={rewardForm.reward_type}
                  onValueChange={(value) => setRewardForm(prev => ({ 
                    ...prev, 
                    reward_type: value as RewardType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_percentage">% Discount</SelectItem>
                    <SelectItem value="discount_fixed">$ Off</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                    <SelectItem value="free_drink">Free Drink</SelectItem>
                    <SelectItem value="free_appetizer">Free Appetizer</SelectItem>
                    <SelectItem value="free_dessert">Free Dessert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward_value">Value</Label>
                <Input
                  id="reward_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rewardForm.reward_value}
                  onChange={(e) => setRewardForm(prev => ({ 
                    ...prev, 
                    reward_value: parseFloat(e.target.value) || 0
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={rewardForm.category}
                  onValueChange={(value) => setRewardForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Drink">Drink</SelectItem>
                    <SelectItem value="Discount">Discount</SelectItem>
                    <SelectItem value="Experience">Experience</SelectItem>
                    <SelectItem value="Merchandise">Merchandise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usage_limit">Usage Limit Per Customer</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={rewardForm.usage_limit_per_customer}
                  onChange={(e) => setRewardForm(prev => ({ 
                    ...prev, 
                    usage_limit_per_customer: parseInt(e.target.value) || 1
                  }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rewardForm.active}
                    onCheckedChange={(checked) => setRewardForm(prev => ({ 
                      ...prev, 
                      active: checked 
                    }))}
                  />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rewardForm.featured}
                    onCheckedChange={(checked) => setRewardForm(prev => ({ 
                      ...prev, 
                      featured: checked 
                    }))}
                  />
                  <span className="text-sm font-medium">Featured</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReward}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedLoyaltyProgram;
