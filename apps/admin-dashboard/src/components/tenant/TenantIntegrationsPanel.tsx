import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration { id: string; provider: string; status: string; last_checked_at: string | null; metadata: any; created_at: string }
interface Resp { tenantId: string; integrations: Integration[]; requestId: string; generatedAt: string }

export function TenantIntegrationsPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-integrations', { body: { tenantId } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as Resp);
    } catch (e) { toast({ title: 'Integrations fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()}</p>}
      </div>
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Integrations</CardTitle><CardDescription>External systems connected for this tenant.</CardDescription></CardHeader>
        <CardContent className="p-0 divide-y">
          {data && data.integrations.length === 0 && <p className="text-xs p-3 text-muted-foreground">No integrations yet.</p>}
          {data?.integrations.map(i => (
            <div key={i.id} className="p-3 text-xs grid grid-cols-5 gap-2 items-center">
              <span className="font-medium">{i.provider}</span>
              <span className="px-2 py-0.5 rounded bg-muted w-fit text-[10px] uppercase tracking-wide">{i.status}</span>
              <span>{i.last_checked_at ? new Date(i.last_checked_at).toLocaleDateString() : '—'}</span>
              <span className="truncate text-muted-foreground">{i.metadata?.detail || ''}</span>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" disabled>Check</Button>
                <Button size="sm" variant="outline" disabled>Disconnect</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
