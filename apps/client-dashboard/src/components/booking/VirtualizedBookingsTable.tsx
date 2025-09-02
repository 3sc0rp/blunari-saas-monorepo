import React, { useState, useMemo, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExtendedBooking, BookingStatus } from "@/types/booking";
import {
  MoreHorizontal,
  MessageSquare,
  Eye,
  X,
  Phone,
  Mail,
  Users,
  Calendar,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface OptimizedBookingsTableProps {
  bookings: ExtendedBooking[];
  selectedBookings: string[];
  onSelectBooking: (bookingId: string) => void;
  onSelectAll: () => void;
  onBookingClick: (booking: ExtendedBooking) => void;
  onStatusUpdate: (bookingId: string, status: BookingStatus) => void;
  isLoading?: boolean;
  height?: number;
}

const OptimizedBookingsTable: React.FC<OptimizedBookingsTableProps> = ({
  bookings,
  selectedBookings,
  onSelectBooking,
  onSelectAll,
  onBookingClick,
  onStatusUpdate,
  isLoading = false,
  height = 600,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ExtendedBooking;
    direction: "asc" | "desc";
  } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const sortedBookings = useMemo(() => {
    if (!sortConfig) return bookings;

    return [...bookings].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [bookings, sortConfig]);

  const handleSort = useCallback((key: keyof ExtendedBooking) => {
    setSortConfig((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const getStatusBadge = useCallback((status: BookingStatus) => {
    const statusConfig = {
      confirmed: {
        variant: "default" as const,
        label: "Confirmed",
        bg: "bg-success/10 text-success border-success/20",
      },
      pending: {
        variant: "secondary" as const,
        label: "Pending",
        bg: "bg-warning/10 text-warning border-warning/20",
      },
      seated: {
        variant: "outline" as const,
        label: "Seated",
        bg: "bg-brand/10 text-brand border-brand/20",
      },
      completed: {
        variant: "default" as const,
        label: "Completed",
        bg: "bg-secondary/10 text-secondary border-secondary/20",
      },
      cancelled: {
        variant: "destructive" as const,
        label: "Cancelled",
        bg: "bg-destructive/10 text-destructive border-destructive/20",
      },
      noshow: {
        variant: "destructive" as const,
        label: "No Show",
        bg: "bg-surface-3 text-text-muted border-surface-3",
      },
    };

    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={cn("font-medium border", config.bg)}>
        {config.label}
      </Badge>
    );
  }, []);

  const formatBookingTime = useCallback((dateTime: string) => {
    const date = new Date(dateTime);
    const time = format(date, "h:mm a");
    const dateStr = format(date, "MMM d");
    return { time, date: dateStr };
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const isAllSelected =
    selectedBookings.length === bookings.length && bookings.length > 0;
  const isIndeterminate =
    selectedBookings.length > 0 && selectedBookings.length < bookings.length;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-surface-2 bg-surface">
        <div className="h-12 bg-surface-2 animate-pulse rounded-t-lg" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-surface-2 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (sortedBookings.length === 0) {
    return (
      <div className="rounded-lg border border-surface-2 bg-surface">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-text">
            No bookings found
          </h3>
          <p className="text-text-muted">
            Try adjusting your filters or date range to see more results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-2 bg-surface shadow-elev-1">
      <ScrollArea className={`h-[${height}px]`}>
        <Table>
          <TableHeader className="sticky top-0 bg-surface z-10 border-b border-surface-2">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all bookings"
                  className={
                    isIndeterminate ? "data-[state=indeterminate]" : ""
                  }
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-2/50 transition-colors"
                onClick={() => handleSort("guest_name")}
              >
                <div className="flex items-center gap-2">
                  Guest
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-2/50 transition-colors"
                onClick={() => handleSort("booking_time")}
              >
                <div className="flex items-center gap-2">
                  Date & Time
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-2/50 transition-colors"
                onClick={() => handleSort("party_size")}
              >
                <div className="flex items-center gap-2">
                  Party
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-2/50 transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </div>
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
              const isHovered = hoveredRow === booking.id;

              return (
                <TableRow
                  key={booking.id}
                  className={cn(
                    "cursor-pointer transition-all duration-150 hover:bg-surface-2",
                    isSelected && "bg-brand/5 border-brand/20",
                    isHovered && "bg-surface-2",
                  )}
                  onClick={() => onBookingClick(booking)}
                  onMouseEnter={() => setHoveredRow(booking.id)}
                  onMouseLeave={() => setHoveredRow(null)}
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
                        <AvatarFallback className="text-xs font-medium bg-brand/10 text-brand">
                          {getInitials(booking.guest_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-text">
                          {booking.guest_name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          {booking.guest_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="max-w-[120px] truncate">
                                {booking.guest_email}
                              </span>
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
                        <Calendar className="h-4 w-4 text-text-muted" />
                        <span className="font-medium text-text">{date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Clock className="h-3 w-3" />
                        <span>{time}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-text-muted" />
                      <span className="font-medium text-text">
                        {booking.party_size}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-text-muted">
                      {booking.table_id
                        ? `Table ${booking.table_id}`
                        : "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs bg-surface-2 border-surface-3 text-text-muted"
                    >
                      {booking.source || "Direct"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-surface border-surface-2"
                      >
                        <DropdownMenuItem
                          onClick={() => onBookingClick(booking)}
                          className="hover:bg-surface-2"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-surface-2">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        {booking.status === "pending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onStatusUpdate(booking.id, "confirmed")
                            }
                            className="hover:bg-surface-2"
                          >
                            Confirm Booking
                          </DropdownMenuItem>
                        )}
                        {booking.status === "confirmed" && (
                          <DropdownMenuItem
                            onClick={() => onStatusUpdate(booking.id, "seated")}
                            className="hover:bg-surface-2"
                          >
                            Mark as Seated
                          </DropdownMenuItem>
                        )}
                        {["confirmed", "pending"].includes(booking.status) && (
                          <DropdownMenuItem
                            onClick={() =>
                              onStatusUpdate(booking.id, "cancelled")
                            }
                            className="text-destructive hover:bg-destructive/10"
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
            <Calendar className="h-12 w-12 mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-text">
              No bookings found
            </h3>
            <p className="text-text-muted">
              Try adjusting your filters or date range to see more results.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default memo(OptimizedBookingsTable);
