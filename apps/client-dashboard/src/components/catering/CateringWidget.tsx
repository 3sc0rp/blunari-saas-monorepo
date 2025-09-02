import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, Users, ChefHat, Calendar, Mail, Phone, MapPin, FileText, Star, ArrowLeft } from 'lucide-react';
import { useCateringData } from '@/hooks/useCateringData';
import { useTenantBySlug } from '@/hooks/useTenantBySlug';
import { CreateCateringOrderRequest, CateringPackage, CateringServiceType, DietaryRestriction } from '@/types/catering';
import { ErrorBoundary } from '@/components/booking/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CateringWidgetProps {
  slug: string;
}

type Step = 'packages' | 'customize' | 'details' | 'confirmation';

interface OrderForm {
  package_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  service_type: CateringServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements: DietaryRestriction[];
}

const CateringWidget: React.FC<CateringWidgetProps> = ({ slug }) => {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenantBySlug(slug);
  const { packages, loading: packagesLoading, createOrder } = useCateringData(tenant?.id);

  const [currentStep, setCurrentStep] = useState<Step>('packages');
  const [selectedPackage, setSelectedPackage] = useState<CateringPackage | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    event_name: '',
    event_date: '',
    event_start_time: '12:00',
    guest_count: 50,
    service_type: 'drop_off',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    venue_name: '',
    venue_address: '',
    special_instructions: '',
    dietary_requirements: []
  });
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loading states
  if (tenantLoading || packagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Loading Catering Services</h2>
            <p className="text-muted-foreground">Please wait while we load your catering options...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Restaurant Not Found</h2>
            <p className="text-muted-foreground">The restaurant "{slug}" could not be found or is not available for catering.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Restaurant</h2>
            <p className="text-muted-foreground">Please check the catering link and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePackageSelect = (pkg: CateringPackage) => {
    setSelectedPackage(pkg);
    setOrderForm(prev => ({
      ...prev,
      package_id: pkg.id,
      guest_count: Math.max(prev.guest_count, pkg.min_guests),
      event_name: `${pkg.name} Event`
    }));
    setCurrentStep('customize');
  };

  const handleOrderSubmit = async () => {
    if (!selectedPackage || !tenant) return;

    setSubmitting(true);
    try {
      const orderData: CreateCateringOrderRequest = {
        package_id: selectedPackage.id,
        event_name: orderForm.event_name,
        event_date: orderForm.event_date,
        event_start_time: orderForm.event_start_time,
        event_end_time: orderForm.event_end_time,
        guest_count: orderForm.guest_count,
        service_type: orderForm.service_type,
        contact_name: orderForm.contact_name,
        contact_email: orderForm.contact_email,
        contact_phone: orderForm.contact_phone,
        venue_name: orderForm.venue_name,
        venue_address: orderForm.venue_address,
        delivery_address: orderForm.delivery_address,
        special_instructions: orderForm.special_instructions,
        dietary_requirements: orderForm.dietary_requirements
      };

      await createOrder(orderData);
      setOrderConfirmed(true);
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Error creating catering order:', error);
      // Handle error - could show toast notification
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(priceInCents / 100);
  };

  const getTotalPrice = () => {
    if (!selectedPackage) return 0;
    return selectedPackage.price_per_person * orderForm.guest_count;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChefHat className="w-8 h-8 text-orange-500" />
                <div>
                  <h1 className="text-xl font-bold">{tenant.name}</h1>
                  <p className="text-sm text-muted-foreground">Catering Services</p>
                </div>
              </div>
              {currentStep !== 'packages' && (
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep('packages')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Packages
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  { key: 'packages', label: 'Choose Package', icon: ChefHat },
                  { key: 'customize', label: 'Customize', icon: Users },
                  { key: 'details', label: 'Details', icon: FileText },
                  { key: 'confirmation', label: 'Confirmation', icon: CheckCircle }
                ].map((step, index) => {
                  const isActive = currentStep === step.key;
                  const isCompleted = ['packages', 'customize', 'details'].indexOf(currentStep) > ['packages', 'customize', 'details'].indexOf(step.key);
                  const IconComponent = step.icon;
                  
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                        isActive ? 'bg-orange-100 text-orange-700' : 
                        isCompleted ? 'bg-green-100 text-green-700' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                      </div>
                      {index < 3 && (
                        <div className={`w-8 h-0.5 mx-2 transition-colors ${
                          isCompleted ? 'bg-green-300' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Package Selection */}
              {currentStep === 'packages' && (
                <motion.div
                  key="packages"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">Choose Your Catering Package</h2>
                    <p className="text-muted-foreground">Select from our professional catering packages</p>
                  </div>

                  {packages && packages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {packages.map((pkg) => (
                        <motion.div
                          key={pkg.id}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="h-full cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-200">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                {pkg.popular && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <div className="text-2xl font-bold text-orange-600">
                                {formatPrice(pkg.price_per_person)}<span className="text-sm text-muted-foreground">/person</span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground mb-4">{pkg.description}</p>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{pkg.min_guests} - {pkg.max_guests} guests</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>{pkg.preparation_time_hours}h preparation time</span>
                                </div>
                              </div>

                              <div className="space-y-1 mb-4">
                                {pkg.includes_setup && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Setup included
                                  </div>
                                )}
                                {pkg.includes_service && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Service staff included
                                  </div>
                                )}
                                {pkg.includes_cleanup && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Cleanup included
                                  </div>
                                )}
                              </div>

                              {pkg.dietary_accommodations && pkg.dietary_accommodations.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-xs text-muted-foreground mb-1">Dietary accommodations:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {pkg.dietary_accommodations.map((diet) => (
                                      <Badge key={diet} variant="outline" className="text-xs">
                                        {diet.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <Button 
                                onClick={() => handlePackageSelect(pkg)}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                              >
                                Select Package
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center p-8">
                      <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Packages Available</h3>
                      <p className="text-muted-foreground mb-4">
                        This restaurant doesn't have catering packages set up yet. Please contact them directly for custom catering options.
                      </p>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 2: Customize Package */}
              {currentStep === 'customize' && selectedPackage && (
                <motion.div
                  key="customize"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Customize Your Order</h2>
                    <p className="text-muted-foreground">Package: {selectedPackage.name}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Order Form */}
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="event_name">Event Name</Label>
                              <Input
                                id="event_name"
                                value={orderForm.event_name}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, event_name: e.target.value }))}
                                placeholder="Birthday Party, Corporate Event, etc."
                              />
                            </div>
                            <div>
                              <Label htmlFor="guest_count">Guest Count *</Label>
                              <Input
                                id="guest_count"
                                type="number"
                                value={orderForm.guest_count}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, guest_count: parseInt(e.target.value) || 0 }))}
                                min={selectedPackage.min_guests}
                                max={selectedPackage.max_guests}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="event_date">Event Date *</Label>
                              <Input
                                id="event_date"
                                type="date"
                                value={orderForm.event_date}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, event_date: e.target.value }))}
                                min={format(addDays(new Date(), 3), 'yyyy-MM-dd')}
                              />
                            </div>
                            <div>
                              <Label htmlFor="event_start_time">Start Time</Label>
                              <Input
                                id="event_start_time"
                                type="time"
                                value={orderForm.event_start_time}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, event_start_time: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="service_type">Service Type *</Label>
                            <Select 
                              value={orderForm.service_type} 
                              onValueChange={(value: CateringServiceType) => setOrderForm(prev => ({ ...prev, service_type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pickup">Pickup</SelectItem>
                                <SelectItem value="delivery">Delivery</SelectItem>
                                <SelectItem value="drop_off">Drop Off</SelectItem>
                                <SelectItem value="full_service">Full Service</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="special_instructions">Special Instructions</Label>
                            <Textarea
                              id="special_instructions"
                              value={orderForm.special_instructions || ''}
                              onChange={(e) => setOrderForm(prev => ({ ...prev, special_instructions: e.target.value }))}
                              placeholder="Any special requests, dietary restrictions, setup requirements, etc."
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <Card className="sticky top-24">
                        <CardHeader>
                          <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">{selectedPackage.name}</h4>
                              <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex justify-between">
                              <span>Guests:</span>
                              <span>{orderForm.guest_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Price per person:</span>
                              <span>{formatPrice(selectedPackage.price_per_person)}</span>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex justify-between font-semibold text-lg">
                              <span>Estimated Total:</span>
                              <span>{formatPrice(getTotalPrice())}</span>
                            </div>

                            <Button 
                              onClick={() => setCurrentStep('details')}
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              disabled={!orderForm.event_date || !orderForm.contact_name}
                            >
                              Continue
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Details */}
              {currentStep === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
                    <p className="text-muted-foreground">We'll use this information to confirm your catering order</p>
                  </div>

                  <div className="max-w-2xl mx-auto">
                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="contact_name">Name *</Label>
                            <Input
                              id="contact_name"
                              value={orderForm.contact_name}
                              onChange={(e) => setOrderForm(prev => ({ ...prev, contact_name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="contact_phone">Phone</Label>
                            <Input
                              id="contact_phone"
                              type="tel"
                              value={orderForm.contact_phone || ''}
                              onChange={(e) => setOrderForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="contact_email">Email *</Label>
                            <Input
                              id="contact_email"
                              type="email"
                              value={orderForm.contact_email}
                              onChange={(e) => setOrderForm(prev => ({ ...prev, contact_email: e.target.value }))}
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Venue Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="venue_name">Venue Name</Label>
                              <Input
                                id="venue_name"
                                value={orderForm.venue_name || ''}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, venue_name: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="venue_address">Venue Address</Label>
                            <Textarea
                              id="venue_address"
                              value={orderForm.venue_address || ''}
                              onChange={(e) => setOrderForm(prev => ({ ...prev, venue_address: e.target.value }))}
                              rows={2}
                            />
                          </div>
                        </div>

                        <Button 
                          onClick={handleOrderSubmit}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          disabled={!orderForm.contact_name || !orderForm.contact_email || submitting}
                        >
                          {submitting ? 'Submitting...' : 'Submit Catering Request'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 'confirmation' && orderConfirmed && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center">
                    <div className="mb-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold mb-2">Request Submitted!</h2>
                      <p className="text-muted-foreground">
                        Your catering request has been submitted successfully. We'll contact you soon to confirm the details.
                      </p>
                    </div>

                    <Card className="max-w-2xl mx-auto text-left">
                      <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">Event: {orderForm.event_name}</h4>
                            <p className="text-muted-foreground">{format(new Date(orderForm.event_date), 'PPP')} at {orderForm.event_start_time}</p>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Package:</span>
                            <span>{selectedPackage?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Guests:</span>
                            <span>{orderForm.guest_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Type:</span>
                            <span>{orderForm.service_type.replace('_', ' ')}</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex justify-between font-semibold">
                            <span>Estimated Total:</span>
                            <span>{formatPrice(getTotalPrice())}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-8">
                      <Button 
                        onClick={() => window.location.reload()}
                        variant="outline"
                      >
                        Place Another Order
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-4">
                <span>🔒 Secure & Private</span>
                <span>⚡ Quick Response</span>
                <span>📱 Mobile Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CateringWidget;
