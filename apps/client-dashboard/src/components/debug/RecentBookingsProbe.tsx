import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookingRow { id: string; booking_time?: string; booking_date?: string; status?: string; party_size?: number; created_at?: string; }

export function RecentBookingsProbe({ tenantId }: { tenantId?: string }) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true); setError(undefined);
    // Some environments may have either booking_time or booking_date (legacy). We select * and then project.
      const { data, error: qErr } = await (supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5) as any);
    if (qErr) {
      setError(qErr.message);
    } else {
      const rows: BookingRow[] = (data || []).map((r: any) => ({
        id: r.id,
        booking_time: r.booking_time,
        booking_date: r.booking_date,
        status: r.status,
        party_size: r.party_size,
        created_at: r.created_at
      }));
      setRows(rows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  if (!tenantId) return null;
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Recent DB Bookings (Debug)</CardTitle>
        <button onClick={load} className="text-xs underline">refresh</button>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2">
            <span className="font-mono truncate max-w-[120px]" title={r.id}>{r.id.slice(0,8)}</span>
            <span>{r.party_size || '-'}p</span>
            <span>{r.status}</span>
            <span className="truncate max-w-[140px]" title={r.booking_time || r.booking_date}>{(r.booking_time || r.booking_date || '').replace('T',' ')}</span>
            <Badge variant="outline">{r.created_at?.split('T')[0]}</Badge>
          </div>
        ))}
        {rows.length === 0 && !loading && !error && <div>No rows found</div>}
      </CardContent>
    </Card>
  );
}

