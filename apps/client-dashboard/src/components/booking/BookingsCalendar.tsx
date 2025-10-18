import React, { useMemo } from 'react';
import { ExtendedBooking } from '@/types/booking';
import { Card } from '@/components/ui/card';
import { format, startOfDay, addMinutes } from 'date-fns';

interface Props {
  bookings: ExtendedBooking[];
  onSelectBooking: (b: ExtendedBooking) => void;
}

// Lightweight day agenda calendar for today
const BookingsCalendar: React.FC<Props> = ({ bookings, onSelectBooking }) => {
  const slots = useMemo(() => {
    const dayStart = startOfDay(new Date());
    const list: { time: Date; items: ExtendedBooking[] }[] = [];
    for (let i = 0; i < 24 * 2; i++) {
      list.push({ time: addMinutes(dayStart, i * 30), items: [] });
    }
    bookings.forEach((b) => {
      const t = new Date(b.booking_time);
      const idx = Math.floor(((t.getHours() * 60 + t.getMinutes()) / 30));
      if (idx >= 0 && idx < list.length) list[idx].items.push(b);
    });
    return list;
  }, [bookings]);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {slots.map((s, i) => (
          <div key={i} className="border rounded-md p-2 min-h-[60px] bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">{format(s.time, 'h:mm a')}</div>
            <div className="space-y-1">
              {s.items.map((b) => (
                <button
                  key={b.id}
                  className="w-full text-left text-sm px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                  onClick={() => onSelectBooking(b)}
                >
                  {b.guest_name} • {b.party_size} • {b.table_name || b.table_id || '—'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BookingsCalendar;

