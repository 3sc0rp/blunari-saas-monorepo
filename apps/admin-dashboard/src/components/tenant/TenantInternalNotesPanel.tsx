import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Note { id: string; body: string; staff_id: string; created_at: string }
interface Resp { tenantId: string; notes: Note[]; requestId: string; generatedAt: string }

export function TenantInternalNotesPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('admin-tenant-notes', { body: { tenantId, action: 'list' } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setData(resp as Resp);
    } catch (e) { toast({ title: 'Notes fetch failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    const optimistic: Note = { id: 'optimistic-'+Date.now(), body: draft.trim(), staff_id: 'you', created_at: new Date().toISOString() };
    setData(prev => prev ? { ...prev, notes: [optimistic, ...prev.notes] } : prev);
    try {
      const { data: resp, error } = await supabase.functions.invoke('admin-tenant-notes', { body: { tenantId, action: 'create', note: draft.trim() } });
      if (error || resp?.error) throw new Error(error?.message || resp?.error?.message || 'Failed');
      setDraft('');
      load();
    } catch (e) {
      toast({ title: 'Add note failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      // rollback optimistic
      setData(prev => prev ? { ...prev, notes: prev.notes.filter(n => !n.id.startsWith('optimistic-')) } : prev);
    } finally { setSubmitting(false); }
  };

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        {data && <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString()}</p>}
      </div>
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Internal Notes</CardTitle><CardDescription>Private staff-only context.</CardDescription></CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="space-y-2">
            <Textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a note about this tenant…" rows={3} />
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={submitting || !draft.trim()}>{submitting ? 'Saving…' : 'Add Note'}</Button>
            </div>
          </div>
          <div className="divide-y rounded border">
            {data && data.notes.length === 0 && <p className="text-xs p-3 text-muted-foreground">No notes yet.</p>}
            {data?.notes.map(n => (
              <div key={n.id} className="p-3 text-xs">
                <p className="whitespace-pre-wrap leading-snug">{n.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{new Date(n.created_at).toLocaleString()} • {n.staff_id}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
