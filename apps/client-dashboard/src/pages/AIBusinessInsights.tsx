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
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Eye,
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
  Gauge,
  Radar,
  Crosshair,
  Telescope,
  Binoculars,
  Compass,
  Flag,
  Shield,
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
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Search,
  Sparkles,
  Database,
  Cpu,
  Bot,
  Wand2,
  Atom,
} from "lucide-react";

// AI-powered insights interfaces
export interface AIInsight {
  id: string;
  type: "prediction" | "recommendation" | "anomaly" | "opportunity" | "optimization";
  title: string;
  description: string;
  confidence_score: number;
  impact_score: number;
  priority: "critical" | "high" | "medium" | "low";
  category: InsightCategory;
  data_points: DataPoint[];
  predicted_outcome: PredictedOutcome;
  actionable_recommendations: ActionableRecommendation[];
  created_at: string;
  expires_at?: string;
  status: "active" | "implemented" | "dismissed" | "expired";
  ai_model: string;
  accuracy_rating?: number;
}

export type InsightCategory = 
  | "revenue_optimization"
  | "customer_experience"
  | "operational_efficiency"
  | "market_trends"
  | "risk_management"
  | "staff_optimization"
  | "inventory_management"
  | "marketing_effectiveness";

export interface DataPoint {
  metric: string;
  current_value: number;
  historical_average: number;
  trend_direction: "up" | "down" | "stable";
  variance_percentage: number;
  significance_level: number;
}

export interface PredictedOutcome {
  scenario: "best_case" | "likely" | "worst_case";
  timeframe: string;
  probability: number;
  expected_impact: {
    revenue_change: number;
    cost_change: number;
    customer_satisfaction_change: number;
    efficiency_change: number;
  };
  confidence_interval: {
    lower_bound: number;
    upper_bound: number;
  };
}

export interface ActionableRecommendation {
  action: string;
  implementation_difficulty: "easy" | "moderate" | "complex";
  estimated_time: string;
  expected_roi: number;
  resources_required: string[];
  success_metrics: string[];
  dependencies: string[];
}

export interface AIModel {
  id: string;
  name: string;
  type: "predictive" | "classification" | "optimization" | "nlp";
  description: string;
  accuracy: number;
  last_trained: string;
  data_sources: string[];
  use_cases: string[];
  status: "active" | "training" | "deprecated";
}

export interface BusinessPrediction {
  id: string;
  type: "revenue" | "demand" | "customer_behavior" | "operational";
  title: string;
  description: string;
  prediction_horizon: "1_week" | "1_month" | "3_months" | "6_months" | "1_year";
  confidence_level: number;
  predicted_values: Array<{
    date: string;
    value: number;
    confidence_range: [number, number];
  }>;
  factors_considered: string[];
  model_used: string;
  created_at: string;
  last_updated: string;
}

export interface SmartAlert {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  category: string;
  ai_generated: boolean;
  confidence_score: number;
  suggested_actions: string[];
  related_metrics: string[];
  triggered_at: string;
  acknowledged: boolean;
  resolved: boolean;
}

// Real-data-only baselines (all empty). These will be populated once AI insight
// generation, prediction, alerting & model management APIs are implemented.
// TODO(ai-insights-api): fetch insights, predictions, alerts & models from backend services.
const initialAIInsights: AIInsight[] = [];
const initialBusinessPredictions: BusinessPrediction[] = [];
const initialSmartAlerts: SmartAlert[] = [];
const initialAIModels: AIModel[] = [];

const AIBusinessInsights: React.FC = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("insights");
  const [aiInsights] = useState<AIInsight[]>(initialAIInsights);
  const [businessPredictions] = useState<BusinessPrediction[]>(initialBusinessPredictions);
  const [smartAlerts] = useState<SmartAlert[]>(initialSmartAlerts);
  const [aiModels] = useState<AIModel[]>(initialAIModels);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [showInsightDialog, setShowInsightDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredInsights = useMemo(() => {
    if (selectedCategory === "all") return aiInsights;
    return aiInsights.filter(insight => insight.category === selectedCategory);
  }, [aiInsights, selectedCategory]);

  const activeAlerts = smartAlerts.filter(alert => !alert.resolved);
  const criticalInsights = aiInsights.filter(insight => insight.priority === "critical" || insight.priority === "high");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "prediction": return <Sparkles className="w-4 h-4" />;
      case "recommendation": return <Lightbulb className="w-4 h-4" />;
      case "anomaly": return <AlertTriangle className="w-4 h-4" />;
      case "opportunity": return <Target className="w-4 h-4" />;
      case "optimization": return <Zap className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const handleImplementRecommendation = async (insightId: string, actionIndex: number) => {
    setIsLoading(true);
    try {
      // Simulate implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Implementation Started",
        description: "The AI recommendation has been marked for implementation.",
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

  const handleTrainModel = async (modelId: string) => {
    setIsLoading(true);
    try {
      // Simulate model training
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Model Training Started",
        description: "The AI model has been queued for retraining with latest data.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start model training",
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
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            AI Business Insights
          </h1>
          <p className="text-muted-foreground">
            Intelligent analysis and predictions powered by advanced AI models
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="revenue_optimization">Revenue Optimization</SelectItem>
              <SelectItem value="customer_experience">Customer Experience</SelectItem>
              <SelectItem value="operational_efficiency">Operational Efficiency</SelectItem>
              <SelectItem value="market_trends">Market Trends</SelectItem>
              <SelectItem value="risk_management">Risk Management</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh AI
          </Button>

          <Button>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </div>
      </motion.div>

      {/* AI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Insights</p>
                <p className="text-2xl font-bold text-purple-600">{aiInsights.filter(i => i.status === "active").length}</p>
                <p className="text-xs text-purple-600">AI recommendations</p>
              </div>
              <Brain className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                <p className="text-2xl font-bold text-green-600">
                  {aiModels.length ? Math.round(aiModels.reduce((sum, model) => sum + model.accuracy, 0) / aiModels.length) : 0}%
                </p>
                <p className="text-xs text-green-600">Average model accuracy</p>
              </div>
              <Target className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Smart Alerts</p>
                <p className="text-2xl font-bold text-red-600">{activeAlerts.length}</p>
                <p className="text-xs text-red-600">Require attention</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Models</p>
                <p className="text-2xl font-bold text-blue-600">{aiModels.filter(m => m.status === "active").length}</p>
                <p className="text-xs text-blue-600">Models running</p>
              </div>
              <Cpu className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="analytics">Deep Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* AI Insights */}
          <div className="space-y-4">
            {filteredInsights.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No AI insights yet. Connect data sources or generate insights once backend integration is available.
                </CardContent>
              </Card>
            )}
            {filteredInsights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          {getTypeIcon(insight.type)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {insight.type}
                          </Badge>
                          <Badge variant="secondary">
                            {insight.confidence_score}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2">{insight.title}</h3>
                      <p className="text-muted-foreground mb-4">{insight.description}</p>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Predicted Impact</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Revenue:</span>
                              <span className={insight.predicted_outcome.expected_impact.revenue_change >= 0 ? "text-green-600" : "text-red-600"}>
                                {insight.predicted_outcome.expected_impact.revenue_change >= 0 ? "+" : ""}{insight.predicted_outcome.expected_impact.revenue_change}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Efficiency:</span>
                              <span className={insight.predicted_outcome.expected_impact.efficiency_change >= 0 ? "text-green-600" : "text-red-600"}>
                                {insight.predicted_outcome.expected_impact.efficiency_change >= 0 ? "+" : ""}{insight.predicted_outcome.expected_impact.efficiency_change}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Key Data Points</h4>
                          <div className="space-y-1">
                            {insight.data_points.slice(0, 2).map((point, index) => (
                              <div key={index} className="text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{point.metric}:</span>
                                  <div className="flex items-center gap-1">
                                    <span>{point.current_value}</span>
                                    {point.trend_direction === "up" && <ArrowUp className="w-3 h-3 text-green-500" />}
                                    {point.trend_direction === "down" && <ArrowDown className="w-3 h-3 text-red-500" />}
                                    {point.trend_direction === "stable" && <ArrowRight className="w-3 h-3 text-gray-500" />}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Timeframe</h4>
                          <div className="text-sm">
                            <p className="font-medium">{insight.predicted_outcome.timeframe}</p>
                            <p className="text-muted-foreground">
                              {Math.round(insight.predicted_outcome.probability * 100)}% probability
                            </p>
                            <p className="text-xs text-muted-foreground">
                              AI Model: {insight.ai_model}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {insight.actionable_recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">AI Recommendations:</h4>
                          <div className="space-y-2">
                            {insight.actionable_recommendations.slice(0, 2).map((rec, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{rec.action}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                      <span>Difficulty: {rec.implementation_difficulty}</span>
                                      <span>Time: {rec.estimated_time}</span>
                                      <span className="text-green-600">ROI: {rec.expected_roi}%</span>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleImplementRecommendation(insight.id, index)}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Implement"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedInsight(insight);
                          setShowInsightDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {/* Business Predictions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {businessPredictions.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No predictions available. Predictions will appear after AI forecasting is enabled.
                </CardContent>
              </Card>
            )}
            {businessPredictions.map((prediction) => (
              <Card key={prediction.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    {prediction.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{prediction.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Confidence Level:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={prediction.confidence_level} className="w-20 h-2" />
                        <span className="font-medium">{prediction.confidence_level}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Predicted Values:</h4>
                      {prediction.predicted_values.slice(0, 3).map((value, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{new Date(value.date).toLocaleDateString()}</span>
                          <div className="text-right">
                            <span className="font-medium">
                              {prediction.type === "revenue" ? formatCurrency(value.value) : value.value.toLocaleString()}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              Range: {prediction.type === "revenue" ? 
                                `${formatCurrency(value.confidence_range[0])} - ${formatCurrency(value.confidence_range[1])}` :
                                `${value.confidence_range[0]} - ${value.confidence_range[1]}`
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Model: {prediction.model_used} | Updated: {new Date(prediction.last_updated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Smart Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-orange-500" />
                AI-Generated Smart Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smartAlerts.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No smart alerts generated. Alerts will surface once monitoring is active.
                  </div>
                )}
                {smartAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{alert.title}</h4>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.ai_generated && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              <Brain className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm mb-3">{alert.message}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-xs">
                            <span>Confidence: {alert.confidence_score}%</span>
                            <span>Category: {alert.category}</span>
                            <span>Triggered: {new Date(alert.triggered_at).toLocaleString()}</span>
                          </div>
                          
                          {alert.suggested_actions.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Suggested Actions:</h5>
                              <ul className="space-y-1">
                                {alert.suggested_actions.map((action, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {!alert.acknowledged && (
                          <Button size="sm" variant="outline">
                            Acknowledge
                          </Button>
                        )}
                        <Button size="sm">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {/* AI Models Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                AI Models Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiModels.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No AI models registered. Models will list here after deployment.
                  </div>
                )}
                {aiModels.map((model) => (
                  <div key={model.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-semibold text-lg">{model.name}</h4>
                          <Badge className={model.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {model.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {model.type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div>
                            <h5 className="font-medium text-sm mb-2">Performance</h5>
                            <div className="flex items-center gap-2">
                              <Progress value={model.accuracy} className="flex-1 h-2" />
                              <span className="text-sm font-medium">{model.accuracy}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last trained: {new Date(model.last_trained).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-sm mb-2">Data Sources</h5>
                            <div className="flex flex-wrap gap-1">
                              {model.data_sources.slice(0, 3).map((source, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {source}
                                </Badge>
                              ))}
                              {model.data_sources.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{model.data_sources.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-sm mb-2">Use Cases</h5>
                            <ul className="space-y-1">
                              {model.use_cases.slice(0, 2).map((useCase, index) => (
                                <li key={index} className="text-xs text-muted-foreground">
                                  • {useCase}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTrainModel(model.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Retrain
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Deep Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Atom className="w-5 h-5 text-teal-500" />
                  AI Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No performance metrics yet. Metrics will populate after AI models report telemetry.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  AI Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No learning progress data yet. This section will display ingestion & model training stats once available.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insight Detail Dialog */}
      <Dialog open={showInsightDialog} onOpenChange={setShowInsightDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedInsight && getTypeIcon(selectedInsight.type)}
              {selectedInsight?.title}
            </DialogTitle>
            <DialogDescription>
              Detailed AI insight analysis and recommendations
            </DialogDescription>
          </DialogHeader>

          {selectedInsight && (
            <div className="space-y-6">
              {/* Insight Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Insight Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <Badge variant="outline" className="capitalize">{selectedInsight.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <Badge className={getPriorityColor(selectedInsight.priority)}>
                        {selectedInsight.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{selectedInsight.confidence_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impact Score:</span>
                      <span className="font-medium">{selectedInsight.impact_score}/100</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">AI Model Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-medium">{selectedInsight.ai_model}</span>
                    </div>
                    {selectedInsight.accuracy_rating && (
                      <div className="flex justify-between">
                        <span>Model Accuracy:</span>
                        <span className="font-medium">{selectedInsight.accuracy_rating}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Generated:</span>
                      <span>{new Date(selectedInsight.created_at).toLocaleString()}</span>
                    </div>
                    {selectedInsight.expires_at && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span>{new Date(selectedInsight.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Points Analysis */}
              <div>
                <h4 className="font-semibold mb-3">Supporting Data Points</h4>
                <div className="space-y-3">
                  {selectedInsight.data_points.map((point, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium">{point.metric}</h5>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{point.current_value}</span>
                          {point.trend_direction === "up" && <ArrowUp className="w-4 h-4 text-green-500" />}
                          {point.trend_direction === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                          {point.trend_direction === "stable" && <ArrowRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Historical Avg:</span>
                          <span className="ml-1 font-medium">{point.historical_average}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Variance:</span>
                          <span className={`ml-1 font-medium ${point.variance_percentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {point.variance_percentage >= 0 ? "+" : ""}{point.variance_percentage}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Significance:</span>
                          <span className="ml-1 font-medium">{Math.round(point.significance_level * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predicted Outcome */}
              <div>
                <h4 className="font-semibold mb-3">Predicted Outcome</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Expected Impact</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Revenue Change:</span>
                          <span className={selectedInsight.predicted_outcome.expected_impact.revenue_change >= 0 ? "text-green-600" : "text-red-600"}>
                            {selectedInsight.predicted_outcome.expected_impact.revenue_change >= 0 ? "+" : ""}{selectedInsight.predicted_outcome.expected_impact.revenue_change}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost Change:</span>
                          <span className={selectedInsight.predicted_outcome.expected_impact.cost_change <= 0 ? "text-green-600" : "text-red-600"}>
                            {selectedInsight.predicted_outcome.expected_impact.cost_change >= 0 ? "+" : ""}{selectedInsight.predicted_outcome.expected_impact.cost_change}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Customer Satisfaction:</span>
                          <span className={selectedInsight.predicted_outcome.expected_impact.customer_satisfaction_change >= 0 ? "text-green-600" : "text-red-600"}>
                            {selectedInsight.predicted_outcome.expected_impact.customer_satisfaction_change >= 0 ? "+" : ""}{selectedInsight.predicted_outcome.expected_impact.customer_satisfaction_change}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Confidence Range</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Scenario:</span>
                          <span className="capitalize font-medium">{selectedInsight.predicted_outcome.scenario}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Probability:</span>
                          <span className="font-medium">{Math.round(selectedInsight.predicted_outcome.probability * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Range:</span>
                          <span className="font-medium">
                            {selectedInsight.predicted_outcome.confidence_interval.lower_bound}% - {selectedInsight.predicted_outcome.confidence_interval.upper_bound}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">Detailed Recommendations</h4>
                <div className="space-y-4">
                  {selectedInsight.actionable_recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">{rec.action}</h5>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Difficulty:</span>
                              <span className="capitalize">{rec.implementation_difficulty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time Required:</span>
                              <span>{rec.estimated_time}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Expected ROI:</span>
                              <span className="text-green-600 font-medium">{rec.expected_roi}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h6 className="font-medium text-sm mb-1">Resources Required:</h6>
                          <div className="flex flex-wrap gap-1">
                            {rec.resources_required.map((resource, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {resource}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h6 className="font-medium text-sm mb-1">Success Metrics:</h6>
                          <ul className="space-y-1">
                            {rec.success_metrics.map((metric, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {metric}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h6 className="font-medium text-sm mb-1">Dependencies:</h6>
                          <ul className="space-y-1">
                            {rec.dependencies.map((dep, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {dep}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          size="sm" 
                          onClick={() => handleImplementRecommendation(selectedInsight.id, index)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Implement This Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInsightDialog(false)}>
              Close
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIBusinessInsights;
