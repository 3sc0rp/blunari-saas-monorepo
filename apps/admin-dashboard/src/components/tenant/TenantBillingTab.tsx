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
  invoices: Array<{ stripe_invoice_id: string; status: string; amount_due: number; amount_paid: number; currency: string; hosted_invoice_url: string | null; pdf_url: string | null; issued_at: string | null }>;
  requestId: string;
  generatedAt: string;
}

export function TenantBillingTab({ tenantId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BillingSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (opts?: { refreshInvoices?: boolean }) => {
    if (!tenantId) return;
    setLoading(true); setError(null);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-billing-summary', { body: { tenantId, refreshInvoices: opts?.refreshInvoices } });
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
        <Button size="sm" variant="outline" onClick={()=>load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        <Button size="sm" variant="outline" onClick={()=>load({ refreshInvoices: true })} disabled={loading}>Refresh Invoices</Button>
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
      {/* Invoices */}
      <div>
        <h4 className="text-sm font-medium mt-4 mb-2">Recent Invoices</h4>
        {!data?.invoices?.length && <p className="text-sm text-muted-foreground">No invoices cached.</p>}
        <div className="space-y-2">
          {data?.invoices?.map(inv => (
            <div key={inv.stripe_invoice_id} className="flex items-center justify-between border rounded px-3 py-2 text-xs">
              <div className="space-y-0.5">
                <p className="font-mono">{inv.stripe_invoice_id}</p>
                <p className="text-muted-foreground">{inv.status} • {inv.currency?.toUpperCase()} {(inv.amount_due/100).toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                {inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a>}
                {inv.pdf_url && <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-primary underline">PDF</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
