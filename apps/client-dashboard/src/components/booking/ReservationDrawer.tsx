import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import MessageDialog from "@/components/booking/MessageDialog";
import { ExtendedBooking, BookingStatus } from "@/types/booking";
import { useSettings } from "@/hooks/useSettings";
import {
  User,
  Mail,
  Phone,
  Users,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReservationDrawerProps {
  booking: ExtendedBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (bookingId: string, status: BookingStatus) => void;
  onUpdateBooking: (
    bookingId: string,
    updates: Partial<ExtendedBooking>,
  ) => void;
  onDeleteBooking?: (bookingId: string) => void;
}

const ReservationDrawer: React.FC<ReservationDrawerProps> = ({
  booking,
  open,
  onOpenChange,
  onStatusUpdate,
  onUpdateBooking,
  onDeleteBooking,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Partial<ExtendedBooking>>(
    {},
  );
  // Hooks must not be conditional. Declare before any early return.
  const [messageOpen, setMessageOpen] = useState(false);
  const { settings } = useSettings();

  if (!booking) return null;

  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; icon: any }> = {
      confirmed: {
        variant: "default" as const,
        label: "Confirmed",
        icon: CheckCircle,
      },
      pending: { variant: "secondary" as const, label: "Pending", icon: Clock },
      seated: { variant: "outline" as const, label: "Seated", icon: Users },
      completed: {
        variant: "default" as const,
        label: "Completed",
        icon: CheckCircle,
      },
      cancelled: {
        variant: "destructive" as const,
        label: "Cancelled",
        icon: X,
      },
      noshow: {
        variant: "destructive" as const,
        label: "No Show",
        icon: AlertCircle,
      },
      no_show: { // database variant
        variant: "destructive" as const,
        label: "No Show",
        icon: AlertCircle,
      },
    };

    const key = (status as unknown as string) || 'pending';
    const config = statusConfig[key] || statusConfig['pending'];
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="font-medium">
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveChanges = () => {
    if (Object.keys(editedBooking).length > 0) {
      onUpdateBooking(booking.id, editedBooking);
      setEditedBooking({});
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedBooking({});
    setIsEditing(false);
  };

  const activityLog = [
    {
      id: "1",
      action: "Booking Created",
      timestamp: booking.created_at,
      details: `Booking created via ${booking.source || "website"}`,
    },
    {
      id: "2",
      action: "Status Updated",
      timestamp: booking.updated_at,
      details: `Status changed to ${booking.status}`,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] overflow-y-auto"
      >
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Reservation Details</SheetTitle>
            <SheetDescription>View and manage reservation details.</SheetDescription>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Guest Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {getInitials(booking.guest_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {booking.guest_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Party of {booking.party_size}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.guest_email}</span>
                </div>
                {booking.guest_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.guest_phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Date & Time
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(booking.booking_time), "PPp")}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Duration
                  </label>
                  <p className="text-sm mt-1">
                    {booking.duration_minutes} minutes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Party Size
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.party_size} guests</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Table
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {booking.table_id || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedBooking.status || booking.status}
                      onValueChange={(value) =>
                        setEditedBooking((prev) => ({
                          ...prev,
                          status: value as BookingStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="seated">Seated</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="noshow">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getStatusBadge(booking.status)
                  )}
                </div>
              </div>

              {booking.special_requests && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Special Requests
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={
                        editedBooking.special_requests ??
                        booking.special_requests
                      }
                      onChange={(e) =>
                        setEditedBooking((prev) => ({
                          ...prev,
                          special_requests: e.target.value,
                        }))
                      }
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1 p-3 bg-muted/50 rounded-md">
                      {booking.special_requests}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          {(booking.deposit_required || booking.deposit_paid || settings?.operational?.depositPolicy?.showPolicyLabel) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Optional Policy Label */}
                {settings?.operational?.depositPolicy?.showPolicyLabel && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Policy</span>
                    <Badge variant="outline">{`Required for parties ≥ ${settings.operational.depositPolicy.largePartyThreshold || 6}`}</Badge>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm">Deposit Required</span>
                  <Badge
                    variant={booking.deposit_required ? "default" : "secondary"}
                  >
                    {booking.deposit_required ? "Yes" : "No"}
                  </Badge>
                </div>
                {booking.deposit_amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Deposit Amount</span>
                    <span className="font-medium">
                      ${booking.deposit_amount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm">Payment Status</span>
                  <Badge
                    variant={booking.deposit_paid ? "default" : "secondary"}
                  >
                    {booking.deposit_paid ? "Paid" : "Pending"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {booking.status === "pending" && (
                  <Button
                    onClick={() => onStatusUpdate(booking.id, "confirmed")}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </Button>
                )}
                {booking.status === "confirmed" && (
                  <Button
                    onClick={() => onStatusUpdate(booking.id, "seated")}
                    variant="outline"
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Seat Guest
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={()=>setMessageOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
              {(["pending", "confirmed"].includes(booking.status)) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Cancel Booking
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the reservation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteBooking ? onDeleteBooking(booking.id) : onStatusUpdate(booking.id, 'cancelled')}>Confirm Cancel</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {onDeleteBooking && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">Delete Reservation</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this reservation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the reservation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteBooking(booking.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
          <MessageDialog
            open={messageOpen}
            onOpenChange={setMessageOpen}
            defaultChannel={booking.guest_phone ? 'sms' : 'email'}
            onSend={async ({ channel, to, subject, body }) => {
              // Placeholder: wire to background-ops or email/SMS provider
              console.log('Send', { channel, to, subject, body });
            }}
          />

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.map((activity, index) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.details}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReservationDrawer;
