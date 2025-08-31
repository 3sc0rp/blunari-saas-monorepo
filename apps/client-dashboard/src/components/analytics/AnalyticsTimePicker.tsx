import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type TimePeriod = '7d' | '30d' | '90d' | 'custom';

interface TimeRange {
  from: Date;
  to: Date;
  label: string;
}

interface AnalyticsTimePickerProps {
  activePeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod, range: TimeRange) => void;
  customRange?: TimeRange;
  showComparison?: boolean;
  onComparisonToggle?: (enabled: boolean) => void;
  comparisonEnabled?: boolean;
}

export const AnalyticsTimePicker: React.FC<AnalyticsTimePickerProps> = ({
  activePeriod,
  onPeriodChange,
  customRange,
  showComparison = true,
  onComparisonToggle,
  comparisonEnabled = false
}) => {
  const getTimeRange = (period: TimePeriod): TimeRange => {
    const now = new Date();
    
    switch (period) {
      case '7d':
        return {
          from: subDays(now, 7),
          to: now,
          label: 'Last 7 days'
        };
      case '30d':
        return {
          from: subDays(now, 30),
          to: now,
          label: 'Last 30 days'
        };
      case '90d':
        return {
          from: subDays(now, 90),
          to: now,
          label: 'Last 90 days'
        };
      case 'custom':
        return customRange || {
          from: subDays(now, 30),
          to: now,
          label: 'Custom range'
        };
      default:
        return getTimeRange('30d');
    }
  };

  const handlePeriodSelect = (period: TimePeriod) => {
    const range = getTimeRange(period);
    onPeriodChange(period, range);
  };

  const currentRange = getTimeRange(activePeriod);

  const presets = [
    { value: '7d' as TimePeriod, label: '7D' },
    { value: '30d' as TimePeriod, label: '30D' },
    { value: '90d' as TimePeriod, label: '90D' },
    { value: 'custom' as TimePeriod, label: 'Custom' }
  ];

  return (
    <Card className="bg-surface-2 border-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-text-muted" />
            <div>
              <div className="text-body-sm font-medium text-text">
                {currentRange.label}
              </div>
              <div className="text-xs text-text-muted">
                {format(currentRange.from, 'MMM dd')} – {format(currentRange.to, 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Time Period Presets */}
            <div className="flex rounded-md bg-surface border border-surface-3">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={activePeriod === preset.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePeriodSelect(preset.value)}
                  className={`rounded-none border-0 text-xs ${
                    activePeriod === preset.value 
                      ? 'bg-brand text-brand-foreground' 
                      : 'hover:bg-surface-2'
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Comparison Toggle */}
            {showComparison && (
              <Button
                variant={comparisonEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onComparisonToggle?.(!comparisonEnabled)}
                className="text-xs"
              >
                vs Previous
              </Button>
            )}
          </div>
        </div>

        {/* Comparison Period Display */}
        {comparisonEnabled && (
          <div className="mt-3 pt-3 border-t border-surface-3">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Comparing to previous period</span>
              <span>
                {format(subDays(currentRange.from, (currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)), 'MMM dd')} – {format(subDays(currentRange.to, (currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};