import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import BookingWidget from '@/components/booking/BookingWidget';
import CateringWidget from '@/components/catering/CateringWidget';
import { Card, CardContent } from '@/components/ui/card';

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
        <CateringWidget slug={slug} />
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