import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Clock,
  Calendar,
  Users,
  MapPin,
  Mail,
  Phone,
  UtensilsCrossed,
  Loader2,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Public Booking Tracking Page
 * Allows customers to track their reservation status
 * Access via: /booking/:bookingId?email=customer@email.com
 */
export default function BookingTracking() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  const [inputEmail, setInputEmail] = useState(email || '');
  const [verifiedEmail, setVerifiedEmail] = useState(email || '');

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking-tracking', bookingId, verifiedEmail],
    queryFn: async () => {
      if (!bookingId || !verifiedEmail) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          restaurant_tables(name, capacity),
          tenants(name)
        `)
        .eq('id', bookingId)
        .eq('guest_email', verifiedEmail)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!verifiedEmail,
  });

  const handleVerifyEmail = () => {
    setVerifiedEmail(inputEmail);
  };

  const getStatusStep = (status: string): number => {
    const steps = ['pending', 'confirmed', 'seated', 'completed'];
    return steps.indexOf(status.toLowerCase());
  };

  const currentStep = booking ? getStatusStep(booking.status) : 0;

  // Email verification screen
  if (!verifiedEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Track Your Reservation</CardTitle>
            <CardDescription>
              Enter your email to view booking status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use the same email you provided when booking
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleVerifyEmail}
              disabled={!inputEmail}
            >
              View Reservation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-muted-foreground">Loading your reservation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or not found
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Reservation Not Found</CardTitle>
            <CardDescription>
              We couldn't find a reservation with that email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setVerifiedEmail('')}
            >
              Try Different Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'seated':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Booking tracking display
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Reservation at {booking.tenants?.name || 'Restaurant'}
                </CardTitle>
                <CardDescription className="mt-2">
                  Booking #{booking.id.slice(0, 8)} • {booking.guest_name}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Reservation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex justify-between">
                {['Pending', 'Confirmed', 'Seated', 'Completed'].map((step, index) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                      ${index <= currentStep 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {index < currentStep ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : index === currentStep ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <p className={`text-xs mt-2 text-center ${index <= currentStep ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Reservation Details</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Date & Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.booking_time), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.booking_time), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Party Size</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.party_size} {booking.party_size === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              </div>

              {booking.duration_minutes && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.duration_minutes} minutes
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {booking.restaurant_tables && (
                <div className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Table Assignment</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.restaurant_tables.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Capacity: {booking.restaurant_tables.capacity} guests
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                </div>
              </div>

              {booking.guest_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{booking.guest_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Special Requests */}
        {booking.special_requests && (
          <Card>
            <CardHeader>
              <CardTitle>Special Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
            </CardContent>
          </Card>
        )}

        {/* Deposit Information */}
        {booking.deposit_required && (
          <Card>
            <CardHeader>
              <CardTitle>Deposit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.deposit_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Amount:</span>
                  <span className="font-semibold">${(booking.deposit_amount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={booking.deposit_paid ? 'default' : 'secondary'}>
                  {booking.deposit_paid ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact & Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Need to Make Changes?</CardTitle>
            <CardDescription>Contact the restaurant for any modifications or cancellations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${booking.tenants?.name || 'restaurant'}@example.com`} className="text-sm text-primary hover:underline">
                Email Restaurant
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Call for immediate assistance</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Reply to your confirmation email</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

