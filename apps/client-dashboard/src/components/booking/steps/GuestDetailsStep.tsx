import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, ArrowLeft, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  GuestDetails,
  GuestDetailsSchema,
  TenantInfo,
} from "@/types/booking-api";

interface GuestDetailsStepProps {
  tenant: TenantInfo;
  onComplete: (data: { guest_details: GuestDetails }) => void;
  onBack: () => void;
  loading: boolean;
}

// Payment form component that uses Stripe Elements
const PaymentForm: React.FC<{ 
  onPaymentSuccess: (paymentIntentId: string) => void; 
  onPaymentError: (error: string) => void;
  amount: number;
  customerName: string;
  email: string;
  tenantId: string;
}> = ({ onPaymentSuccess, onPaymentError, amount, customerName, email, tenantId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!stripe || !elements) return;
    
    setProcessing(true);
    try {
      // Create deposit intent
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-deposit-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          amount: Math.round(amount * 100), // convert to cents
          email,
          description: `Deposit for ${customerName}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment intent');
      const { client_secret } = await response.json();

      // Confirm payment with card
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: customerName, email },
        },
      });

      if (error) {
        onPaymentError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
      } else {
        onPaymentError('Payment not completed');
      }
    } catch (err) {
      onPaymentError((err as Error)?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border rounded-md bg-background">
        <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px' } } }} />
      </div>
      <Button onClick={handlePayment} disabled={processing || !stripe || !elements} className="w-full">
        {processing ? 'Processing...' : `Pay $${amount} Deposit`}
      </Button>
    </div>
  );
};

const GuestDetailsStep: React.FC<GuestDetailsStepProps> = ({
  tenant,
  onComplete,
  onBack,
  loading,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<GuestDetails>({
    resolver: zodResolver(GuestDetailsSchema),
    mode: "onChange",
  });

  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Check if deposit is required based on policy stored from availability search
  const depositPolicy = (window as any).__widget_deposit_policy;
  const depositRequired = depositPolicy?.required;
  const depositAmount = depositPolicy?.amount;

  // Initialize Stripe when deposit is required
  useEffect(() => {
    if (depositRequired && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      setStripePromise(loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
    }
  }, [depositRequired]);

  const onSubmit = (data: GuestDetails) => {
    // If deposit required but not paid, don't proceed
    if (depositRequired && !paymentCompleted) {
      return; // Payment form handles this
    }
    
    // Pass payment info along with guest details
    onComplete({ 
      guest_details: {
        ...data,
        ...(paymentIntentId && { payment_intent_id: paymentIntentId })
      } as any
    });
  };

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    setPaymentCompleted(true);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Toast or error display could go here
  };

  const formData = watch();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Guest Details
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            We'll need some information to confirm your reservation
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  placeholder="John"
                  disabled={loading}
                  aria-invalid={!!errors.first_name}
                  aria-describedby={errors.first_name ? 'first_name_error' : undefined}
                />
                {errors.first_name && (
                  <p id="first_name_error" className="text-sm text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Doe"
                  disabled={loading}
                  aria-invalid={!!errors.last_name}
                  aria-describedby={errors.last_name ? 'last_name_error' : undefined}
                />
                {errors.last_name && (
                  <p id="last_name_error" className="text-sm text-destructive">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Contact fields */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
                disabled={loading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email_error' : undefined}
              />
              {errors.email && (
                <p id="email_error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone_error' : undefined}
              />
              {errors.phone && (
                <p id="phone_error" className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Special requests */}
            <div className="space-y-2">
              <Label htmlFor="special_requests">
                Special Requests (Optional)
              </Label>
              <Textarea
                id="special_requests"
                {...register("special_requests")}
                placeholder="Allergies, accessibility needs, celebration notes..."
                rows={3}
                disabled={loading}
                aria-invalid={!!errors.special_requests}
                aria-describedby={errors.special_requests ? 'special_requests_error' : undefined}
              />
              {errors.special_requests && (
                <p id="special_requests_error" className="text-sm text-destructive">
                  {errors.special_requests.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <motion.div
              className="pt-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || loading || (depositRequired && !paymentCompleted)}
                style={{ backgroundColor: tenant.branding?.primary_color }}
              >
                {loading ? "Processing..." : depositRequired && !paymentCompleted ? "Complete Payment First" : "Continue to Confirmation"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>

      {/* Deposit Payment */}
      {depositRequired && stripePromise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Deposit Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!paymentCompleted ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  amount={depositAmount}
                  customerName={formData.first_name + ' ' + (formData.last_name || '')}
                  email={formData.email || ''}
                  tenantId={tenant.tenant_id}
                />
              </Elements>
            ) : (
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  ✓ Deposit payment of ${depositAmount} completed successfully.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Back button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Change Date & Time
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="text-xs text-muted-foreground text-center">
        Your information is secure and will only be used for this reservation.
      </div>
    </div>
  );
};

export default GuestDetailsStep;
