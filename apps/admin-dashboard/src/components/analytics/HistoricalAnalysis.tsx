import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  LineChart as LineChartIcon,
  Target,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

export const HistoricalAnalysis: React.FC = () => {
  const [timeframe, setTimeframe] = useState<string>('6-months');
  const [metric, setMetric] = useState<string>('revenue');

  // Mock historical data
  const historicalData = {
    revenue: [
      { period: 'Jan', value: 45000, growth: 12.5 },
      { period: 'Feb', value: 52000, growth: 15.6 },
      { period: 'Mar', value: 48000, growth: -7.7 },
      { period: 'Apr', value: 61000, growth: 27.1 },
      { period: 'May', value: 55000, growth: -9.8 },
      { period: 'Jun', value: 67000, growth: 21.8 },
    ],
    tenants: [
      { period: 'Jan', value: 285, growth: 8.2 },
      { period: 'Feb', value: 292, growth: 2.5 },
      { period: 'Mar', value: 301, growth: 3.1 },
      { period: 'Apr', value: 318, growth: 5.6 },
      { period: 'May', value: 329, growth: 3.5 },
      { period: 'Jun', value: 342, growth: 4.0 },
    ],
    bookings: [
      { period: 'Jan', value: 8450, growth: 15.2 },
      { period: 'Feb', value: 9120, growth: 7.9 },
      { period: 'Mar', value: 8890, growth: -2.5 },
      { period: 'Apr', value: 10200, growth: 14.7 },
      { period: 'May', value: 11500, growth: 12.7 },
      { period: 'Jun', value: 12850, growth: 11.7 },
    ]
  };

  const performanceIndicators = [
    {
      title: 'Revenue Growth Rate',
      value: '+18.5%',
      trend: 'up',
      description: 'Average monthly growth over period',
      color: 'text-success'
    },
    {
      title: 'Customer Acquisition',
      value: '+12.3%',
      trend: 'up',
      description: 'New tenant acquisition rate',
      color: 'text-primary'
    },
    {
      title: 'Booking Volume',
      value: '+52.1%',
      trend: 'up',
      description: 'Total booking growth',
      color: 'text-accent'
    },
    {
      title: 'Churn Rate',
      value: '-2.1%',
      trend: 'down',
      description: 'Customer retention improvement',
      color: 'text-warning'
    }
  ];

  const keyInsights = [
    {
      title: 'Peak Performance Period',
      description: 'April showed the highest revenue growth at 27.1%',
      impact: 'high',
      date: 'April 2024'
    },
    {
      title: 'Consistent Growth',
      description: 'Tenant base has grown consistently for 6 months',
      impact: 'medium',
      date: 'Jan-Jun 2024'
    },
    {
      title: 'Booking Acceleration',
      description: 'Booking volume shows accelerating growth trend',
      impact: 'high',
      date: 'Recent trend'
    }
  ];

  const currentData = historicalData[metric as keyof typeof historicalData] || historicalData.revenue;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historical Analysis
              </CardTitle>
              <CardDescription>
                Analyze trends and patterns over time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-months">Last 3 months</SelectItem>
                  <SelectItem value="6-months">Last 6 months</SelectItem>
                  <SelectItem value="1-year">Last year</SelectItem>
                  <SelectItem value="2-years">Last 2 years</SelectItem>
                </SelectContent>
              </Select>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="tenants">Tenants</SelectItem>
                  <SelectItem value="bookings">Bookings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Value Trend</CardTitle>
                    <CardDescription>Historical {metric} progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={currentData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [
                            typeof value === 'number' ? value.toLocaleString() : value, 
                            metric.charAt(0).toUpperCase() + metric.slice(1)
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Growth Rate</CardTitle>
                    <CardDescription>Month-over-month growth percentage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={currentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Growth Rate']}
                        />
                        <Bar 
                          dataKey="growth" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {performanceIndicators.map((indicator, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            {indicator.title}
                          </span>
                          {indicator.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${indicator.color}`}>
                          {indicator.value}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {indicator.description}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Period Comparison</CardTitle>
                  <CardDescription>Compare performance across different time periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currentData[0]?.value.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Starting Period ({currentData[0]?.period})
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {currentData[currentData.length - 1]?.value.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Latest Period ({currentData[currentData.length - 1]?.period})
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">
                        +{Math.round(((currentData[currentData.length - 1]?.value - currentData[0]?.value) / currentData[0]?.value) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Growth
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Key Insights</h3>
                {keyInsights.map((insight, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge 
                              variant={insight.impact === 'high' ? 'default' : 'secondary'}
                            >
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{insight.description}</p>
                          <div className="text-sm text-muted-foreground">
                            {insight.date}
                          </div>
                        </div>
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="forecasting" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Predictive Analysis</CardTitle>
                  <CardDescription>
                    Based on historical trends and current patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-medium">Next 3 Months Forecast</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span>Projected Revenue</span>
                          <span className="font-bold text-success">$185,000</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span>Expected Growth</span>
                          <span className="font-bold text-primary">+22%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span>New Tenants</span>
                          <span className="font-bold text-accent">45-60</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Risk Factors</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-warning border-warning/20">
                            Medium Risk
                          </Badge>
                          <span className="text-sm">Seasonal demand variation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-success border-success/20">
                            Low Risk
                          </Badge>
                          <span className="text-sm">Market competition</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-destructive border-destructive/20">
                            High Risk
                          </Badge>
                          <span className="text-sm">Economic uncertainty</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};