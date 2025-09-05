import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props { tenantId: string; }

interface BillingSummaryResponse {
  tenantId: string;
  plan: string | null;
  renewal: string | null;
  stripe: { customerId: string | null; subscription: any };
  usage: { bookingsThisMonth: number; staffCount: number };
  requestId: string;
  generatedAt: string;
}

export function TenantBillingTab({ tenantId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BillingSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true); setError(null);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-billing-summary', { body: { tenantId } });
      if (error || (resp as any)?.error) throw new Error(error?.message || (resp as any)?.error?.message || 'Failed');
      setData(resp as BillingSummaryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      toast({ title: 'Billing fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()} • req {data.requestId.slice(0,8)}</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Plan</CardTitle><CardDescription>Subscription & renewal</CardDescription></CardHeader>
          <CardContent className="p-4 text-sm space-y-1">
            <p><span className="text-muted-foreground">Plan:</span> {data?.plan || '—'}</p>
            <p><span className="text-muted-foreground">Renews:</span> {data?.renewal ? new Date(data.renewal).toLocaleDateString() : '—'}</p>
            <p><span className="text-muted-foreground">Subscription:</span> {data?.stripe.subscription?.status || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Stripe</CardTitle><CardDescription>Identifiers</CardDescription></CardHeader>
          <CardContent className="p-4 text-sm space-y-1">
            <p><span className="text-muted-foreground">Customer:</span> {data?.stripe.customerId || '—'}</p>
            <p><span className="text-muted-foreground">Sub ID:</span> {data?.stripe.subscription?.id || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Usage (Month)</CardTitle><CardDescription>Current period</CardDescription></CardHeader>
          <CardContent className="p-4 text-sm space-y-1">
            <p><span className="text-muted-foreground">Bookings:</span> {data?.usage.bookingsThisMonth ?? '—'}</p>
            <p><span className="text-muted-foreground">Staff:</span> {data?.usage.staffCount ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
