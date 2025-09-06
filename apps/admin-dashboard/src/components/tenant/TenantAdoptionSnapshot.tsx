import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Snapshot { tenant_id: string; active_modules: number; enabled_features: number; adoption_ratio: number }

export function TenantAdoptionSnapshot({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tenant_adoption_snapshot')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      setSnap(data as Snapshot);
    } catch (e) {
      toast({ title: 'Failed to load adoption snapshot', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantId]);

  const ratio = snap?.adoption_ratio ?? 0;
  const pct = Math.round(ratio * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Adoption</CardTitle>
            <CardDescription>Active modules vs enabled features (14d)</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? '...' : 'Refresh'}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span>{snap?.active_modules || 0} active</span>
          <span>{snap?.enabled_features || 0} enabled</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground">Adoption ratio = active modules in last 14d / enabled features.</p>
      </CardContent>
    </Card>
  );
}
