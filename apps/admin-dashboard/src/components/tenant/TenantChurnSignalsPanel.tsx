import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Signal { id: string; signal_type: string; severity: string; detected_at: string; notes: string | null; metadata: any }
interface Resp { tenantId: string; signals: Signal[]; requestId: string; generatedAt: string }

const severityColor: Record<string,string> = { low: 'bg-emerald-500/20 text-emerald-700', medium: 'bg-amber-500/20 text-amber-700', high: 'bg-red-500/20 text-red-700' };

export function TenantChurnSignalsPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-churn', { body: { tenantId } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as Resp);
    } catch (e) { toast({ title: 'Churn signals fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        {data && <p className="text-xs text-muted-foreground">{data.signals.length} signals</p>}
      </div>
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Churn Signals</CardTitle><CardDescription>Risk indicators for this tenant.</CardDescription></CardHeader>
        <CardContent className="p-0 divide-y">
          {data && data.signals.length === 0 && <p className="text-xs p-3 text-muted-foreground">No signals yet.</p>}
          {data?.signals.map(s => (
            <div key={s.id} className="p-3 text-xs grid grid-cols-5 gap-2 items-start">
              <span className="font-medium">{s.signal_type}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold ${severityColor[s.severity] || 'bg-muted'}`}>{s.severity}</span>
              <span>{new Date(s.detected_at).toLocaleDateString()}</span>
              <span className="truncate text-muted-foreground">{s.notes || ''}</span>
              <details className="col-span-5 md:col-span-1">
                <summary className="cursor-pointer text-[10px] opacity-70">Meta</summary>
                <pre className="mt-1 bg-muted/50 rounded p-2 text-[10px] overflow-x-auto">{JSON.stringify(s.metadata, null, 2)}</pre>
              </details>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
