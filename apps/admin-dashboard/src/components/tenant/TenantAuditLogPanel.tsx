import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LogItem { id: string; actor_id: string | null; actor_type: string | null; action: string; created_at: string; metadata: any }
interface Resp { tenantId: string; items: LogItem[]; cursor: string | null; requestId: string; generatedAt: string }

export function TenantAuditLogPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<LogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const load = async (reset=false) => {
    if (loading) return;
    setLoading(true);
    try {
      const body: any = { tenantId };
      if (!reset && cursor) body.cursor = cursor;
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-audit', { body });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      const r = resp as Resp;
      setCursor(r.cursor);
      setItems(prev => reset ? r.items : [...prev, ...r.items]);
      setInitialLoaded(true);
    } catch (e) { toast({ title: 'Audit fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { setItems([]); setCursor(null); setInitialLoaded(false); load(true); }, [tenantId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => load(true)} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        {initialLoaded && <p className="text-xs text-muted-foreground">Showing {items.length} events</p>}
      </div>
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Audit Log</CardTitle><CardDescription>Recent activity relating to this tenant.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-auto divide-y text-xs font-mono">
            {items.length === 0 && !loading && <p className="p-3 text-muted-foreground">No activity yet.</p>}
            {items.map(i => (
              <div key={i.id} className="p-3 space-y-1">
                <div className="flex justify-between"><span>{i.action}</span><span>{new Date(i.created_at).toLocaleTimeString()}</span></div>
                <div className="flex justify-between text-[10px] opacity-70"><span>{i.actor_type}:{i.actor_id || 'n/a'}</span><span>{i.id.slice(0,8)}</span></div>
                {i.metadata && <pre className="bg-muted/50 rounded p-2 text-[10px] overflow-x-auto">{JSON.stringify(i.metadata, null, 2)}</pre>}
              </div>
            ))}
          </div>
          <div className="p-3 flex justify-between items-center">
            <Button size="sm" variant="secondary" onClick={() => load(false)} disabled={loading || !cursor}>{cursor ? (loading ? 'Loading…' : 'Load More') : 'End'}</Button>
            {cursor && <p className="text-[10px] text-muted-foreground">Cursor: {cursor}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
