import { Clock, Users, Phone, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  customerName: string;
  time: string;
  guests: number;
  table: string;
  phone: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled';
  specialRequests?: string;
}

interface BookingCardProps {
  booking: Booking;
  onUpdate?: (updates: Partial<Booking>) => void;
}

const BookingCard = ({ booking, onUpdate }: BookingCardProps) => {
  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'seated':
        return 'bg-success/10 text-success border-success/20';
      case 'completed':
        return 'bg-muted text-muted-foreground border-border';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: Booking['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{booking.customerName}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.time}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {booking.guests} guests
              </div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={getStatusColor(booking.status)}
          >
            {getStatusText(booking.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Table:</span>
          <span className="font-medium">{booking.table}</span>
        </div>
        
        {booking.specialRequests && (
          <div className="text-sm">
            <span className="text-muted-foreground">Notes:</span>
            <p className="mt-1 text-foreground">{booking.specialRequests}</p>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          {booking.status === 'confirmed' && (
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-primary"
              onClick={() => onUpdate?.({ status: 'seated' })}
            >
              Seat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingCard;