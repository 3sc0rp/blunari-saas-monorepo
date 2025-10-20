/**
 * ML Model Status Component
 * 
 * Displays status and metrics for all ML models.
 */

import React from 'react';
import { Brain, TrendingUp, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MLModelStatusProps {
  tenantId: string;
}

export function MLModelStatus({ tenantId }: MLModelStatusProps) {
  // Fetch ML models
  const {
    data: models,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ml-models', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_trained_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!tenantId,
  });

  // Fetch recent predictions count
  const { data: predictionCounts } = useQuery({
    queryKey: ['prediction-counts', tenantId],
    queryFn: async () => {
      if (!models) return {};

      const counts: Record<string, number> = {};

      for (const model of models) {
        const { count, error } = await supabase
          .from('ml_predictions')
          .select('*', { count: 'exact', head: true })
          .eq('model_id', model.id);

        if (!error && count !== null) {
          counts[model.id] = count;
        }
      }

      return counts;
    },
    enabled: !!models && models.length > 0,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'training':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'retired':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'training':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'retired':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getModelTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load ML model status. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Brain className="h-8 w-8 text-muted-foreground animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          ML Model Status
        </h2>
        <p className="text-muted-foreground">
          Performance and health of your AI models
        </p>
      </div>

      {/* Models Overview */}
      {models && models.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(model.status)}
                      {getModelTypeLabel(model.model_type)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      v{model.version}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(model.status)}>
                    {model.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Accuracy Score */}
                {model.accuracy_score && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium">
                        {(model.accuracy_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={model.accuracy_score * 100} className="h-2" />
                  </div>
                )}

                {/* Training Data */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Training Data</span>
                  <span className="font-medium">
                    {model.training_data_count?.toLocaleString() || 0} points
                  </span>
                </div>

                {/* Predictions Made */}
                {predictionCounts && predictionCounts[model.id] !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Predictions</span>
                    <span className="font-medium">
                      {predictionCounts[model.id].toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Last Trained */}
                {model.last_trained_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Trained{' '}
                      {new Date(model.last_trained_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Metrics (if available) */}
                {model.metrics && Object.keys(model.metrics).length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Performance Metrics
                    </div>
                    <div className="space-y-1">
                      {Object.entries(model.metrics).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium">
                            {typeof value === 'number'
                              ? value.toFixed(4)
                              : value.toString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hyperparameters (collapsed) */}
                {model.hyperparameters && Object.keys(model.hyperparameters).length > 0 && (
                  <details className="pt-2 border-t">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
                      Hyperparameters
                    </summary>
                    <div className="space-y-1 mt-2">
                      {Object.entries(model.hyperparameters).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium">
                            {typeof value === 'number'
                              ? value.toFixed(4)
                              : value.toString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No ML Models</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              AI models will be automatically created when you use features like demand forecasting,
              menu recommendations, or dynamic pricing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {models && models.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Models</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {models.filter((m) => m.status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {models
                  .filter((m) => m.accuracy_score)
                  .reduce((sum, m) => sum + (m.accuracy_score || 0), 0) /
                  models.filter((m) => m.accuracy_score).length || 0}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {predictionCounts
                  ? Object.values(predictionCounts).reduce((sum, count) => sum + count, 0)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
