import React, { useState, useMemo, useCallback, memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExtendedBooking, BookingStatus } from '@/types/booking';
import { MoreHorizontal, MessageSquare, Eye, X, Phone, Mail, Users, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingsTableProps {
  bookings: ExtendedBooking[];
  selectedBookings: string[];
  onSelectBooking: (bookingId: string) => void;
  onSelectAll: () => void;
  onBookingClick: (booking: ExtendedBooking) => void;
  onStatusUpdate: (bookingId: string, status: BookingStatus) => void;
  isLoading?: boolean;
}

const BookingsTable: React.FC<BookingsTableProps> = ({
  bookings,
  selectedBookings,
  onSelectBooking,
  onSelectAll,
  onBookingClick,
  onStatusUpdate,
  isLoading = false
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ExtendedBooking;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedBookings = useMemo(() => {
    if (!sortConfig) return bookings;

    return [...bookings].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [bookings, sortConfig]);

  const handleSort = useCallback((key: keyof ExtendedBooking) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig = {
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      seated: { variant: 'outline' as const, label: 'Seated' },
      completed: { variant: 'default' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      noshow: { variant: 'destructive' as const, label: 'No Show' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
    );
  };

  const formatBookingTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const time = format(date, 'h:mm a');
    const dateStr = format(date, 'MMM d');
    return { time, date: dateStr };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAllSelected = selectedBookings.length === bookings.length && bookings.length > 0;
  const isIndeterminate = selectedBookings.length > 0 && selectedBookings.length < bookings.length;

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <div className="h-12 bg-muted/50 animate-pulse rounded-t-lg" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 border-b border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all bookings"
                  className={isIndeterminate ? "data-[state=indeterminate]" : ""}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('guest_name')}
              >
                Guest
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('booking_time')}
              >
                Date & Time
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('party_size')}
              >
                Party
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('status')}
              >
                Status
              </TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBookings.map((booking) => {
              const { time, date } = formatBookingTime(booking.booking_time);
              const isSelected = selectedBookings.includes(booking.id);
              
              return (
                <TableRow
                  key={booking.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted/30"
                  )}
                  onClick={() => onBookingClick(booking)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectBooking(booking.id)}
                      aria-label={`Select booking for ${booking.guest_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(booking.guest_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{booking.guest_name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {booking.guest_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{booking.guest_email}</span>
                            </div>
                          )}
                          {booking.guest_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{booking.guest_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{time}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.party_size}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(booking.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {booking.table_id || 'No table'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {booking.source || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onBookingClick(booking)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        {booking.status === 'pending' && (
                          <DropdownMenuItem onClick={() => onStatusUpdate(booking.id, 'confirmed')}>
                            Confirm Booking
                          </DropdownMenuItem>
                        )}
                        {booking.status === 'confirmed' && (
                          <DropdownMenuItem onClick={() => onStatusUpdate(booking.id, 'seated')}>
                            Mark as Seated
                          </DropdownMenuItem>
                        )}
                        {['confirmed', 'pending'].includes(booking.status) && (
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(booking.id, 'cancelled')}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Booking
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {sortedBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or date range to see more results.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default memo(BookingsTable);