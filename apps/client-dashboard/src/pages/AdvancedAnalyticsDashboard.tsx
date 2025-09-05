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
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Calendar,
  Star,
  Target,
  Zap,
  Trophy,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  RefreshCw,
  Settings,
  Eye,
  Share2,
  Printer,
  FileText,
  PieChart,
  LineChart,
  Activity,
  Percent,
  Calculator,
  CreditCard,
  Banknote,
  Coins,
  Wallet,
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Minus,
  Equal,
  X,
  Check,
  Info,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";

// Advanced analytics interfaces
export interface AnalyticsPeriod {
  label: string;
  value: string;
  days: number;
}

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  previous_value: number;
  change_percentage: number;
  trend: "up" | "down" | "stable";
  format: "currency" | "number" | "percentage" | "time";
  category: "revenue" | "operations" | "customer" | "efficiency";
  icon: any;
  color: string;
  target?: number;
  unit?: string;
}

export interface RevenueAnalytics {
  total_revenue: number;
  revenue_growth: number;
  revenue_by_channel: Array<{
    channel: string;
    amount: number;
    percentage: number;
    growth: number;
  }>;
  revenue_by_time: Array<{
    date: string;
    revenue: number;
    orders: number;
    average_order_value: number;
  }>;
  top_revenue_items: Array<{
    item_name: string;
    quantity_sold: number;
    revenue: number;
    profit_margin: number;
  }>;
  hourly_revenue: Array<{
    hour: number;
    revenue: number;
    orders: number;
  }>;
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customer_retention_rate: number;
  lifetime_value: number;
  acquisition_cost: number;
  churn_rate: number;
  satisfaction_score: number;
  loyalty_members: number;
  customer_segments: Array<{
    segment: string;
    count: number;
    percentage: number;
    avg_order_value: number;
  }>;
  cohort_analysis: Array<{
    cohort: string;
    size: number;
    retention_rates: number[];
  }>;
}

export interface OperationalAnalytics {
  orders_completed: number;
  average_prep_time: number;
  kitchen_efficiency: number;
  table_turnover_rate: number;
  staff_productivity: number;
  inventory_turnover: number;
  waste_percentage: number;
  delivery_success_rate: number;
  peak_hours: Array<{
    hour: number;
    order_count: number;
    efficiency_score: number;
  }>;
  staff_performance: Array<{
    staff_id: string;
    name: string;
    orders_served: number;
    customer_rating: number;
    efficiency_score: number;
  }>;
}

export interface FinancialMetrics {
  gross_revenue: number;
  net_revenue: number;
  total_costs: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  operating_expenses: number;
  cost_of_goods_sold: number;
  labor_costs: number;
  overhead_costs: number;
  tax_amount: number;
  cash_flow: number;
  break_even_point: number;
  roi: number;
}

export interface PredictiveAnalytics {
  revenue_forecast: Array<{
    date: string;
    predicted_revenue: number;
    confidence_interval: [number, number];
  }>;
  demand_forecast: Array<{
    item_name: string;
    predicted_demand: number;
    optimal_inventory: number;
  }>;
  customer_behavior_trends: Array<{
    trend: string;
    impact: "positive" | "negative" | "neutral";
    confidence: number;
    recommendation: string;
  }>;
  seasonal_patterns: Array<{
    period: string;
    expected_increase: number;
    preparation_recommendations: string[];
  }>;
}

export interface CompetitiveAnalysis {
  market_share: number;
  competitor_pricing: Array<{
    competitor: string;
    avg_price: number;
    rating: number;
    market_position: string;
  }>;
  price_positioning: "premium" | "competitive" | "budget";
  review_comparison: Array<{
    platform: string;
    our_rating: number;
    competitor_avg: number;
    review_count: number;
  }>;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: "revenue" | "customer" | "operational" | "financial" | "custom";
  period: AnalyticsPeriod;
  generated_at: string;
  data: any;
  insights: string[];
  recommendations: string[];
  export_formats: string[];
}

// Mock data for advanced analytics
const analyticsPeriods: AnalyticsPeriod[] = [
  { label: "Today", value: "today", days: 1 },
  { label: "Yesterday", value: "yesterday", days: 1 },
  { label: "Last 7 Days", value: "7d", days: 7 },
  { label: "Last 30 Days", value: "30d", days: 30 },
  { label: "Last 90 Days", value: "90d", days: 90 },
  { label: "This Month", value: "month", days: 30 },
  { label: "Last Month", value: "last_month", days: 30 },
  { label: "This Quarter", value: "quarter", days: 90 },
  { label: "This Year", value: "year", days: 365 },
  { label: "Custom Range", value: "custom", days: 0 },
];

const mockKPIMetrics: KPIMetric[] = [
  {
    id: "total_revenue",
    name: "Total Revenue",
    value: 127580,
    previous_value: 119200,
    change_percentage: 7.03,
    trend: "up",
    format: "currency",
    category: "revenue",
    icon: DollarSign,
    color: "#10b981",
    target: 150000,
  },
  {
    id: "orders_count",
    name: "Total Orders",
    value: 2847,
    previous_value: 2654,
    change_percentage: 7.27,
    trend: "up",
    format: "number",
    category: "operations",
    icon: BarChart3,
    color: "#3b82f6",
  },
  {
    id: "avg_order_value",
    name: "Average Order Value",
    value: 44.82,
    previous_value: 44.91,
    change_percentage: -0.20,
    trend: "down",
    format: "currency",
    category: "revenue",
    icon: Calculator,
    color: "#f59e0b",
  },
  {
    id: "customer_satisfaction",
    name: "Customer Satisfaction",
    value: 4.7,
    previous_value: 4.5,
    change_percentage: 4.44,
    trend: "up",
    format: "number",
    category: "customer",
    icon: Star,
    color: "#8b5cf6",
    unit: "/5",
  },
  {
    id: "table_turnover",
    name: "Table Turnover Rate",
    value: 3.2,
    previous_value: 2.9,
    change_percentage: 10.34,
    trend: "up",
    format: "number",
    category: "efficiency",
    icon: RefreshCw,
    color: "#06b6d4",
    unit: " turns/day",
  },
  {
    id: "profit_margin",
    name: "Profit Margin",
    value: 18.5,
    previous_value: 16.8,
    change_percentage: 10.12,
    trend: "up",
    format: "percentage",
    category: "revenue",
    icon: TrendingUp,
    color: "#10b981",
    target: 25,
  },
  {
    id: "customer_retention",
    name: "Customer Retention",
    value: 78.5,
    previous_value: 75.2,
    change_percentage: 4.39,
    trend: "up",
    format: "percentage",
    category: "customer",
    icon: Users,
    color: "#ef4444",
    target: 85,
  },
  {
    id: "avg_prep_time",
    name: "Avg Prep Time",
    value: 18.5,
    previous_value: 21.2,
    change_percentage: -12.74,
    trend: "up",
    format: "time",
    category: "efficiency",
    icon: Clock,
    color: "#f97316",
    unit: " min",
  },
];

const mockRevenueAnalytics: RevenueAnalytics = {
  total_revenue: 127580,
  revenue_growth: 7.03,
  revenue_by_channel: [
    { channel: "Dine-in", amount: 76548, percentage: 60, growth: 5.2 },
    { channel: "Takeaway", amount: 31895, percentage: 25, growth: 12.8 },
    { channel: "Delivery", amount: 19137, percentage: 15, growth: 8.4 },
  ],
  revenue_by_time: [
    { date: "2025-08-28", revenue: 4250, orders: 95, average_order_value: 44.74 },
    { date: "2025-08-29", revenue: 4680, orders: 102, average_order_value: 45.88 },
    { date: "2025-08-30", revenue: 5120, orders: 118, average_order_value: 43.39 },
    { date: "2025-08-31", revenue: 4890, orders: 108, average_order_value: 45.28 },
    { date: "2025-09-01", revenue: 5350, orders: 125, average_order_value: 42.80 },
    { date: "2025-09-02", revenue: 5890, orders: 135, average_order_value: 43.63 },
    { date: "2025-09-03", revenue: 6120, orders: 142, average_order_value: 43.10 },
  ],
  top_revenue_items: [
    { item_name: "Signature Ribeye Steak", quantity_sold: 89, revenue: 3560, profit_margin: 65 },
    { item_name: "Truffle Pasta", quantity_sold: 156, revenue: 3432, profit_margin: 72 },
    { item_name: "Craft Beer Selection", quantity_sold: 234, revenue: 2808, profit_margin: 78 },
    { item_name: "Chef's Special Pizza", quantity_sold: 98, revenue: 2450, profit_margin: 68 },
  ],
  hourly_revenue: [
    { hour: 11, revenue: 1250, orders: 28 },
    { hour: 12, revenue: 2890, orders: 65 },
    { hour: 13, revenue: 3450, orders: 78 },
    { hour: 18, revenue: 4200, orders: 89 },
    { hour: 19, revenue: 5680, orders: 125 },
    { hour: 20, revenue: 4850, orders: 102 },
    { hour: 21, revenue: 3200, orders: 68 },
  ],
};

const mockCustomerAnalytics: CustomerAnalytics = {
  total_customers: 3847,
  new_customers: 287,
  returning_customers: 3560,
  customer_retention_rate: 78.5,
  lifetime_value: 485.60,
  acquisition_cost: 28.40,
  churn_rate: 21.5,
  satisfaction_score: 4.7,
  loyalty_members: 1523,
  customer_segments: [
    { segment: "VIP", count: 189, percentage: 4.9, avg_order_value: 78.50 },
    { segment: "Regular", count: 2456, percentage: 63.8, avg_order_value: 42.30 },
    { segment: "Occasional", count: 968, percentage: 25.2, avg_order_value: 35.20 },
    { segment: "New", count: 234, percentage: 6.1, avg_order_value: 38.90 },
  ],
  cohort_analysis: [
    { cohort: "Jan 2025", size: 145, retention_rates: [100, 68, 52, 41, 35, 32] },
    { cohort: "Feb 2025", size: 167, retention_rates: [100, 72, 56, 44, 38] },
    { cohort: "Mar 2025", size: 189, retention_rates: [100, 75, 58, 46] },
    { cohort: "Apr 2025", size: 198, retention_rates: [100, 78, 61] },
  ],
};

const mockFinancialMetrics: FinancialMetrics = {
  gross_revenue: 127580,
  net_revenue: 125340,
  total_costs: 102180,
  gross_profit: 25400,
  net_profit: 23160,
  profit_margin: 18.5,
  operating_expenses: 45680,
  cost_of_goods_sold: 38240,
  labor_costs: 18260,
  overhead_costs: 12480,
  tax_amount: 2240,
  cash_flow: 20920,
  break_even_point: 89560,
  roi: 22.7,
};

const AdvancedAnalyticsDashboard: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(analyticsPeriods[2]); // Last 7 Days
  const [kpiMetrics] = useState<KPIMetric[]>(mockKPIMetrics);
  const [revenueAnalytics] = useState<RevenueAnalytics>(mockRevenueAnalytics);
  const [customerAnalytics] = useState<CustomerAnalytics>(mockCustomerAnalytics);
  const [financialMetrics] = useState<FinancialMetrics>(mockFinancialMetrics);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Filter and categorize KPIs
  const kpisByCategory = useMemo(() => {
    const categories = {
      revenue: kpiMetrics.filter(kpi => kpi.category === "revenue"),
      operations: kpiMetrics.filter(kpi => kpi.category === "operations"),
      customer: kpiMetrics.filter(kpi => kpi.category === "customer"),
      efficiency: kpiMetrics.filter(kpi => kpi.category === "efficiency"),
    };
    return categories;
  }, [kpiMetrics]);

  const formatValue = (value: number, format: string, unit?: string) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "time":
        return `${value.toFixed(1)}${unit || " min"}`;
      case "number":
        return `${value.toLocaleString()}${unit || ""}`;
      default:
        return value.toString();
    }
  };

  const getChangeIndicator = (change: number, trend: string) => {
    if (trend === "stable") {
      return { icon: Minus, color: "text-gray-500" };
    }
    return change > 0 
      ? { icon: ArrowUp, color: "text-green-600" }
      : { icon: ArrowDown, color: "text-red-600" };
  };

  const handleExportReport = (format: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowExportDialog(false);
      toast({
        title: "Export Complete",
        description: `Analytics report exported as ${format.toUpperCase()}`,
      });
    }, 2000);
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
          <h1 className="text-3xl font-bold text-foreground">Advanced Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and predictive analytics for data-driven decisions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select 
            value={selectedPeriod.value} 
            onValueChange={(value) => {
              const period = analyticsPeriods.find(p => p.value === value);
              if (period) setSelectedPeriod(period);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {analyticsPeriods.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Period Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Analytics for {selectedPeriod.label}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedPeriod.days > 1 ? `${selectedPeriod.days} days of data` : "Single day analysis"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {formatValue(revenueAnalytics.total_revenue, "currency")}
              </div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <ArrowUp className="w-3 h-3" />
                +{revenueAnalytics.revenue_growth.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiMetrics.slice(0, 8).map((kpi) => {
              const changeIndicator = getChangeIndicator(kpi.change_percentage, kpi.trend);
              const IconComponent = kpi.icon;
              
              return (
                <Card key={kpi.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: kpi.color + "20" }}>
                        <IconComponent className="w-5 h-5" style={{ color: kpi.color }} />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <changeIndicator.icon className={`w-3 h-3 ${changeIndicator.color}`} />
                        <span className={changeIndicator.color}>
                          {Math.abs(kpi.change_percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {kpi.name}
                      </h4>
                      <p className="text-2xl font-bold">
                        {formatValue(kpi.value, kpi.format, kpi.unit)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs {formatValue(kpi.previous_value, kpi.format, kpi.unit)} previous period
                      </p>
                    </div>

                    {kpi.target && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress to target</span>
                          <span>{((kpi.value / kpi.target) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(kpi.value / kpi.target) * 100} className="h-1" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueAnalytics.top_revenue_items.slice(0, 3).map((item, index) => (
                    <div key={item.item_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity_sold} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatValue(item.revenue, "currency")}</p>
                        <p className="text-xs text-green-600">{item.profit_margin}% margin</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Customer Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customerAnalytics.customer_segments.map((segment) => (
                    <div key={segment.segment} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{segment.segment}</span>
                        <span className="text-sm text-muted-foreground">
                          {segment.count} ({segment.percentage}%)
                        </span>
                      </div>
                      <Progress value={segment.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatValue(segment.avg_order_value, "currency")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Revenue Channels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueAnalytics.revenue_by_channel.map((channel) => (
                    <div key={channel.channel} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{channel.channel}</span>
                        <span className="text-sm font-semibold">
                          {formatValue(channel.amount, "currency")}
                        </span>
                      </div>
                      <Progress value={channel.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{channel.percentage}% of total</span>
                        <span className="text-green-600">+{channel.growth}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpisByCategory.revenue.map((kpi) => {
              const changeIndicator = getChangeIndicator(kpi.change_percentage, kpi.trend);
              const IconComponent = kpi.icon;
              
              return (
                <Card key={kpi.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className="w-5 h-5 text-green-500" />
                      <div className="flex items-center gap-1 text-sm">
                        <changeIndicator.icon className={`w-3 h-3 ${changeIndicator.color}`} />
                        <span className={changeIndicator.color}>
                          {Math.abs(kpi.change_percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      {kpi.name}
                    </h4>
                    <p className="text-xl font-bold">
                      {formatValue(kpi.value, kpi.format, kpi.unit)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Revenue Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Revenue Over Time</h3>
                <p className="text-muted-foreground">
                  Interactive line chart showing revenue trends over the selected period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Hour</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Hourly Breakdown</h3>
                <p className="text-muted-foreground">
                  Bar chart showing peak revenue hours and order volume distribution.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Customer KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpisByCategory.customer.map((kpi) => {
              const changeIndicator = getChangeIndicator(kpi.change_percentage, kpi.trend);
              const IconComponent = kpi.icon;
              
              return (
                <Card key={kpi.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className="w-5 h-5 text-blue-500" />
                      <div className="flex items-center gap-1 text-sm">
                        <changeIndicator.icon className={`w-3 h-3 ${changeIndicator.color}`} />
                        <span className={changeIndicator.color}>
                          {Math.abs(kpi.change_percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      {kpi.name}
                    </h4>
                    <p className="text-xl font-bold">
                      {formatValue(kpi.value, kpi.format, kpi.unit)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Customer Analytics Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {formatValue(customerAnalytics.lifetime_value, "currency")}
                    </div>
                    <p className="text-sm text-muted-foreground">Average Customer LTV</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold">{customerAnalytics.new_customers}</p>
                      <p className="text-xs text-muted-foreground">New Customers</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{customerAnalytics.returning_customers}</p>
                      <p className="text-xs text-muted-foreground">Returning</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{customerAnalytics.loyalty_members}</p>
                      <p className="text-xs text-muted-foreground">Loyalty Members</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acquisition Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Acquisition Cost</span>
                    <span className="font-semibold">
                      {formatValue(customerAnalytics.acquisition_cost, "currency")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Churn Rate</span>
                    <span className="font-semibold text-red-600">
                      {customerAnalytics.churn_rate}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Satisfaction Score</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{customerAnalytics.satisfaction_score}/5</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Retention Rate Progress</p>
                    <Progress value={customerAnalytics.customer_retention_rate} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {customerAnalytics.customer_retention_rate}% (Target: 85%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Operational Analytics</h3>
              <p className="text-muted-foreground">
                Detailed operational metrics including kitchen efficiency, staff performance, and service quality.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <ArrowUp className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Gross Revenue</h4>
                <p className="text-xl font-bold">{formatValue(financialMetrics.gross_revenue, "currency")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <ArrowUp className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Net Profit</h4>
                <p className="text-xl font-bold">{formatValue(financialMetrics.net_profit, "currency")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Percent className="w-5 h-5 text-purple-500" />
                  <ArrowUp className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Profit Margin</h4>
                <p className="text-xl font-bold">{financialMetrics.profit_margin}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Revenue</span>
                    <span className="font-semibold text-green-600">
                      {formatValue(financialMetrics.gross_revenue, "currency")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Costs</span>
                    <span className="font-semibold text-red-600">
                      -{formatValue(financialMetrics.total_costs, "currency")}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Net Profit</span>
                      <span className="font-bold text-green-600">
                        {formatValue(financialMetrics.net_profit, "currency")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost of Goods Sold</span>
                    <span className="font-semibold">
                      {formatValue(financialMetrics.cost_of_goods_sold, "currency")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Labor Costs</span>
                    <span className="font-semibold">
                      {formatValue(financialMetrics.labor_costs, "currency")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Operating Expenses</span>
                    <span className="font-semibold">
                      {formatValue(financialMetrics.operating_expenses, "currency")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overhead Costs</span>
                    <span className="font-semibold">
                      {formatValue(financialMetrics.overhead_costs, "currency")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-muted-foreground">
                Machine learning-driven insights, predictions, and recommendations for business optimization.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Analytics Report</DialogTitle>
            <DialogDescription>
              Choose the format for your analytics report export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleExportReport("pdf")}
                disabled={isLoading}
                className="h-20 flex-col"
              >
                <FileText className="w-6 h-6 mb-2" />
                PDF Report
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExportReport("excel")}
                disabled={isLoading}
                className="h-20 flex-col"
              >
                <BarChart3 className="w-6 h-6 mb-2" />
                Excel File
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExportReport("csv")}
                disabled={isLoading}
                className="h-20 flex-col"
              >
                <FileText className="w-6 h-6 mb-2" />
                CSV Data
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExportReport("json")}
                disabled={isLoading}
                className="h-20 flex-col"
              >
                <Settings className="w-6 h-6 mb-2" />
                JSON Data
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
