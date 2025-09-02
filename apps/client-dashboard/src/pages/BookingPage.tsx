import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import BookingWidget from '@/components/booking/BookingWidget';
import { Card, CardContent } from '@/components/ui/card';
import { ChefHat } from 'lucide-react';

const BookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  
  // Determine if this is a catering or booking widget based on the path
  const isCateringWidget = location.pathname.startsWith('/catering');

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">
              Invalid {isCateringWidget ? 'Catering' : 'Booking'} Link
            </h1>
            <p className="text-muted-foreground">
              The {isCateringWidget ? 'catering' : 'booking'} link you followed is not valid. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCateringWidget) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <ChefHat className="w-8 h-8 text-orange-500" />
                <h1 className="text-3xl font-bold">Catering Services</h1>
              </div>
              <p className="text-muted-foreground">
                Professional catering for your special events
              </p>
            </div>
            
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <ChefHat className="w-16 h-16 text-orange-500 mx-auto" />
                  <h2 className="text-2xl font-semibold">Catering Widget Coming Soon</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Our catering booking system is currently under development. 
                    Please contact us directly to place your catering order.
                  </p>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Restaurant: <span className="font-medium">{slug}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <BookingWidget slug={slug} />
    </div>
  );
};

export default BookingPage;