import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UsageResp { tenantId: string; windowDays: number; totals: { bookings: number; staff: number; enabledFeatures: number }; trend: Array<{ date: string; bookings: number }>; requestId: string; generatedAt: string; }

export function TenantUsageOverview({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<UsageResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-usage-overview', { body: { tenantId, days } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as UsageResp);
    } catch (e) {
      toast({ title: 'Usage fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        <select value={days} onChange={(e)=>setDays(parseInt(e.target.value))} className="border rounded px-2 py-1 text-xs bg-background">
          {[7,14,30,60,90].map(d => <option key={d} value={d}>{d}d</option>)}
        </select>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()} • req {data.requestId.slice(0,8)}</p>}
      </div>
      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Bookings</CardTitle><CardDescription>{days}d total</CardDescription></CardHeader>
            <CardContent className="p-4 text-2xl font-semibold">{data.totals.bookings}</CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Staff</CardTitle><CardDescription>Current</CardDescription></CardHeader>
            <CardContent className="p-4 text-2xl font-semibold">{data.totals.staff}</CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Enabled Features</CardTitle><CardDescription>Flags on</CardDescription></CardHeader>
            <CardContent className="p-4 text-2xl font-semibold">{data.totals.enabledFeatures}</CardContent>
          </Card>
        </div>
      )}
      {data && (
        <div className="border rounded p-4">
          <h4 className="text-sm font-medium mb-2">Daily Bookings Trend</h4>
          <div className="space-y-1 max-h-64 overflow-auto text-xs font-mono">
            {data.trend.map(t => <div key={t.date} className="flex justify-between"><span>{t.date}</span><span>{t.bookings}</span></div>)}
          </div>
        </div>
      )}
      {!data && <p className="text-sm text-muted-foreground">Load usage to view metrics.</p>}
    </div>
  );
}
