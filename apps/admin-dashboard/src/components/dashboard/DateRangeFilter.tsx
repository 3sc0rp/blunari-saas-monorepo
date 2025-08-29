import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

const presetRanges = [
  {
    label: 'Today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1))
    })
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Last 3 months',
    getValue: () => ({
      from: startOfDay(subMonths(new Date(), 3)),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Last 12 months',
    getValue: () => ({
      from: startOfDay(subMonths(new Date(), 12)),
      to: endOfDay(new Date())
    })
  }
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  onRefresh,
  isLoading = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const handlePresetSelect = (preset: string) => {
    const range = presetRanges.find(r => r.label === preset);
    if (range) {
      const newRange = range.getValue();
      onChange(newRange);
      setIsOpen(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({
        from: startOfDay(tempRange.from),
        to: endOfDay(tempRange.to)
      });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setTempRange({});
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange | null) => {
    if (!range) return 'All time';
    return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[240px]',
              !value && 'text-muted-foreground'
            )}
            aria-label="Select date range"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
          role="dialog"
          aria-label="Date range picker"
        >
          <div className="p-4 space-y-4">
            {/* Preset Ranges */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Select</Label>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger aria-label="Select preset date range">
                  <SelectValue placeholder="Choose a preset range" />
                </SelectTrigger>
                <SelectContent>
                  {presetRanges.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="from-date" className="text-xs">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="from-date"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        aria-label="Select start date"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {tempRange.from ? format(tempRange.from, 'MMM d') : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempRange.from}
                        onSelect={(date) => setTempRange(prev => ({ ...prev, from: date }))}
                        className="pointer-events-auto"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="to-date" className="text-xs">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="to-date"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        aria-label="Select end date"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {tempRange.to ? format(tempRange.to, 'MMM d') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempRange.to}
                        onSelect={(date) => setTempRange(prev => ({ ...prev, to: date }))}
                        className="pointer-events-auto"
                        disabled={(date) => tempRange.from ? date < tempRange.from : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                aria-label="Clear date range filter"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!tempRange.from || !tempRange.to}
                aria-label="Apply custom date range"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isLoading}
        aria-label="Refresh data"
        title="Refresh data"
      >
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      </Button>
    </div>
  );
};