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
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  DollarSign,
  Target,
  Award,
  Settings,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  LineChart,
  PieChart,
  Gauge,
  Timer,
  Cpu,
  Database,
  Server,
  Wifi,
  Shield,
  Rocket,
  Lightbulb,
  Flag,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  Calendar,
  Bell,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";

// Performance optimization interfaces
export interface PerformanceMetric {
  id: string;
  name: string;
  category: PerformanceCategory;
  current_value: number;
  target_value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  priority: "high" | "medium" | "low";
  description: string;
  recommendations: string[];
  last_updated: string;
}

export type PerformanceCategory = 
  | "efficiency"
  | "customer_satisfaction"
  | "financial"
  | "operational"
  | "staff_productivity"
  | "technology"
  | "sustainability";

export interface OptimizationRecommendation {
  id: string;
  title: string;
  category: PerformanceCategory;
  description: string;
  impact_level: "high" | "medium" | "low";
  effort_required: "high" | "medium" | "low";
  potential_savings: number;
  implementation_time: string;
  priority_score: number;
  status: "new" | "in_progress" | "completed" | "dismissed";
  created_at: string;
  updated_at: string;
}

export interface PerformanceAlert {
  id: string;
  metric_id: string;
  metric_name: string;
  alert_type: "threshold" | "trend" | "anomaly";
  severity: "critical" | "warning" | "info";
  message: string;
  triggered_at: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface BenchmarkData {
  category: string;
  our_performance: number;
  industry_average: number;
  top_performers: number;
  unit: string;
  ranking_percentile: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_condition: string;
  action: string;
  is_active: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
}

// Mock data
const mockPerformanceMetrics: PerformanceMetric[] = [
  {
    id: "1",
    name: "Average Order Processing Time",
    category: "efficiency",
    current_value: 8.5,
    target_value: 6.0,
    unit: "minutes",
    trend: "down",
    priority: "high",
    description: "Time from order placement to kitchen start",
    recommendations: [
      "Streamline order entry process",
      "Implement automated order routing",
      "Optimize kitchen workflow"
    ],
    last_updated: "2025-01-04T10:30:00Z"
  },
  {
    id: "2",
    name: "Customer Satisfaction Score",
    category: "customer_satisfaction",
    current_value: 4.2,
    target_value: 4.5,
    unit: "out of 5",
    trend: "up",
    priority: "high",
    description: "Average customer rating across all touchpoints",
    recommendations: [
      "Improve service training",
      "Reduce wait times",
      "Enhance food quality consistency"
    ],
    last_updated: "2025-01-04T09:15:00Z"
  },
  {
    id: "3",
    name: "Food Cost Percentage",
    category: "financial",
    current_value: 32.5,
    target_value: 28.0,
    unit: "%",
    trend: "stable",
    priority: "medium",
    description: "Food costs as percentage of revenue",
    recommendations: [
      "Optimize portion sizes",
      "Negotiate better supplier rates",
      "Reduce food waste"
    ],
    last_updated: "2025-01-04T08:45:00Z"
  },
  {
    id: "4",
    name: "Table Turnover Rate",
    category: "operational",
    current_value: 2.8,
    target_value: 3.2,
    unit: "turns/day",
    trend: "up",
    priority: "medium",
    description: "Average number of times tables are occupied per day",
    recommendations: [
      "Optimize seating arrangements",
      "Improve service speed",
      "Implement reservation system"
    ],
    last_updated: "2025-01-04T11:00:00Z"
  },
  {
    id: "5",
    name: "Staff Productivity Index",
    category: "staff_productivity",
    current_value: 85,
    target_value: 90,
    unit: "score",
    trend: "up",
    priority: "medium",
    description: "Composite score of staff efficiency metrics",
    recommendations: [
      "Provide additional training",
      "Optimize work schedules",
      "Implement performance incentives"
    ],
    last_updated: "2025-01-04T12:20:00Z"
  },
  {
    id: "6",
    name: "Energy Efficiency Score",
    category: "sustainability",
    current_value: 72,
    target_value: 85,
    unit: "score",
    trend: "stable",
    priority: "low",
    description: "Energy consumption efficiency rating",
    recommendations: [
      "Upgrade to LED lighting",
      "Install smart thermostats",
      "Regular equipment maintenance"
    ],
    last_updated: "2025-01-04T07:30:00Z"
  }
];

const mockRecommendations: OptimizationRecommendation[] = [
  {
    id: "1",
    title: "Implement Smart Kitchen Display System",
    category: "efficiency",
    description: "Deploy AI-powered kitchen displays to optimize order preparation sequence and reduce wait times",
    impact_level: "high",
    effort_required: "medium",
    potential_savings: 1250,
    implementation_time: "2-3 weeks",
    priority_score: 95,
    status: "new",
    created_at: "2025-01-04T09:00:00Z",
    updated_at: "2025-01-04T09:00:00Z"
  },
  {
    id: "2",
    title: "Optimize Menu Engineering",
    category: "financial",
    description: "Analyze item profitability and popularity to redesign menu layout and pricing strategy",
    impact_level: "high",
    effort_required: "low",
    potential_savings: 2800,
    implementation_time: "1 week",
    priority_score: 92,
    status: "in_progress",
    created_at: "2025-01-03T14:30:00Z",
    updated_at: "2025-01-04T10:15:00Z"
  },
  {
    id: "3",
    title: "Staff Cross-Training Program",
    category: "staff_productivity",
    description: "Train staff in multiple positions to improve flexibility and reduce bottlenecks during peak hours",
    impact_level: "medium",
    effort_required: "high",
    potential_savings: 950,
    implementation_time: "4-6 weeks",
    priority_score: 78,
    status: "new",
    created_at: "2025-01-02T16:45:00Z",
    updated_at: "2025-01-02T16:45:00Z"
  },
  {
    id: "4",
    title: "Predictive Inventory Management",
    category: "operational",
    description: "Implement AI-driven inventory forecasting to reduce waste and optimize stock levels",
    impact_level: "medium",
    effort_required: "medium",
    potential_savings: 1800,
    implementation_time: "3-4 weeks",
    priority_score: 85,
    status: "new",
    created_at: "2025-01-01T11:20:00Z",
    updated_at: "2025-01-01T11:20:00Z"
  }
];

const mockAlerts: PerformanceAlert[] = [
  {
    id: "1",
    metric_id: "1",
    metric_name: "Average Order Processing Time",
    alert_type: "threshold",
    severity: "critical",
    message: "Order processing time has exceeded 10 minutes for the last hour",
    triggered_at: "2025-01-04T13:45:00Z",
    acknowledged: false,
    resolved: false
  },
  {
    id: "2",
    metric_id: "3",
    metric_name: "Food Cost Percentage",
    alert_type: "trend",
    severity: "warning",
    message: "Food costs have increased by 5% over the past week",
    triggered_at: "2025-01-04T08:30:00Z",
    acknowledged: true,
    resolved: false
  }
];

const mockBenchmarkData: BenchmarkData[] = [
  { category: "Order Processing Speed", our_performance: 8.5, industry_average: 9.2, top_performers: 6.8, unit: "minutes", ranking_percentile: 65 },
  { category: "Customer Satisfaction", our_performance: 4.2, industry_average: 4.1, top_performers: 4.7, unit: "out of 5", ranking_percentile: 55 },
  { category: "Food Cost %", our_performance: 32.5, industry_average: 30.5, top_performers: 26.0, unit: "%", ranking_percentile: 35 },
  { category: "Table Turnover", our_performance: 2.8, industry_average: 2.9, top_performers: 3.5, unit: "turns/day", ranking_percentile: 48 },
  { category: "Staff Productivity", our_performance: 85, industry_average: 82, top_performers: 95, unit: "score", ranking_percentile: 70 }
];

const mockAutomationRules: AutomationRule[] = [
  {
    id: "1",
    name: "High Wait Time Alert",
    description: "Send alert when average wait time exceeds 15 minutes",
    trigger_condition: "wait_time > 15 minutes",
    action: "Send notification to manager",
    is_active: true,
    last_triggered: "2025-01-04T12:30:00Z",
    trigger_count: 8,
    created_at: "2025-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Low Inventory Auto-Order",
    description: "Automatically place orders when inventory falls below threshold",
    trigger_condition: "inventory_level < safety_stock",
    action: "Generate purchase order",
    is_active: true,
    last_triggered: "2025-01-03T16:45:00Z",
    trigger_count: 23,
    created_at: "2025-01-01T00:00:00Z"
  }
];

const PerformanceOptimization: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState<PerformanceCategory | "all">("all");
  const [metrics] = useState<PerformanceMetric[]>(mockPerformanceMetrics);
  const [recommendations] = useState<OptimizationRecommendation[]>(mockRecommendations);
  const [alerts] = useState<PerformanceAlert[]>(mockAlerts);
  const [benchmarkData] = useState<BenchmarkData[]>(mockBenchmarkData);
  const [automationRules] = useState<AutomationRule[]>(mockAutomationRules);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);

  const filteredMetrics = useMemo(() => {
    if (selectedCategory === "all") return metrics;
    return metrics.filter(metric => metric.category === selectedCategory);
  }, [metrics, selectedCategory]);

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === "critical");

  const overallPerformanceScore = useMemo(() => {
    const scores = metrics.map(metric => {
      const progress = (metric.current_value / metric.target_value) * 100;
      return Math.min(progress, 100);
    });
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [metrics]);

  const getCategoryIcon = (category: PerformanceCategory) => {
    switch (category) {
      case "efficiency": return Zap;
      case "customer_satisfaction": return Users;
      case "financial": return DollarSign;
      case "operational": return Settings;
      case "staff_productivity": return Activity;
      case "technology": return Server;
      case "sustainability": return Award;
      default: return Target;
    }
  };

  const getCategoryColor = (category: PerformanceCategory) => {
    switch (category) {
      case "efficiency": return "text-blue-500";
      case "customer_satisfaction": return "text-green-500";
      case "financial": return "text-purple-500";
      case "operational": return "text-orange-500";
      case "staff_productivity": return "text-red-500";
      case "technology": return "text-indigo-500";
      case "sustainability": return "text-teal-500";
      default: return "text-gray-500";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <ArrowUp className="w-4 h-4 text-green-500" />;
      case "down": return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
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

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "warning": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleImplementRecommendation = async (recommendationId: string) => {
    setIsLoading(true);
    try {
      // Simulate implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Implementation Started",
        description: "The optimization recommendation has been marked for implementation.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to implement recommendation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // Simulate acknowledgment
      toast({
        title: "Alert Acknowledged",
        description: "The performance alert has been acknowledged.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold text-foreground">Performance Optimization</h1>
          <p className="text-muted-foreground">
            Monitor, analyze, and optimize your restaurant's performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as PerformanceCategory | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="efficiency">Efficiency</SelectItem>
              <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="staff_productivity">Staff Productivity</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="sustainability">Sustainability</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button>
            <Rocket className="w-4 h-4 mr-2" />
            Quick Optimize
          </Button>
        </div>
      </motion.div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold text-blue-600">{overallPerformanceScore}%</p>
                <p className="text-xs text-blue-600">Performance index</p>
              </div>
              <Gauge className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
                <p className="text-xs text-red-600">Critical issues</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recommendations</p>
                <p className="text-2xl font-bold text-green-600">{recommendations.filter(r => r.status === "new").length}</p>
                <p className="text-xs text-green-600">New suggestions</p>
              </div>
              <Lightbulb className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${recommendations.reduce((sum, rec) => sum + rec.potential_savings, 0).toLocaleString()}
                </p>
                <p className="text-xs text-purple-600">Per month</p>
              </div>
              <Target className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Performance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalAlerts.map((alert) => (
                    <div key={alert.id} className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{alert.metric_name}</h4>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.triggered_at).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.slice(0, 4).map((metric) => {
                    const IconComponent = getCategoryIcon(metric.category);
                    const progress = Math.min((metric.current_value / metric.target_value) * 100, 100);
                    
                    return (
                      <div key={metric.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${getCategoryColor(metric.category)}`} />
                            <span className="font-medium text-sm">{metric.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {metric.current_value} {metric.unit}
                            </span>
                            {getTrendIcon(metric.trend)}
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Current: {metric.current_value} {metric.unit}</span>
                          <span>Target: {metric.target_value} {metric.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations
                    .sort((a, b) => b.priority_score - a.priority_score)
                    .slice(0, 3)
                    .map((rec) => (
                      <div key={rec.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs">
                                Impact: <span className={getImpactColor(rec.impact_level)}>{rec.impact_level}</span>
                              </span>
                              <span className="text-xs">
                                Effort: <span className={getEffortColor(rec.effort_required)}>{rec.effort_required}</span>
                              </span>
                              <span className="text-xs font-semibold text-green-600">
                                ${rec.potential_savings}/mo
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedRecommendation(rec);
                              setShowRecommendationDialog(true);
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMetrics.map((metric) => {
              const IconComponent = getCategoryIcon(metric.category);
              const progress = Math.min((metric.current_value / metric.target_value) * 100, 100);
              const isOnTarget = progress >= 90;
              
              return (
                <Card key={metric.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-5 h-5 ${getCategoryColor(metric.category)}`} />
                          <Badge className={getPriorityColor(metric.priority)}>
                            {metric.priority}
                          </Badge>
                        </div>
                        {getTrendIcon(metric.trend)}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm">{metric.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {metric.description}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">
                            {metric.current_value} {metric.unit}
                          </span>
                          {isOnTarget ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                        
                        <Progress 
                          value={progress} 
                          className={`h-2 ${isOnTarget ? 'bg-green-100' : 'bg-yellow-100'}`} 
                        />
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Target: {metric.target_value} {metric.unit}</span>
                          <span>{progress.toFixed(1)}% of target</span>
                        </div>
                      </div>
                      
                      {metric.recommendations.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium mb-1">Quick Actions:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {metric.recommendations.slice(0, 2).map((rec, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span>•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Optimization Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{rec.title}</h3>
                          <Badge className={getPriorityColor(rec.status === "new" ? "high" : "medium")}>
                            {rec.status.replace("_", " ")}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {rec.description}
                        </p>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Impact:</span>
                            <span className={`ml-1 font-medium ${getImpactColor(rec.impact_level)}`}>
                              {rec.impact_level}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Effort:</span>
                            <span className={`ml-1 font-medium ${getEffortColor(rec.effort_required)}`}>
                              {rec.effort_required}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Savings:</span>
                            <span className="ml-1 font-medium text-green-600">
                              ${rec.potential_savings}/mo
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Timeline:</span>
                            <span className="ml-1 font-medium">
                              {rec.implementation_time}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecommendation(rec);
                            setShowRecommendationDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {rec.status === "new" && (
                          <Button 
                            size="sm"
                            onClick={() => handleImplementRecommendation(rec.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          {/* Industry Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {benchmarkData.map((benchmark) => (
                  <div key={benchmark.category} className="space-y-3">
                    <h4 className="font-semibold">{benchmark.category}</h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Our Performance</span>
                          <span className="font-semibold">
                            {benchmark.our_performance} {benchmark.unit}
                          </span>
                        </div>
                        <Progress value={50} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Industry Average</span>
                          <span className="font-semibold">
                            {benchmark.industry_average} {benchmark.unit}
                          </span>
                        </div>
                        <Progress value={75} className="h-2 bg-yellow-100" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Top Performers</span>
                          <span className="font-semibold">
                            {benchmark.top_performers} {benchmark.unit}
                          </span>
                        </div>
                        <Progress value={100} className="h-2 bg-green-100" />
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      You rank in the <strong>{benchmark.ranking_percentile}th percentile</strong> for this metric
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          {/* Automation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Automation Rules
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Switch checked={rule.is_active} />
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Trigger:</span>
                            <span className="ml-1 font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                              {rule.trigger_condition}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Action:</span>
                            <span className="ml-1">{rule.action}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Triggered:</span>
                            <span className="ml-1 font-medium">{rule.trigger_count} times</span>
                          </div>
                        </div>
                        
                        {rule.last_triggered && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last triggered: {new Date(rule.last_triggered).toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendation Detail Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRecommendation?.title}</DialogTitle>
            <DialogDescription>
              Detailed information about this optimization recommendation
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedRecommendation.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Impact & Effort</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Impact Level:</span>
                      <span className={getImpactColor(selectedRecommendation.impact_level)}>
                        {selectedRecommendation.impact_level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effort Required:</span>
                      <span className={getEffortColor(selectedRecommendation.effort_required)}>
                        {selectedRecommendation.effort_required}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority Score:</span>
                      <span className="font-semibold">{selectedRecommendation.priority_score}/100</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Financial Impact</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly Savings:</span>
                      <span className="font-semibold text-green-600">
                        ${selectedRecommendation.potential_savings}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Annual Savings:</span>
                      <span className="font-semibold text-green-600">
                        ${selectedRecommendation.potential_savings * 12}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation Time:</span>
                      <span>{selectedRecommendation.implementation_time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendationDialog(false)}>
              Close
            </Button>
            {selectedRecommendation?.status === "new" && (
              <Button 
                onClick={() => {
                  handleImplementRecommendation(selectedRecommendation.id);
                  setShowRecommendationDialog(false);
                }}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Start Implementation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceOptimization;
