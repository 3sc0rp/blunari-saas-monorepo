import React from 'react';
import { motion } from 'framer-motion';
import { User, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GuestDetails, GuestDetailsSchema, TenantInfo } from '@/types/booking-api';

interface GuestDetailsStepProps {
  tenant: TenantInfo;
  onComplete: (data: { guest_details: GuestDetails }) => void;
  onBack: () => void;
  loading: boolean;
}

const GuestDetailsStep: React.FC<GuestDetailsStepProps> = ({ 
  tenant, 
  onComplete, 
  onBack, 
  loading 
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<GuestDetails>({
    resolver: zodResolver(GuestDetailsSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: GuestDetails) => {
    onComplete({ guest_details: data });
  };

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
                  {...register('first_name')}
                  placeholder="John"
                  disabled={loading}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Doe"
                  disabled={loading}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">
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
                {...register('email')}
                placeholder="john@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Special requests */}
            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests (Optional)</Label>
              <Textarea
                id="special_requests"
                {...register('special_requests')}
                placeholder="Allergies, accessibility needs, celebration notes..."
                rows={3}
                disabled={loading}
              />
              {errors.special_requests && (
                <p className="text-sm text-destructive">
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
                disabled={!isValid || loading}
                style={{ backgroundColor: tenant.branding?.primary_color }}
              >
                {loading ? 'Processing...' : 'Continue to Confirmation'}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>

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