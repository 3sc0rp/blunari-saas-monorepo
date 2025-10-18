import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingCard from "./BookingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTodaysBookings } from "@/hooks/useRealtimeBookings";
import { useTenant } from "@/hooks/useTenant";
import { SkeletonList } from "@/components/ui/skeleton-components";
import { EmptyState } from "@/components/ui/state";
import { Calendar, Users } from "lucide-react";

const TodaysBookings = () => {
  const { tenant } = useTenant();
  const { bookings, isLoading } = useTodaysBookings(tenant?.id);

  const getBookingStats = () => {
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const seated = bookings.filter((b) => b.status === "seated").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const total = bookings.length;

    return { pending, confirmed, seated, completed, total };
  };

  const stats = getBookingStats();

  if (isLoading) {
    return (
      <Card className="shadow-elev-1 h-full">
        <CardHeader>
          <CardTitle className="text-h4 font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList items={5} showAvatar={false} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elev-1 h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-h4 font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Bookings
          </CardTitle>
          <Badge variant="outline" className="font-tabular">
            {stats.total} total
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-body-sm text-muted-foreground">
              {stats.pending} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span className="text-body-sm text-muted-foreground">
              {stats.confirmed} confirmed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-body-sm text-muted-foreground">
              {stats.completed} completed
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {bookings.length === 0 ? (
          <div className="p-6">
            <EmptyState
              variant="no-bookings-date"
              action={{
                label: "View All Bookings",
                onClick: () => (window.location.href = "/dashboard/bookings"),
                icon: Users,
              }}
            />
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-2 p-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={{
                    id: booking.id,
                    customerName: booking.guest_name,
                    time: booking.booking_time,
                    guests: booking.party_size,
                    table: booking.table_id || "TBD",
                    phone: booking.guest_phone || "",
                    status: booking.status as
                      | "pending"
                      | "confirmed"
                      | "seated"
                      | "completed"
                      | "cancelled",
                    specialRequests: booking.special_requests,
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysBookings;
