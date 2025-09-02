import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { BookingFilters, BookingStatus, BookingSource } from "@/types/booking";
import { CalendarIcon, Search, X, Filter, Download, Plus } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface EnhancedFiltersProps {
  filters: BookingFilters;
  onFiltersChange: (filters: BookingFilters) => void;
  totalBookings: number;
  onExportCSV: () => void;
  onNewBooking: () => void;
}

const EnhancedFilters: React.FC<EnhancedFiltersProps> = ({
  filters,
  onFiltersChange,
  totalBookings,
  onExportCSV,
  onNewBooking,
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const statusOptions: {
    value: BookingStatus;
    label: string;
    color: string;
  }[] = [
    {
      value: "confirmed",
      label: "Confirmed",
      color: "bg-success text-success-foreground",
    },
    {
      value: "pending",
      label: "Pending",
      color: "bg-warning text-warning-foreground",
    },
    {
      value: "seated",
      label: "Seated",
      color: "bg-brand text-brand-foreground",
    },
    {
      value: "completed",
      label: "Completed",
      color: "bg-secondary text-secondary-foreground",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "bg-destructive text-destructive-foreground",
    },
    {
      value: "noshow",
      label: "No Show",
      color: "bg-surface-3 text-text-muted",
    },
  ];

  const sourceOptions: { value: BookingSource; label: string }[] = [
    { value: "phone", label: "Phone" },
    { value: "walk_in", label: "Walk-in" },
    { value: "website", label: "Website" },
    { value: "social", label: "Social Media" },
    { value: "partner", label: "Partner" },
  ];

  const updateFilters = useCallback(
    (newFilters: Partial<BookingFilters>) => {
      onFiltersChange({ ...filters, ...newFilters });
    },
    [filters, onFiltersChange],
  );

  const handleStatusToggle = useCallback(
    (status: BookingStatus) => {
      const newStatus = filters.status.includes(status)
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status];
      updateFilters({ status: newStatus });
    },
    [filters.status, updateFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from) {
        updateFilters({
          dateRange: {
            start: range.from.toISOString().split("T")[0],
            end:
              range.to?.toISOString().split("T")[0] ||
              range.from.toISOString().split("T")[0],
          },
        });
      }
    },
    [updateFilters],
  );

  const setQuickDatePreset = useCallback(
    (preset: string) => {
      const today = new Date();
      let range: DateRange | undefined;

      switch (preset) {
        case "today":
          range = { from: today, to: today };
          break;
        case "tomorrow": {
          const tomorrow = addDays(today, 1);
          range = { from: tomorrow, to: tomorrow };
          break;
        }
        case "this-week": {
          range = { from: startOfWeek(today), to: endOfWeek(today) };
          break;
        }
        case "next-week": {
          const nextWeek = addDays(today, 7);
          range = { from: startOfWeek(nextWeek), to: endOfWeek(nextWeek) };
          break;
        }
        case "this-weekend": {
          const saturday = addDays(startOfWeek(today), 6);
          const sunday = addDays(saturday, 1);
          range = { from: saturday, to: sunday };
          break;
        }
      }

      if (range) {
        setDateRange(range);
        handleDateRangeChange(range);
        setIsDatePickerOpen(false);
      }
    },
    [handleDateRangeChange],
  );

  const clearFilters = useCallback(() => {
    setDateRange(undefined);
    onFiltersChange({
      status: [],
      dateRange: { start: "", end: "" },
      sources: [],
      search: "",
      partySize: undefined,
    });
  }, [onFiltersChange]);

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
    <Card className="bg-surface border-surface-2">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-text">
              Search & Filter Bookings
            </CardTitle>
            <Badge variant="outline" className="bg-surface-2 text-text-muted">
              {totalBookings} total
            </Badge>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="bg-surface-2 border-surface-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={onNewBooking}
              className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-elev-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Bar - Prominent positioning */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search by guest name, email, phone, or special requests..."
            value={filters.search || ""}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10 h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand"
          />
        </div>

        {/* Grouped Filters */}
        <div className="space-y-4">
          {/* Date Filter with Range Selection and Quick Presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text">Date Range</Label>
            <div className="flex flex-wrap gap-2">
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-surface-2 border-surface-3 hover:bg-surface-3",
                      !dateRange && "text-text-muted",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-surface border-surface-2"
                  align="start"
                >
                  <div className="p-4 space-y-4">
                    {/* Quick Presets */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                        Quick Select
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickDatePreset("today")}
                          className="h-8 bg-surface-2 border-surface-3 text-text hover:bg-surface-3"
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickDatePreset("tomorrow")}
                          className="h-8 bg-surface-2 border-surface-3 text-text hover:bg-surface-3"
                        >
                          Tomorrow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickDatePreset("this-weekend")}
                          className="h-8 bg-surface-2 border-surface-3 text-text hover:bg-surface-3"
                        >
                          Weekend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickDatePreset("this-week")}
                          className="h-8 bg-surface-2 border-surface-3 text-text hover:bg-surface-3"
                        >
                          This Week
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-surface-3" />

                    {/* Date Range Picker */}
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                      className="pointer-events-auto bg-surface"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear Date Filter */}
              {dateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange(undefined);
                    updateFilters({ dateRange: { start: "", end: "" } });
                  }}
                  className="h-10 px-2 text-text-muted hover:text-text hover:bg-surface-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status Filter with Pill Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text">
              Booking Status
            </Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status.value}
                  variant={
                    filters.status.includes(status.value)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleStatusToggle(status.value)}
                  className={cn(
                    "h-8 rounded-full transition-all duration-200",
                    filters.status.includes(status.value)
                      ? `${status.color} shadow-elev-1 scale-105`
                      : "bg-surface-2 border-surface-3 text-text-muted hover:bg-surface-3 hover:text-text hover:border-brand/20",
                  )}
                >
                  <span className="capitalize">{status.label}</span>
                  {filters.status.includes(status.value) && (
                    <X className="ml-2 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Advanced Filters Collapsible */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-muted">
                  {activeFilterCount} active filter
                  {activeFilterCount !== 1 ? "s" : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-text-muted hover:text-text hover:bg-surface-3"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedFilters;
