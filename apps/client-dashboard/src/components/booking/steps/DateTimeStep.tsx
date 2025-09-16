import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  TenantInfo,
  TimeSlot,
  AvailabilityResponse,
} from "@/types/booking-api";
import { searchAvailability } from "@/api/booking-proxy";
import { format, addDays, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";

interface DateTimeStepProps {
  tenant: TenantInfo;
  partySize: number;
  onComplete: (data: { slot: TimeSlot }) => void;
  onBack: () => void;
  loading: boolean;
}

const DateTimeStep: React.FC<DateTimeStepProps> = ({
  tenant,
  partySize,
  onComplete,
  onBack,
  loading: parentLoading,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = tenant.timezone || "UTC";

  const getBusinessHoursForDate = (date: Date) => {
    const day = date.getDay(); // 0-6 (Sun-Sat)
    const bh = (tenant as any).business_hours as Array<{ day_of_week: number; is_open: boolean; open_time: string | null; close_time: string | null }> | undefined;
    if (!Array.isArray(bh)) return null;
    const rec = bh.find((r) => r.day_of_week === day);
    return rec || null;
  };

  const fetchAvailability = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    setError(null);

    try {
      const searchRequest = {
        tenant_id: tenant.tenant_id,
        party_size: Number(partySize), // Ensure it's a number
        service_date: format(date, "yyyy-MM-dd"), // Plain date string in YYYY-MM-DD format
      };

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout - please try again")),
          15000,
        ),
      );

      const result = (await Promise.race([
        searchAvailability(searchRequest),
        timeoutPromise,
      ])) as AvailabilityResponse;

      console.log("Availability search result:", result);
      setAvailability(result);

      if (result && result.slots && result.slots.length === 0) {
        toast("No availability found for this date", {
          description: "Try selecting a different date or party size",
        });
      }
    } catch (err) {
      const error = err as Error;
      console.error("Availability search failed:", error);

      // Handle specific error types
      let errorMessage = "Failed to load availability";
      if (error.message.includes("timeout")) {
        errorMessage = "Request timed out - please try again";
      } else if (error.message.includes("TENANT_NOT_FOUND")) {
        errorMessage = "Restaurant configuration not found";
      } else if (error.message.includes("EDGE_FUNCTION_ERROR")) {
        errorMessage = "Service temporarily unavailable";
      } else if (error.message.includes("NETWORK_ERROR")) {
        errorMessage = "Network connection issue";
      } else {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error("Failed to load availability", {
        description: errorMessage,
      });
    } finally {
      setLoadingSlots(false);
    }
  }, [tenant.tenant_id, partySize]);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate, partySize, tenant.tenant_id, fetchAvailability]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    onComplete({ slot });
  };

  const formatSlotTime = (timeISO: string) => {
    return formatInTimeZone(parseISO(timeISO), timezone, "h:mm a");
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    // Disable closed days according to tenant business hours (if present)
    const bh = getBusinessHoursForDate(date);
    if (bh && bh.is_open === false) return true;
    return false;
  };

  const isSlotOutsideBusinessHours = (slotIso: string) => {
    const slot = parseISO(slotIso);
    const bh = getBusinessHoursForDate(slot);
    if (!bh || bh.is_open === false) return true;
    const [openH, openM] = (bh.open_time || "00:00:00").split(":").map((v) => parseInt(v, 10));
    const [closeH, closeM] = (bh.close_time || "23:59:59").split(":").map((v) => parseInt(v, 10));
    const minutes = slot.getHours() * 60 + slot.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);
    return minutes < openMinutes || minutes >= closeMinutes;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Date & Time
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Party of {partySize} • {tenant.name}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Date picker */}
          <div>
            <h3 className="font-medium mb-4">Choose a date</h3>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                fromDate={new Date()}
                toDate={addDays(new Date(), 60)}
                className="rounded-lg border shadow-sm w-full max-w-sm bg-card"
                showOutsideDays={false}
              />
            </div>
          </div>

          {/* Time slots */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Available times</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAvailability(selectedDate)}
                disabled={loadingSlots || parentLoading}
                aria-busy={loadingSlots}
                aria-live="polite"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingSlots ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-2">
                  Failed to load availability
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAvailability(selectedDate)}
                >
                  Try Again
                </Button>
              </div>
            ) : !availability || availability.slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No availability for this date</p>
                <p className="text-sm">Try selecting a different date</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main slots with compact cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availability.slots
                    .filter((slot) => !isSlotOutsideBusinessHours(slot.time))
                    .map((slot, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={parentLoading || loadingSlots}
                      className="relative p-4 rounded-xl border-2 border-surface-3 hover:border-brand/50 bg-surface/50 hover:bg-surface transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-lg hover:shadow-brand/10"
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      {/* Time Display */}
                      <div className="text-center mb-3">
                        <div className="text-lg font-bold text-text group-hover:text-brand transition-colors">
                          {formatSlotTime(slot.time)}
                        </div>

                        {/* Enhanced Capacity Pill */}
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                            slot.available_tables <= 2
                              ? "bg-destructive/10 text-destructive"
                              : slot.available_tables <= 5
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              slot.available_tables <= 2
                                ? "bg-destructive animate-pulse"
                                : slot.available_tables <= 5
                                  ? "bg-warning"
                                  : "bg-success"
                            }`}
                          />
                          {slot.available_tables} available
                        </div>
                      </div>

                      {/* Enhanced Badges - Only show if API provides these flags */}
                      <div className="flex flex-wrap justify-center gap-1 mb-2">
                        {slot.optimal && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs px-2 py-0.5 bg-success/10 text-success border-success/20 shadow-sm"
                            >
                              <TrendingUp className="w-2.5 h-2.5 mr-1" />
                              Optimal
                            </Badge>
                          </motion.div>
                        )}
                        {slot.revenue_projection && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0.5 bg-warning/10 text-warning border-warning/20 shadow-sm"
                            >
                              💰 ${slot.revenue_projection}
                            </Badge>
                          </motion.div>
                        )}
                        {slot.available_tables <= 2 && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive border-destructive/20 shadow-sm animate-pulse"
                            >
                              ⚡ Limited
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      {/* Enhanced hover effect overlay */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />

                      {/* Subtle shine effect on hover */}
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0"
                        whileHover={{
                          opacity: [0, 1, 0],
                          x: ["-100%", "100%"],
                        }}
                        transition={{ duration: 0.8 }}
                      />
                    </motion.button>
                  ))}
                </div>

                {/* Alternative times if provided by API */}
                {availability.alternatives &&
                  availability.alternatives.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                        Alternative times
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availability.alternatives.map((slot, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full h-auto p-3 flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleSlotSelect(slot)}
                            disabled={parentLoading}
                          >
                            <div className="font-medium">
                              {formatSlotTime(slot.time)}
                            </div>
                            <div className="text-xs">
                              {slot.available_tables} available
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Back button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={parentLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Change Party Size
        </Button>
      </div>
    </div>
  );
};

export default DateTimeStep;
