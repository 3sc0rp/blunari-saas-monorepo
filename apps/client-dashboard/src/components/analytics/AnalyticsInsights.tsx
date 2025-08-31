import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Lightbulb, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';

export interface InsightData {
  type: 'peak' | 'timing' | 'performance' | 'alert';
  title: string;
  value: string;
  description?: string;
  confidence?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface AnalyticsInsightsProps {
  insights: InsightData[];
  className?: string;
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ 
  insights, 
  className = "" 
}) => {
  if (!insights || insights.length === 0) {
    return null;
  }

  const getInsightIcon = (type: InsightData['type']) => {
    switch (type) {
      case 'peak':
        return <TrendingUp className="h-4 w-4" />;
      case 'timing':
        return <Clock className="h-4 w-4" />;
      case 'performance':
        return <Users className="h-4 w-4" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: InsightData['type']) => {
    switch (type) {
      case 'peak':
        return 'text-success';
      case 'timing':
        return 'text-brand';
      case 'performance':
        return 'text-accent';
      case 'alert':
        return 'text-warning';
      default:
        return 'text-text-muted';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-success/10 text-success border-success/20';
    if (confidence >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-danger/10 text-danger border-danger/20';
  };

  return (
    <Card className={`bg-gradient-to-br from-brand/5 to-accent/5 border-brand/10 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-brand" />
          <h3 className="text-h4 font-semibold text-text">Insights</h3>
        </div>
        
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-md bg-surface/50 border border-surface-2"
            >
              <div className={`mt-0.5 ${getInsightColor(insight.type)}`}>
                {getInsightIcon(insight.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-body-sm font-medium text-text">
                      {insight.title}
                    </h4>
                    <p className="text-lg font-bold text-text font-tabular">
                      {insight.value}
                    </p>
                    {insight.description && (
                      <p className="text-xs text-text-muted mt-1">
                        {insight.description}
                      </p>
                    )}
                  </div>
                  
                  {insight.confidence && (
                    <Badge 
                      variant="outline"
                      className={`text-xs ${getConfidenceColor(insight.confidence)}`}
                    >
                      {insight.confidence}% confidence
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};