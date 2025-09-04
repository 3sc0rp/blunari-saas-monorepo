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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Flag,
  Reply,
  Share2,
  Filter,
  Search,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Settings,
  BarChart3,
  Target,
  Award,
  Zap,
  Bell,
  ExternalLink,
  Smartphone,
  Globe,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Camera,
  Bookmark,
  Users,
} from "lucide-react";

// Review and feedback interfaces
export interface CustomerReview {
  id: string;
  tenant_id: string;
  customer_id: string;
  order_id?: string;
  reservation_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_avatar?: string;
  rating: number; // 1-5 stars
  title?: string;
  comment: string;
  photos?: ReviewPhoto[];
  visit_date: string;
  review_date: string;
  service_rating: number;
  food_rating: number;
  atmosphere_rating: number;
  value_rating: number;
  status: ReviewStatus;
  response?: ReviewResponse;
  helpful_count: number;
  not_helpful_count: number;
  verified_purchase: boolean;
  source: ReviewSource;
  tags: string[];
  sentiment: ReviewSentiment;
  moderated: boolean;
  flagged: boolean;
  flag_reason?: string;
  visibility: ReviewVisibility;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewPhoto {
  id: string;
  url: string;
  caption?: string;
  uploaded_at: string;
}

export interface ReviewResponse {
  id: string;
  author_name: string;
  author_role: string;
  response_text: string;
  response_date: string;
  updated_at?: string;
}

export type ReviewStatus = 
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "archived";

export type ReviewSource = 
  | "website"
  | "google"
  | "yelp"
  | "facebook"
  | "tripadvisor"
  | "opentable"
  | "resy"
  | "email_survey"
  | "sms_survey"
  | "qr_code"
  | "in_app";

export type ReviewSentiment = 
  | "very_positive"
  | "positive" 
  | "neutral"
  | "negative"
  | "very_negative";

export type ReviewVisibility = 
  | "public"
  | "private"
  | "hidden";

export interface ReviewTemplate {
  id: string;
  name: string;
  type: "email" | "sms" | "in_app";
  subject?: string;
  message: string;
  trigger: ReviewTrigger;
  delay_hours: number;
  active: boolean;
  personalized: boolean;
  include_incentive: boolean;
  incentive_text?: string;
  created_at: string;
  updated_at: string;
}

export type ReviewTrigger = 
  | "order_completed"
  | "visit_completed"
  | "reservation_completed"
  | "manual"
  | "scheduled";

export interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
  total_responses: number;
  response_rate: number;
  sentiment_distribution: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  source_breakdown: Array<{ source: string; count: number; percentage: number }>;
  monthly_trend: Array<{ month: string; count: number; avg_rating: number }>;
  category_ratings: {
    service: number;
    food: number;
    atmosphere: number;
    value: number;
  };
  top_keywords: Array<{ keyword: string; mentions: number; sentiment: string }>;
  response_time_avg: number; // hours
  featured_reviews: number;
}

export interface ReviewPromptCampaign {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed";
  target_audience: "all_customers" | "recent_visitors" | "loyal_customers" | "first_time_visitors";
  channels: ReviewPromptChannel[];
  template_id: string;
  schedule: ReviewPromptSchedule;
  incentive?: ReviewIncentive;
  performance: CampaignPerformance;
  created_at: string;
  updated_at: string;
}

export interface ReviewPromptChannel {
  type: "email" | "sms" | "push" | "qr_code" | "staff_prompt";
  enabled: boolean;
  settings?: any;
}

export interface ReviewPromptSchedule {
  trigger_event: "visit_end" | "order_delivery" | "reservation_complete" | "manual";
  delay_hours: number;
  follow_up_enabled: boolean;
  follow_up_delay_hours?: number;
  max_attempts: number;
}

export interface ReviewIncentive {
  type: "discount" | "points" | "free_item" | "entry_contest";
  value: number;
  description: string;
  terms?: string;
}

export interface CampaignPerformance {
  emails_sent: number;
  emails_opened: number;
  reviews_received: number;
  conversion_rate: number;
}

// Mock data
const mockReviews: CustomerReview[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    order_id: "order-123",
    customer_name: "Sarah Johnson",
    customer_email: "sarah.johnson@email.com",
    customer_avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b6d3?w=150",
    rating: 5,
    title: "Absolutely Amazing Experience!",
    comment: "The food was incredible, service was outstanding, and the atmosphere was perfect for our anniversary dinner. The chef's special pasta was cooked to perfection, and our server Jessica was attentive without being intrusive. Highly recommend!",
    photos: [
      {
        id: "photo-1",
        url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
        caption: "Chef's special pasta",
        uploaded_at: "2024-09-04T20:30:00Z",
      }
    ],
    visit_date: "2024-09-04T19:00:00Z",
    review_date: "2024-09-04T21:15:00Z",
    service_rating: 5,
    food_rating: 5,
    atmosphere_rating: 5,
    value_rating: 4,
    status: "approved",
    response: {
      id: "response-1",
      author_name: "Chef Marco",
      author_role: "Head Chef",
      response_text: "Thank you so much for the wonderful review, Sarah! We're thrilled you enjoyed your anniversary dinner with us. Please come back soon!",
      response_date: "2024-09-05T10:00:00Z",
    },
    helpful_count: 12,
    not_helpful_count: 0,
    verified_purchase: true,
    source: "website",
    tags: ["anniversary", "pasta", "service", "atmosphere"],
    sentiment: "very_positive",
    moderated: true,
    flagged: false,
    visibility: "public",
    featured: true,
    created_at: "2024-09-04T21:15:00Z",
    updated_at: "2024-09-05T10:00:00Z",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    customer_id: "customer-2",
    customer_name: "Mike Chen",
    customer_email: "mike.chen@email.com",
    rating: 3,
    title: "Good food, slow service",
    comment: "The pizza was delicious and the ingredients tasted fresh. However, we waited almost 45 minutes for our order despite the restaurant not being very busy. The staff was friendly when they did check on us.",
    visit_date: "2024-09-03T18:30:00Z",
    review_date: "2024-09-03T22:00:00Z",
    service_rating: 2,
    food_rating: 4,
    atmosphere_rating: 3,
    value_rating: 3,
    status: "approved",
    helpful_count: 5,
    not_helpful_count: 1,
    verified_purchase: true,
    source: "google",
    tags: ["pizza", "slow service", "wait time"],
    sentiment: "neutral",
    moderated: true,
    flagged: false,
    visibility: "public",
    featured: false,
    created_at: "2024-09-03T22:00:00Z",
    updated_at: "2024-09-03T22:00:00Z",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    customer_id: "customer-3",
    customer_name: "Emma Wilson",
    rating: 4,
    title: "Great value for money",
    comment: "Really enjoyed our lunch here. The portions were generous and the prices very reasonable. The soup of the day was excellent. Only minor complaint is that it was a bit noisy during the lunch rush.",
    visit_date: "2024-09-02T12:15:00Z",
    review_date: "2024-09-02T15:30:00Z",
    service_rating: 4,
    food_rating: 4,
    atmosphere_rating: 3,
    value_rating: 5,
    status: "approved",
    helpful_count: 8,
    not_helpful_count: 0,
    verified_purchase: true,
    source: "yelp",
    tags: ["lunch", "value", "portions", "soup"],
    sentiment: "positive",
    moderated: true,
    flagged: false,
    visibility: "public",
    featured: false,
    created_at: "2024-09-02T15:30:00Z",
    updated_at: "2024-09-02T15:30:00Z",
  },
];

const mockAnalytics: ReviewAnalytics = {
  total_reviews: 247,
  average_rating: 4.3,
  total_responses: 189,
  response_rate: 76.5,
  sentiment_distribution: {
    very_positive: 35,
    positive: 42,
    neutral: 15,
    negative: 6,
    very_negative: 2,
  },
  rating_distribution: {
    1: 8,
    2: 12,
    3: 35,
    4: 89,
    5: 103,
  },
  source_breakdown: [
    { source: "Google", count: 98, percentage: 39.7 },
    { source: "Website", count: 67, percentage: 27.1 },
    { source: "Yelp", count: 45, percentage: 18.2 },
    { source: "Facebook", count: 23, percentage: 9.3 },
    { source: "TripAdvisor", count: 14, percentage: 5.7 },
  ],
  monthly_trend: [
    { month: "Jan", count: 18, avg_rating: 4.1 },
    { month: "Feb", count: 22, avg_rating: 4.2 },
    { month: "Mar", count: 28, avg_rating: 4.3 },
    { month: "Apr", count: 31, avg_rating: 4.4 },
    { month: "May", count: 29, avg_rating: 4.2 },
    { month: "Jun", count: 33, avg_rating: 4.5 },
    { month: "Jul", count: 38, avg_rating: 4.3 },
    { month: "Aug", count: 35, avg_rating: 4.4 },
    { month: "Sep", count: 13, avg_rating: 4.5 },
  ],
  category_ratings: {
    service: 4.2,
    food: 4.5,
    atmosphere: 4.1,
    value: 4.3,
  },
  top_keywords: [
    { keyword: "delicious", mentions: 45, sentiment: "positive" },
    { keyword: "slow", mentions: 23, sentiment: "negative" },
    { keyword: "friendly", mentions: 38, sentiment: "positive" },
    { keyword: "fresh", mentions: 29, sentiment: "positive" },
    { keyword: "expensive", mentions: 15, sentiment: "negative" },
  ],
  response_time_avg: 8.5,
  featured_reviews: 12,
};

const sentimentColors = {
  very_positive: "text-green-700 bg-green-100",
  positive: "text-green-600 bg-green-50",
  neutral: "text-yellow-600 bg-yellow-50",
  negative: "text-red-600 bg-red-50",
  very_negative: "text-red-700 bg-red-100",
};

const sourceIcons = {
  website: Globe,
  google: Search,
  yelp: Star,
  facebook: Users,
  tripadvisor: MapPin,
  opentable: Calendar,
  resy: Calendar,
  email_survey: Mail,
  sms_survey: Smartphone,
  qr_code: Camera,
  in_app: Smartphone,
};

const ReviewFeedbackSystem: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<CustomerReview[]>(mockReviews);
  const [analytics] = useState<ReviewAnalytics>(mockAnalytics);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("reviews");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [respondingToReview, setRespondingToReview] = useState<CustomerReview | null>(null);
  
  // Form states
  const [responseForm, setResponseForm] = useState({
    author_name: "",
    author_role: "",
    response_text: "",
  });

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const matchesSearch = 
        review.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || review.status === statusFilter;
      const matchesSource = sourceFilter === "all" || review.source === sourceFilter;
      const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
      
      return matchesSearch && matchesStatus && matchesSource && matchesRating;
    });
  }, [reviews, searchTerm, statusFilter, sourceFilter, ratingFilter]);

  const handleRespondToReview = (review: CustomerReview) => {
    setRespondingToReview(review);
    setResponseForm({
      author_name: tenant?.name || "Restaurant Team",
      author_role: "Management",
      response_text: "",
    });
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = async () => {
    if (!respondingToReview || !responseForm.response_text.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a response message",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const newResponse: ReviewResponse = {
        id: `response-${Date.now()}`,
        author_name: responseForm.author_name,
        author_role: responseForm.author_role,
        response_text: responseForm.response_text,
        response_date: new Date().toISOString(),
      };

      setReviews(prev => prev.map(review => 
        review.id === respondingToReview.id 
          ? { ...review, response: newResponse, updated_at: new Date().toISOString() }
          : review
      ));

      setShowResponseDialog(false);
      setRespondingToReview(null);
      setResponseForm({ author_name: "", author_role: "", response_text: "" });
      
      toast({
        title: "Success",
        description: "Response posted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = (reviewId: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { ...review, featured: !review.featured, updated_at: new Date().toISOString() }
        : review
    ));
  };

  const handleMarkHelpful = (reviewId: string, helpful: boolean) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { 
            ...review, 
            helpful_count: helpful ? review.helpful_count + 1 : review.helpful_count,
            not_helpful_count: !helpful ? review.not_helpful_count + 1 : review.not_helpful_count,
            updated_at: new Date().toISOString()
          }
        : review
    ));
  };

  const renderStars = (rating: number, size = "w-4 h-4") => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceIcon = (source: ReviewSource) => {
    const IconComponent = sourceIcons[source] || Globe;
    return <IconComponent className="w-4 h-4" />;
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
          <h1 className="text-3xl font-bold text-foreground">Review & Feedback System</h1>
          <p className="text-muted-foreground">
            Collect, manage, and respond to customer reviews across all platforms
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setShowCampaignDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Review Campaign
          </Button>
        </div>
      </motion.div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{analytics.total_reviews}</p>
                <p className="text-xs text-green-600">+23 this month</p>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{analytics.average_rating}</p>
                  <div className="flex items-center">
                    {renderStars(Math.round(analytics.average_rating))}
                  </div>
                </div>
              </div>
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{analytics.response_rate}%</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.total_responses} of {analytics.total_reviews}
                </p>
              </div>
              <Reply className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{analytics.response_time_avg}h</p>
                <p className="text-xs text-green-600">-2h from last month</p>
              </div>
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className={`${
                review.featured ? "border-yellow-300 bg-yellow-50" : ""
              } ${review.flagged ? "border-red-300 bg-red-50" : ""}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={review.customer_avatar} alt={review.customer_name} />
                          <AvatarFallback>
                            {review.customer_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{review.customer_name}</h4>
                            {review.verified_purchase && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {review.featured && (
                              <Badge className="bg-yellow-500 text-yellow-50 text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                              <span className="ml-1 font-medium">{review.rating}/5</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getSourceIcon(review.source)}
                              <span className="capitalize">{review.source}</span>
                            </div>
                            <span>{formatDate(review.review_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={sentimentColors[review.sentiment]}>
                          {review.sentiment.replace('_', ' ')}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="space-y-3">
                      {review.title && (
                        <h5 className="font-medium text-lg">{review.title}</h5>
                      )}
                      
                      <p className="text-foreground leading-relaxed">{review.comment}</p>

                      {review.photos && review.photos.length > 0 && (
                        <div className="flex gap-2">
                          {review.photos.map((photo) => (
                            <div key={photo.id} className="relative">
                              <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Category Ratings */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Service</p>
                          {renderStars(review.service_rating, "w-3 h-3")}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Food</p>
                          {renderStars(review.food_rating, "w-3 h-3")}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Atmosphere</p>
                          {renderStars(review.atmosphere_rating, "w-3 h-3")}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Value</p>
                          {renderStars(review.value_rating, "w-3 h-3")}
                        </div>
                      </div>
                    </div>

                    {/* Review Tags */}
                    {review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Restaurant Response */}
                    {review.response && (
                      <div className="border-l-4 border-primary pl-4 bg-primary/5 p-3 rounded-r-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Reply className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{review.response.author_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {review.response.author_role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(review.response.response_date)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{review.response.response_text}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Review Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkHelpful(review.id, true)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            {review.helpful_count}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkHelpful(review.id, false)}
                          >
                            <ThumbsDown className="w-4 h-4 mr-1" />
                            {review.not_helpful_count}
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeatured(review.id)}
                        >
                          <Star className={`w-4 h-4 mr-1 ${
                            review.featured ? "fill-yellow-400 text-yellow-400" : ""
                          }`} />
                          {review.featured ? "Unfeature" : "Feature"}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {!review.response && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRespondToReview(review)}
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            Respond
                          </Button>
                        )}
                        
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredReviews.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No reviews found matching your filters
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Analytics</h3>
              <p className="text-muted-foreground">
                Detailed insights into review trends, sentiment analysis, and performance metrics.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Campaigns</h3>
              <p className="text-muted-foreground">
                Automated campaigns to request reviews from customers via email, SMS, and in-app prompts.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Templates</h3>
              <p className="text-muted-foreground">
                Customizable templates for review requests and automated responses.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Settings</h3>
              <p className="text-muted-foreground">
                Configure review collection preferences, moderation settings, and platform integrations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Respond to {respondingToReview?.customer_name}'s review
            </DialogDescription>
          </DialogHeader>

          {respondingToReview && (
            <div className="space-y-4">
              {/* Review Preview */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{respondingToReview.customer_name}</span>
                    {renderStars(respondingToReview.rating)}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {respondingToReview.comment}
                  </p>
                </CardContent>
              </Card>

              {/* Response Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="author_name">Your Name</Label>
                    <Input
                      id="author_name"
                      value={responseForm.author_name}
                      onChange={(e) => setResponseForm(prev => ({ 
                        ...prev, 
                        author_name: e.target.value 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="author_role">Your Role</Label>
                    <Select
                      value={responseForm.author_role}
                      onValueChange={(value) => setResponseForm(prev => ({ 
                        ...prev, 
                        author_role: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Head Chef">Head Chef</SelectItem>
                        <SelectItem value="General Manager">General Manager</SelectItem>
                        <SelectItem value="Customer Service">Customer Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response_text">Response Message</Label>
                  <Textarea
                    id="response_text"
                    value={responseForm.response_text}
                    onChange={(e) => setResponseForm(prev => ({ 
                      ...prev, 
                      response_text: e.target.value 
                    }))}
                    placeholder="Thank you for taking the time to share your feedback..."
                    rows={6}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewFeedbackSystem;
