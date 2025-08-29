import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBookingAPI, type Booking } from '@/hooks/useBookingAPI';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface BookingActionsProps {
  booking?: Booking;
  onBookingUpdate?: (booking: Booking) => void;
  showCreateNew?: boolean;
}

export const BookingActions: React.FC<BookingActionsProps> = ({
  booking,
  onBookingUpdate,
  showCreateNew = false,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [availabilityResults, setAvailabilityResults] = useState<any>(null);
  
  const { 
    loading, 
    confirmBooking, 
    cancelBooking, 
    checkAvailability,
    createBooking,
  } = useBookingAPI();
  
  const { toast } = useToast();

  const handleConfirmBooking = async () => {
    if (!booking) return;
    
    try {
      const result = await confirmBooking(booking.id);
      toast({
        title: "Booking Confirmed",
        description: `Booking for ${booking.guest_name} has been confirmed.`,
      });
      onBookingUpdate?.(result);
    } catch (error) {
      console.error('Failed to confirm booking:', error);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    try {
      await cancelBooking(booking.id);
      toast({
        title: "Booking Cancelled",
        description: `Booking for ${booking.guest_name} has been cancelled.`,
        variant: "destructive",
      });
      onBookingUpdate?.({ ...booking, status: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  const handleCheckAvailability = async () => {
    if (!availabilityDate) return;
    
    try {
      const results = await checkAvailability(availabilityDate, partySize);
      setAvailabilityResults(results);
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Individual Booking Actions */}
      {booking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Booking Actions
            </CardTitle>
            <CardDescription>
              Manage booking for {booking.guest_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                {booking.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Party of {booking.party_size}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(booking.booking_time).toLocaleString()}
              </span>
            </div>
            
            <div className="flex gap-2">
              {booking.status === 'pending' && (
                <Button 
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </Button>
              )}
              
              {booking.status !== 'cancelled' && (
                <Button 
                  onClick={handleCancelBooking}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Checker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Check Availability
          </CardTitle>
          <CardDescription>
            Real-time table availability lookup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="availability-date">Date</Label>
              <Input
                id="availability-date"
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="party-size">Party Size</Label>
              <Input
                id="party-size"
                type="number"
                min="1"
                max="20"
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleCheckAvailability}
            disabled={loading || !availabilityDate}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Check Availability'}
          </Button>

          {availabilityResults && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Available Times:</h4>
              {availabilityResults.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availabilityResults.map((slot: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {slot.time} ({slot.available_tables} tables)
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No availability found for this date and party size.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common booking management tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {showCreateNew && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start">
                  Create New Booking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Booking</DialogTitle>
                  <DialogDescription>
                    Add a new reservation to the system
                  </DialogDescription>
                </DialogHeader>
                {/* Add create booking form here */}
                <p className="text-sm text-muted-foreground">
                  Create booking form would go here
                </p>
              </DialogContent>
            </Dialog>
          )}
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setShowAvailabilityDialog(true)}
          >
            Bulk Availability Check
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            Export Bookings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};