/**
 * Widget Analytics Dashboard Component
 * Advanced analytics with real-time metrics and insights
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Zap, 
  Users,
  BarChart3,
  Activity,
  Target,
  Clock,
  MapPin,
  Smartphone,
  Globe
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Simple chart placeholder components
      const SimpleLineChart: React.FC<{ data: any; height?: number }> = ({ data, height = 200 }) => (
  <div className={`flex items-end justify-between gap-1 h-${height}`} style={{ height: `${height}px` }}>
    {data.datasets[0].data.map((value: number, index: number) => (
      <div key={index} className="flex flex-col items-center flex-1">
        <div 
          className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600"
          style={{ height: `${(value / Math.max(...data.datasets[0].data)) * (height - 40)}px` }}
        />
        <span className="text-xs text-muted-foreground mt-1 truncate">
          {data.labels[index]}
        </span>
      </div>
    ))}
  </div>
);

const SimpleDoughnutChart: React.FC<{ data: any }> = ({ data }) => {
  const total = data.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
  
  return (
    <div className="space-y-4">
      <div className="relative w-48 h-48 mx-auto">
        <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total}%</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.labels.map((label: string, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: data.datasets[0].backgroundColor[index] }}
              />
              <span className="text-sm">{label}</span>
            </div>
            <span className="text-sm font-medium">{data.datasets[0].data[index]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AnalyticsData {
  totalViews: number;
  totalInteractions: number;
  totalConversions: number;
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
  topSources: Array<{ source: string; views: number; conversions: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number }>;
  hourlyData: Array<{ hour: string; views: number; conversions: number }>;
  weeklyData: Array<{ day: string; views: number; conversions: number }>;
}

interface WidgetAnalyticsDashboardProps {
  widgetType: 'booking' | 'catering';
  analyticsData: AnalyticsData;
  timeRange: '24h' | '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '24h' | '7d' | '30d' | '90d') => void;
}

const WidgetAnalyticsDashboard: React.FC<WidgetAnalyticsDashboardProps> = ({
  widgetType,
  analyticsData,
  timeRange,
  onTimeRangeChange
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'interactions' | 'conversions'>('views');

  // Calculate metrics
      const metrics = useMemo(() => {
    const conversionRate = analyticsData.totalViews > 0 
      ? (analyticsData.totalConversions / analyticsData.totalViews) * 100 
      : 0;
    
    const interactionRate = analyticsData.totalViews > 0 
      ? (analyticsData.totalInteractions / analyticsData.totalViews) * 100 
      : 0;

    return {
      conversionRate: Math.round(conversionRate * 100) / 100,
      interactionRate: Math.round(interactionRate * 100) / 100,
      avgSessionDuration: analyticsData.avgSessionDuration || 0,
      bounceRate: analyticsData.bounceRate || 0
    };
  }, [analyticsData]);

  // Chart configurations
      const lineChartData = {
    labels: timeRange === '24h' 
      ? analyticsData.hourlyData?.map(d => d.hour) || []
      : analyticsData.weeklyData?.map(d => d.day) || [],
    datasets: [
      {
        label: 'Views',
        data: timeRange === '24h' 
          ? analyticsData.hourlyData?.map(d => d.views) || []
          : analyticsData.weeklyData?.map(d => d.views) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Conversions',
        data: timeRange === '24h' 
          ? analyticsData.hourlyData?.map(d => d.conversions) || []
          : analyticsData.weeklyData?.map(d => d.conversions) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const deviceChartData = {
    labels: analyticsData.deviceBreakdown?.map(d => d.device) || [],
    datasets: [
      {
        data: analyticsData.deviceBreakdown?.map(d => d.percentage) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold capitalize">
            {widgetType} Widget Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance insights and user behavior metrics
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-lg font-semibold">{analyticsData.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MousePointer className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interactions</p>
                  <p className="text-lg font-semibold">{analyticsData.totalInteractions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">{analyticsData.totalConversions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-semibold">{metrics.conversionRate}%</p>
                    {metrics.conversionRate > 5 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Audience
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Over Time</CardTitle>
                <CardDescription>
                  Views and conversions trend for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart data={lineChartData} />
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Interaction Rate</Label>
                    <span className="text-sm font-medium">{metrics.interactionRate}%</span>
                  </div>
                  <Progress value={metrics.interactionRate} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Conversion Rate</Label>
                    <span className="text-sm font-medium">{metrics.conversionRate}%</span>
                  </div>
                  <Progress value={metrics.conversionRate} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Bounce Rate</Label>
                    <span className="text-sm font-medium">{metrics.bounceRate}%</span>
                  </div>
                  <Progress value={metrics.bounceRate} className="h-2" />
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg. Session Duration</span>
                    <Badge variant="outline">
                      {Math.floor(metrics.avgSessionDuration / 60)}m {metrics.avgSessionDuration % 60}s
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Device Breakdown</CardTitle>
                <CardDescription>
                  How users access your widget across different devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleDoughnutChart data={deviceChartData} />
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Traffic Sources</CardTitle>
                <CardDescription>
                  Where your widget visitors are coming from
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.topSources?.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-background rounded">
                          <Globe className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{source.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.conversions} conversions
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {source.views.toLocaleString()} views
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No traffic source data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* AI-Powered Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Performance Insights
              </CardTitle>
              <CardDescription>
                AI-powered recommendations to improve your widget performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.conversionRate < 3 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-amber-100 rounded">
                      <TrendingDown className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Low Conversion Rate</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Your conversion rate is below average. Consider simplifying your form or improving your call-to-action.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metrics.bounceRate > 60 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-red-100 rounded">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-red-800">High Bounce Rate</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Many users are leaving without interacting. Try improving your welcome message or visual design.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metrics.conversionRate > 5 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 rounded">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Great Performance!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your widget is performing well with a {metrics.conversionRate}% conversion rate.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Recommendations */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Optimization Recommendations</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span>Test different call-to-action button colors</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="w-3 h-3 text-purple-500" />
                    <span>Optimize for mobile users (they represent the majority)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3 h-3 text-green-500" />
                    <span>Add social proof or testimonials</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetAnalyticsDashboard;

