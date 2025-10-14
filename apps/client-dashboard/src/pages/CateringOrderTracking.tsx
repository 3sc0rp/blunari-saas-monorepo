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
  Package,
  ChefHat,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CateringOrder } from '@/types/catering';
import { CATERING_SERVICE_TYPE_LABELS } from '@/types/catering';

/**
 * Public Order Tracking Page
 * Allows customers to track their catering order status
 * Access via: /catering-order/:orderId?email=customer@email.com
 */
export default function CateringOrderTracking() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  const [inputEmail, setInputEmail] = useState(email || '');
  const [verifiedEmail, setVerifiedEmail] = useState(email || '');

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['catering-order-tracking', orderId, verifiedEmail],
    queryFn: async () => {
      if (!orderId || !verifiedEmail) return null;

      const { data, error } = await supabase
        .from('catering_orders' as any)
        .select(`
          *,
          catering_packages(name, price_per_person, description),
          tenants(name)
        `)
        .eq('id', orderId)
        .eq('contact_email', verifiedEmail)
        .maybeSingle();

      if (error) throw error;
      return data as CateringOrder;
    },
    enabled: !!orderId && !!verifiedEmail,
  });

  const handleVerifyEmail = () => {
    setVerifiedEmail(inputEmail);
  };

  const getStatusStep = (status: string): number => {
    const steps = ['inquiry', 'quoted', 'confirmed', 'in_progress', 'completed'];
    return steps.indexOf(status);
  };

  const currentStep = order ? getStatusStep(order.status) : 0;

  // Email verification screen
  if (!verifiedEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle>Track Your Catering Order</CardTitle>
            <CardDescription>
              Enter your email to view order status
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
                Use the same email you provided when placing the order
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleVerifyEmail}
              disabled={!inputEmail}
            >
              View Order Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
              <p className="text-muted-foreground">Loading your order...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or not found
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>
              We couldn't find an order with that email address
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

  // Order tracking display
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{order.event_name}</CardTitle>
                <CardDescription className="mt-2">
                  Order #{order.id.slice(0, 8)} • Placed on {format(new Date(order.created_at), 'MMM d, yyyy')}
                </CardDescription>
              </div>
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                {order.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex justify-between">
                {['Inquiry', 'Quoted', 'Confirmed', 'In Progress', 'Completed'].map((step, index) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                      ${index <= currentStep 
                        ? 'bg-orange-600 border-orange-600 text-white' 
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
                  className="h-full bg-orange-600 transition-all"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Event Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.event_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.event_start_time}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Guest Count</p>
                  <p className="text-sm text-muted-foreground">
                    {order.guest_count} guests
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Service Type</p>
                  <p className="text-sm text-muted-foreground">
                    {CATERING_SERVICE_TYPE_LABELS[order.service_type]}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {order.venue_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Venue</p>
                    <p className="text-sm text-muted-foreground">{order.venue_name}</p>
                    {order.venue_address && (
                      <p className="text-sm text-muted-foreground">{order.venue_address}</p>
                    )}
                  </div>
                </div>
              )}

              {order.catering_packages && (
                <div className="flex items-start gap-3">
                  <ChefHat className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Package</p>
                    <p className="text-sm text-muted-foreground">
                      {order.catering_packages.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing (if quoted or confirmed) */}
        {order.total_amount && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.subtotal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(order.subtotal / 100).toFixed(2)}</span>
                </div>
              )}
              {order.tax_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(order.tax_amount / 100).toFixed(2)}</span>
                </div>
              )}
              {order.service_fee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>${(order.service_fee / 100).toFixed(2)}</span>
                </div>
              )}
              {order.delivery_fee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>${(order.delivery_fee / 100).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-orange-600">${(order.total_amount / 100).toFixed(2)}</span>
              </div>
              {order.deposit_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit {order.deposit_paid ? 'Paid' : 'Due'}</span>
                  <span className={order.deposit_paid ? 'text-green-600' : 'text-orange-600'}>
                    ${(order.deposit_amount / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Questions?</CardTitle>
            <CardDescription>Contact us for any updates or changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${order.tenants?.name || 'catering'}@example.com`} className="text-sm text-primary hover:underline">
                  Email Us
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Call for immediate assistance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

