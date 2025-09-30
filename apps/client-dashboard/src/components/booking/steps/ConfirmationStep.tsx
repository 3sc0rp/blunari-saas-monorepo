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
  const [idemKey] = useState(() => `booking:${crypto.randomUUID()}`);

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
    console.log('[ConfirmationStep] === STARTING BOOKING CONFIRMATION ===');
    console.log('[ConfirmationStep] Current state:', {
      hasTenant: !!tenant,
      tenantId: tenant?.tenant_id,
      partySize: party_size,
      selectedSlot: selected_slot,
      hasGuestDetails: !!guest_details,
      guestEmail: guest_details?.email,
      idemKey
    });
    
    // Check URL token
    const urlToken = new URLSearchParams(window.location.search).get('token');
    console.log('[ConfirmationStep] URL token present:', !!urlToken);
    console.log('[ConfirmationStep] URL token preview:', urlToken?.substring(0, 20) + '...');
    
    if (!tenant || !party_size || !selected_slot || !guest_details) {
      const missingItems = [];
      if (!tenant) missingItems.push('tenant');
      if (!party_size) missingItems.push('party_size');
      if (!selected_slot) missingItems.push('selected_slot');
      if (!guest_details) missingItems.push('guest_details');
      
      console.error('[ConfirmationStep] Missing required data:', missingItems);
      onError(new Error(`Missing required booking information: ${missingItems.join(', ')}`));
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Create hold
      console.log('[ConfirmationStep] Step 1: Creating hold with data:', {
        tenant_id: tenant.tenant_id,
        party_size,
        slot: selected_slot,
        idemKey
      });
      
      const hold = await measureStep("Creating hold", async () => {
        const holdResult = await createHold({
          tenant_id: tenant.tenant_id,
          party_size,
          slot: selected_slot,
        }, idemKey);
        console.log('[ConfirmationStep] Hold creation result:', holdResult);
        return holdResult;
      });

      // Step 2: Confirm reservation with idempotency
      const idempotencyKey = idemKey;
      console.log('[ConfirmationStep] Step 2: Confirming reservation with hold_id:', hold.hold_id);
      console.log('[ConfirmationStep] Using idempotency key:', idempotencyKey);

      const confirmedReservation = await measureStep(
        "Confirming reservation",
        async () => {
          const confirmationData: any = {
            tenant_id: tenant.tenant_id,
            hold_id: hold.hold_id,
            guest_details,
          };

          if ((guest_details as any)?.payment_intent_id) {
            confirmationData.deposit = {
              required: true,
              amount_cents: Math.round(((window as any).__widget_deposit_policy?.amount || 0) * 100),
              paid: true,
              payment_intent_id: (guest_details as any).payment_intent_id
            };
            console.log('[ConfirmationStep] Including deposit data:', confirmationData.deposit);
          }

          console.log('[ConfirmationStep] Final confirmation data:', confirmationData);
          
          const result = await confirmReservation(confirmationData, idempotencyKey);
          console.log('[ConfirmationStep] Confirmation result:', result);
          return result;
        },
      );

      // Additional verification step
      console.log('[ConfirmationStep] Reservation created:', confirmedReservation);
      
      // Wait a moment and verify the booking was actually created
      setTimeout(async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: verifyBooking } = await supabase
            .from('bookings')
            .select('id, status, guest_name, booking_time')
            .eq('id', confirmedReservation.reservation_id)
            .maybeSingle();
            
          if (!verifyBooking) {
            console.error('[ConfirmationStep] Verification failed - booking not found in database');
            toast.error('Booking verification failed. Please check your reservations or contact support.');
          } else {
            console.log('[ConfirmationStep] Booking verified successfully:', verifyBooking);
          }
        } catch (verifyError) {
          console.warn('[ConfirmationStep] Verification check failed:', verifyError);
        }
      }, 2000);

      setReservation(confirmedReservation);
      setCurrentStatus("completed");
      onComplete(confirmedReservation);
    } catch (error) {
      console.error('[ConfirmationStep] Booking confirmation failed:', error);
      console.error('Booking details:', {
        tenant_id: tenant?.tenant_id,
        party_size,
        selected_slot,
        guest_details
      });
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
    const displayPartySize = Number(
      reservation.summary.party_size || party_size || 0,
    );
    const displayDateISO =
      reservation.summary.date || selected_slot?.time || new Date().toISOString();
    const displayConfirmationNumber =
      reservation.confirmation_number &&
      reservation.confirmation_number !== "CONFXXXXXX"
        ? reservation.confirmation_number
        : reservation.reservation_id
          ? `CONF${String(reservation.reservation_id).slice(-6).toUpperCase()}`
          : "PENDING";
    
    // Debug logging to see what status we actually got
    if (import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[ConfirmationStep] Reservation object:', reservation);
      console.log('[ConfirmationStep] Status:', reservation.status);
      console.log('[ConfirmationStep] Is pending?:', reservation.status === 'pending');
    }
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <Card>
          <CardContent className="pt-6">
            {reservation.status === 'pending' ? (
              <>
                <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Reservation Submitted</h2>
                <p className="text-muted-foreground mb-6">
                  Your request is pending approval. You will receive an email once it is reviewed.
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Booking Confirmed</h2>
                <p className="text-muted-foreground mb-6">
                  Your table has been reserved successfully.
                </p>
              </>
            )}

            <div className={`${reservation.status === 'pending' ? 'bg-orange-50 dark:bg-orange-950' : 'bg-green-50 dark:bg-green-950'} p-4 rounded-lg mb-6`}>
              <div className="text-lg font-semibold mb-2">
                {reservation.status === 'pending' ? 'Request' : 'Confirmation'} #{displayConfirmationNumber}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Restaurant:</span>
                  <span className="font-medium">{tenant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="font-medium">
                    {formatDateTime(displayDateISO)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Party Size:</span>
                  <span className="font-medium">
                    {displayPartySize} guests
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

            {reservation.status === 'pending' ? (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• The restaurant will review your request</li>
                  <li>• You'll receive an email once it's approved or declined</li>
                  <li>• This usually takes a few hours during business hours</li>
                </ul>
              </div>
            ) : null}
            
            <div className="text-sm text-muted-foreground">
              {reservation.status === 'pending' 
                ? `A confirmation email has been sent to ${guest_details?.email}` 
                : `A confirmation email has been sent to ${guest_details?.email}`}
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
