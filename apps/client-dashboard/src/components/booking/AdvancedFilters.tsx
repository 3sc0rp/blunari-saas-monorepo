import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookingFilters, BookingStatus, BookingSource } from '@/types/booking';
import { CalendarIcon, Filter, Users, Search, X, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface AdvancedFiltersProps {
  filters: BookingFilters;
  onFiltersChange: (filters: BookingFilters) => void;
  totalBookings: number;
  onExportCSV: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  totalBookings,
  onExportCSV
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const statusOptions: { value: BookingStatus; label: string; color: string }[] = [
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'seated', label: 'Seated', color: 'bg-green-500' },
    { value: 'completed', label: 'Completed', color: 'bg-purple-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
    { value: 'noshow', label: 'No Show', color: 'bg-gray-500' }
  ];

  const sourceOptions: { value: BookingSource; label: string }[] = [
    { value: 'phone', label: 'Phone' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'website', label: 'Website' },
    { value: 'social', label: 'Social Media' },
    { value: 'partner', label: 'Partner' }
  ];

  const updateFilters = (newFilters: Partial<BookingFilters>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const handleStatusToggle = (status: BookingStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatus });
  };

  const handleSourceToggle = (source: BookingSource) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    updateFilters({ sources: newSources });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      updateFilters({
        dateRange: {
          start: range.from.toISOString().split('T')[0],
          end: range.to?.toISOString().split('T')[0] || range.from.toISOString().split('T')[0]
        }
      });
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    onFiltersChange({
      status: [],
      dateRange: { start: '', end: '' },
      sources: [],
      search: ''
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.dateRange.start) count++;
    if (filters.partySize?.min || filters.partySize?.max) count++;
    if (filters.search) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {totalBookings} bookings
            </Badge>
            <Button variant="outline" size="sm" onClick={onExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or special requests..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Quick Filters & Advanced Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Quick Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                  ) : (
                    dateRange.from.toLocaleDateString()
                  )
                ) : (
                  'Date Range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePickerWithRange 
                selected={dateRange}
                onSelect={handleDateRangeChange}
              />
            </PopoverContent>
          </Popover>

          {/* Advanced Filters Toggle */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 relative">
                <Filter className="h-4 w-4 mr-2" />
                Advanced
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Advanced Filters</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status.value}`}
                          checked={filters.status.includes(status.value)}
                          onCheckedChange={() => handleStatusToggle(status.value)}
                        />
                        <Label 
                          htmlFor={`status-${status.value}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                          {status.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Booking Source</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {sourceOptions.map((source) => (
                      <div key={source.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source.value}`}
                          checked={filters.sources.includes(source.value)}
                          onCheckedChange={() => handleSourceToggle(source.value)}
                        />
                        <Label 
                          htmlFor={`source-${source.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {source.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Party Size Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Party Size</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="minPartySize" className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        id="minPartySize"
                        type="number"
                        placeholder="1"
                        value={filters.partySize?.min || ''}
                        onChange={(e) => updateFilters({
                          partySize: { 
                            ...filters.partySize, 
                            min: e.target.value ? parseInt(e.target.value) : undefined 
                          }
                        })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPartySize" className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        id="maxPartySize"
                        type="number"
                        placeholder="12"
                        value={filters.partySize?.max || ''}
                        onChange={(e) => updateFilters({
                          partySize: { 
                            ...filters.partySize, 
                            max: e.target.value ? parseInt(e.target.value) : undefined 
                          }
                        })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Filter Tags */}
          {filters.status.length > 0 && (
            <Badge variant="secondary" className="h-8">
              Status: {filters.status.length}
            </Badge>
          )}
          {filters.sources.length > 0 && (
            <Badge variant="secondary" className="h-8">
              Sources: {filters.sources.length}
            </Badge>
          )}
          {filters.dateRange.start && (
            <Badge variant="secondary" className="h-8">
              Date Range
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;