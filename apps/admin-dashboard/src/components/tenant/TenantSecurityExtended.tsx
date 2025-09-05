import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityResp { tenantId: string; staff: Array<{ id: string; user_id: string; role: string; status: string; last_login_at: string | null; created_at: string }>; recoveryEvents: Array<{ id: string; at: string; type: string; message: string; details: any }>; requestId: string; generatedAt: string; }

export function TenantSecurityExtended({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<SecurityResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-security', { body: { tenantId } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as SecurityResp);
    } catch (e) {
      toast({ title: 'Security fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh Security Data'}</Button>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()} • req {data.requestId.slice(0,8)}</p>}
      </div>
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Staff Accounts</CardTitle><CardDescription>Active staff and roles</CardDescription></CardHeader>
            <CardContent className="p-4 space-y-2 text-xs font-mono max-h-64 overflow-auto">
              {data.staff.map(s => <div key={s.id} className="flex justify-between"><span>{s.role}</span><span>{s.status}</span></div>)}
              {data.staff.length === 0 && <p className="text-muted-foreground">No staff records.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Recovery Events</CardTitle><CardDescription>Recent link issuances</CardDescription></CardHeader>
            <CardContent className="p-4 space-y-2 text-xs max-h-64 overflow-auto">
              {data.recoveryEvents.map(ev => <div key={ev.id} className="border rounded px-2 py-1"><p>{ev.type} @ {new Date(ev.at).toLocaleString()}</p><p className="text-muted-foreground line-clamp-2">{ev.message}</p></div>)}
              {data.recoveryEvents.length === 0 && <p className="text-muted-foreground">No recovery events.</p>}
            </CardContent>
          </Card>
        </div>
      )}
      {!data && <p className="text-sm text-muted-foreground">Refresh to load staff and recovery issuance history.</p>}
    </div>
  );
}
