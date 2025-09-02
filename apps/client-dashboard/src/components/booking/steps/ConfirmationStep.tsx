import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Loader2,
  DollarSign,
  Users,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookingState, ReservationResponse } from "@/types/booking-api";
import {
  createHold,
  confirmReservation,
  getTenantPolicies,
} from "@/api/booking-proxy";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import DepositSection from "../DepositSection";
import ROIPanel from "../ROIPanel";

interface ConfirmationStepProps {
  state: BookingState;
  onComplete: (reservation: ReservationResponse) => void;
  onError: (error: Error) => void;
  onBack: () => void;
  loading: boolean;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  state,
  onComplete,
  onError,
  onBack,
  loading: parentLoading,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>("ready");
  const [reservation, setReservation] = useState<ReservationResponse | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [stepTimes, setStepTimes] = useState<{ [key: string]: number }>({});

  const { tenant, party_size, selected_slot, guest_details } = state;

  useEffect(() => {
    // Load policies when component mounts
    if (tenant && !state.policies) {
      getTenantPolicies(tenant.tenant_id)
        .then((policies) => {
          // Update state with policies - this would need to be passed back up
          // For now, we'll handle deposit in this component
        })
        .catch((err) => {
          console.warn("Could not load policies:", err);
        });
    }
  }, [tenant, state.policies]);

  const measureStep = async <T,>(
    stepName: string,
    fn: () => Promise<T>,
  ): Promise<T> => {
    const start = Date.now();
    setCurrentStatus(stepName);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      setStepTimes((prev) => ({ ...prev, [stepName]: duration }));
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      setStepTimes((prev) => ({ ...prev, [stepName]: duration }));
      throw error;
    }
  };

  const handleConfirmBooking = async () => {
    if (!tenant || !party_size || !selected_slot || !guest_details) {
      onError(new Error("Missing required booking information"));
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Create hold
      const hold = await measureStep("Creating hold", async () => {
        return createHold({
          tenant_id: tenant.tenant_id,
          party_size,
          slot: selected_slot,
        });
      });

      // Step 2: Confirm reservation with idempotency
      const idempotencyKey = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const confirmedReservation = await measureStep(
        "Confirming reservation",
        async () => {
          return confirmReservation(
            {
              tenant_id: tenant.tenant_id,
              hold_id: hold.hold_id,
              guest_details,
            },
            idempotencyKey,
          );
        },
      );

      setReservation(confirmedReservation);
      setCurrentStatus("completed");
      onComplete(confirmedReservation);
    } catch (error) {
      onError(error as Error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (timeISO: string) => {
    const timezone = tenant?.timezone || "UTC";
    return formatInTimeZone(
      parseISO(timeISO),
      timezone,
      "EEEE, MMMM d, yyyy 'at' h:mm a",
    );
  };

  if (reservation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <Card>
          <CardContent className="pt-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">
              Your table has been reserved successfully
            </p>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-6">
              <div className="text-lg font-semibold mb-2">
                Confirmation #{reservation.confirmation_number}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Restaurant:</span>
                  <span className="font-medium">{tenant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="font-medium">
                    {formatDateTime(reservation.summary.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Party Size:</span>
                  <span className="font-medium">
                    {reservation.summary.party_size} guests
                  </span>
                </div>
                {reservation.summary.table_info && (
                  <div className="flex justify-between">
                    <span>Table:</span>
                    <span className="font-medium">
                      {reservation.summary.table_info}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {reservation.summary.deposit_required && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-medium">Deposit Required</span>
                </div>
                <p className="text-sm">
                  A deposit of ${reservation.summary.deposit_amount} will be
                  collected upon arrival.
                </p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              A confirmation email has been sent to {guest_details?.email}
            </div>
          </CardContent>
        </Card>

        {/* Performance metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(stepTimes).map(([step, duration]) => (
                <div key={step} className="flex justify-between">
                  <span className="capitalize">{step.replace("_", " ")}:</span>
                  <span className="font-mono">{duration}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ROI Panel - only shows if we have data */}
        <ROIPanel
          reservation={reservation}
          stepTimes={stepTimes}
          totalTime={Date.now() - state.start_time}
        />
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Confirm Your Reservation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Party of {party_size}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDateTime(selected_slot?.time || "")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{selected_slot?.available_tables} tables available</span>
              {selected_slot?.optimal && (
                <Badge variant="secondary">Optimal Time</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Guest details */}
          <div>
            <h3 className="font-medium mb-2">Guest Information</h3>
            <div className="text-sm space-y-1">
              <div>
                {guest_details?.first_name} {guest_details?.last_name}
              </div>
              <div>{guest_details?.email}</div>
              <div>{guest_details?.phone}</div>
              {guest_details?.special_requests && (
                <div className="text-muted-foreground mt-2">
                  <strong>Special requests:</strong>{" "}
                  {guest_details.special_requests}
                </div>
              )}
            </div>
          </div>

          {/* Deposit section - only if policies indicate it's required */}
          <DepositSection
            tenant={tenant!}
            reservation={{
              party_size: party_size!,
              date: selected_slot?.time || "",
            }}
          />

          {/* Enhanced Processing Status with Live Stepper */}
          {processing && (
            <motion.div
              className="bg-surface-2 p-6 rounded-xl border border-surface-3 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Status Stepper */}
              <div className="flex items-center justify-between mb-4">
                {["search", "hold", "confirm"].map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        currentStatus === step
                          ? "bg-brand text-white"
                          : stepTimes[step]
                            ? "bg-success text-white"
                            : "bg-surface-3 text-text-muted"
                      }`}
                    >
                      {stepTimes[step] ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : currentStatus === step ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < 2 && (
                      <div
                        className={`w-16 h-0.5 mx-2 ${
                          stepTimes[["search", "hold"][index]]
                            ? "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 animate-spin text-brand" />
                <span className="font-medium text-text">
                  {currentStatus === "search" &&
                    "Searching for availability..."}
                  {currentStatus === "hold" && "Holding your table..."}
                  {currentStatus === "confirm" && "Confirming reservation..."}
                  {currentStatus === "completed" && "Reservation confirmed!"}
                </span>
              </div>

              {/* Live Step Times */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                {["Search", "Hold", "Confirm"].map((label, index) => {
                  const stepKey = ["search", "hold", "confirm"][index];
                  const time = stepTimes[stepKey];
                  return (
                    <div key={label} className="text-center">
                      <div className="text-text-muted">{label}</div>
                      <div className="font-mono font-medium">
                        {time
                          ? `${time}ms`
                          : currentStatus === stepKey
                            ? "..."
                            : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Confirm button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full"
              onClick={handleConfirmBooking}
              disabled={processing || parentLoading}
              style={{ backgroundColor: tenant?.branding?.primary_color }}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming Reservation...
                </>
              ) : (
                "Confirm Reservation"
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Back button */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={processing || parentLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Edit Guest Details
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
