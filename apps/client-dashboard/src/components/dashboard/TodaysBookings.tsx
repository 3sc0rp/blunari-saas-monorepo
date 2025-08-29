import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingCard from "./BookingCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const TodaysBookings = () => {
  // Mock data - in real app this would come from API
  const bookings = [
    {
      id: "1",
      customerName: "Sarah Johnson",
      time: "7:00 PM",
      guests: 4,
      table: "T-12",
      phone: "+1 (555) 123-4567",
      status: "confirmed" as const,
      specialRequests: "Anniversary dinner, window table preferred"
    },
    {
      id: "2",
      customerName: "Michael Chen",
      time: "6:30 PM",
      guests: 2,
      table: "T-8",
      phone: "+1 (555) 987-6543",
      status: "seated" as const
    },
    {
      id: "3",
      customerName: "Emily Rodriguez",
      time: "8:00 PM",
      guests: 6,
      table: "T-15",
      phone: "+1 (555) 456-7890",
      status: "confirmed" as const,
      specialRequests: "Birthday celebration"
    },
    {
      id: "4",
      customerName: "David Wilson",
      time: "5:30 PM",
      guests: 3,
      table: "T-5",
      phone: "+1 (555) 234-5678",
      status: "completed" as const
    },
    {
      id: "5",
      customerName: "Lisa Thompson",
      time: "7:30 PM",
      guests: 2,
      table: "T-3",
      phone: "+1 (555) 345-6789",
      status: "confirmed" as const
    }
  ];

  const getBookingStats = () => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const seated = bookings.filter(b => b.status === 'seated').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const total = bookings.length;

    return { confirmed, seated, completed, total };
  };

  const stats = getBookingStats();

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Today's Bookings</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {stats.total} Total
            </Badge>
            <Badge variant="outline" className="bg-success/10 text-success">
              {stats.seated} Seated
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TodaysBookings;