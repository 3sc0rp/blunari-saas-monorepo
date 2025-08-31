import React from 'react';
import { useParams } from 'react-router-dom';
import BookingWidget from '@/components/booking/BookingWidget';
import { Card, CardContent } from '@/components/ui/card';

const BookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Invalid Booking Link</h1>
            <p className="text-muted-foreground">
              The booking link you followed is not valid. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
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