import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OperationsResp { tenantId: string; rateState: any; jobs: Array<{ id: string; job_type: string; status: string; created_at: string; updated_at: string | null; job_name: string | null; retry_count: number }>; requestId: string; generatedAt: string; }

export function TenantOperationsPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<OperationsResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await (supabase as any).functions.invoke('admin-tenant-operations', { body: { tenantId } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as OperationsResp);
    } catch (e) {
      toast({ title: 'Ops fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh Ops'}</Button>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()}</p>}
      </div>
      {data && (
        <div className="space-y-4">
          {data.rateState && (
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm">Password Setup Rate Limit</CardTitle><CardDescription>Remaining link issuances in windows</CardDescription></CardHeader>
              <CardContent className="p-3 text-xs grid gap-1">
                <p>Tenant: {data.rateState.tenant_remaining} / {data.rateState.tenant_limit} (window {data.rateState.tenant_window_seconds}s)</p>
                <p>Admin: {data.rateState.admin_remaining} / {data.rateState.admin_limit} (window {data.rateState.admin_window_seconds}s)</p>
                {data.rateState.limited && <p className="text-destructive">Limited: {data.rateState.limited_reason}</p>}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="p-3"><CardTitle className="text-sm">Recent Jobs</CardTitle><CardDescription>Last background jobs referencing this tenant</CardDescription></CardHeader>
            <CardContent className="p-0 divide-y">
              {data.jobs.length === 0 && <p className="text-xs p-3 text-muted-foreground">No jobs found.</p>}
              {data.jobs.map(j => (
                <div key={j.id} className="p-3 text-xs flex justify-between">
                  <span className="font-mono">{j.id.slice(0,8)}</span>
                  <span>{j.job_type}</span>
                  <span>{j.status}</span>
                  <span>{new Date(j.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
      {!data && <p className="text-sm text-muted-foreground">Refresh to view operational state.</p>}
    </div>
  );
}
