/**
 * Menu Recommendation Card Component
 * 
 * Displays AI-generated menu recommendations with confidence scores.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, DollarSign, Users } from 'lucide-react';
import { useMenuRecommendations } from '@/hooks/ai/useMenuRecommendations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MenuRecommendationCardProps {
  tenantId: string;
}

export function MenuRecommendationCard({ tenantId }: MenuRecommendationCardProps) {
  const [activeTab, setActiveTab] = React.useState<'general' | 'trending' | 'season'>('trending');

  const {
    recommendations,
    isLoading,
    generateRecommendations,
    isGenerating,
    trackInteraction,
    conversionRate,
  } = useMenuRecommendations(tenantId, activeTab);

  const handleGenerateRecommendations = () => {
    generateRecommendations({
      tenant_id: tenantId,
      recommendation_type: activeTab,
      limit: 10,
    });
  };

  const handleCardClick = (recommendationId: string) => {
    trackInteraction({ recommendationId, action: 'clicked' });
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Recommendations
          </h2>
          <p className="text-muted-foreground">
            Menu items likely to be popular based on trends and data
          </p>
        </div>
        <Button
          onClick={handleGenerateRecommendations}
          disabled={isGenerating || isLoading}
        >
          <Sparkles className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          {isGenerating ? 'Analyzing...' : 'Refresh Recommendations'}
        </Button>
      </div>

      {/* Conversion Rate */}
      {conversionRate > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recommendation Conversion Rate</span>
              <Badge variant="default">{(conversionRate * 100).toFixed(1)}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of shown recommendations that led to orders
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for recommendation types */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trending">🔥 Trending</TabsTrigger>
          <TabsTrigger value="general">⭐ Popular</TabsTrigger>
          <TabsTrigger value="season">🌸 Seasonal</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {recommendations && recommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec: any) => (
                <Card
                  key={rec.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                  onClick={() => handleCardClick(rec.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                          {rec.catering_packages?.name || 'Package'}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {rec.catering_packages?.description || rec.reason}
                        </CardDescription>
                      </div>
                      {rec.trend_direction && getTrendIcon(rec.trend_direction)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Confidence Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">AI Confidence</span>
                        <Badge variant={getConfidenceColor(rec.confidence_score)}>
                          {rec.confidence_score
                            ? `${(rec.confidence_score * 100).toFixed(0)}%`
                            : 'N/A'}
                        </Badge>
                      </div>
                      <Progress
                        value={rec.confidence_score ? rec.confidence_score * 100 : 0}
                        className="h-2"
                      />
                    </div>

                    {/* Popularity */}
                    {rec.predicted_popularity && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Predicted Popularity</span>
                          <span className="font-medium">
                            {rec.predicted_popularity}/100
                          </span>
                        </div>
                        <Progress value={rec.predicted_popularity} className="h-1" />
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      {rec.suggested_price && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              ${rec.suggested_price}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Suggested
                            </div>
                          </div>
                        </div>
                      )}

                      {rec.expected_orders_per_month && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {rec.expected_orders_per_month}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Orders/mo
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    {rec.reason && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground italic">
                          "{rec.reason}"
                        </p>
                      </div>
                    )}

                    {/* Seasonal Factor */}
                    {rec.seasonal_factor && rec.seasonal_factor !== 1.0 && (
                      <Badge variant="outline" className="w-full justify-center">
                        {rec.seasonal_factor > 1
                          ? `${((rec.seasonal_factor - 1) * 100).toFixed(0)}% above average`
                          : `${((1 - rec.seasonal_factor) * 100).toFixed(0)}% below average`}
                      </Badge>
                    )}

                    {/* Interaction Stats */}
                    {(rec.times_shown > 0 || rec.times_clicked > 0 || rec.times_ordered > 0) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Shown {rec.times_shown}x</span>
                        <span>Clicked {rec.times_clicked}x</span>
                        <span>Ordered {rec.times_ordered}x</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Generate AI-powered menu recommendations based on your order history and trends.
                </p>
                <Button onClick={handleGenerateRecommendations} disabled={isGenerating}>
                  <Sparkles className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
