import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyRow { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null; }

export function TenantApiKeysPanel({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealed, setRevealed] = useState<{ id: string; apiKey: string } | null>(null);

  const list = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-tenant-api-keys', { body: { action: 'list', tenantId } });
      if (error || data?.error) throw new Error(error?.message || data?.error?.message || 'Failed');
      setKeys(data.data || []);
    } catch (e) {
      toast({ title: 'List failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (tenantId) list(); }, [tenantId]);

  const createKey = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-tenant-api-keys', { body: { action: 'create', tenantId, name: newName.trim() } });
      if (error || data?.error) throw new Error(error?.message || data?.error?.message || 'Failed');
      setRevealed({ id: data.data.id, apiKey: data.data.apiKey });
      setNewName('');
      await list();
    } catch (e) {
      toast({ title: 'Create failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const revoke = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-tenant-api-keys', { body: { action: 'revoke', tenantId, keyId: id } });
      if (error || data?.error) throw new Error(error?.message || data?.error?.message || 'Failed');
      await list();
    } catch (e) {
      toast({ title: 'Revoke failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage programmatic access for this tenant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input placeholder="Key name" value={newName} onChange={(e)=>setNewName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={createKey} disabled={creating || !newName.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
          <Button size="sm" variant="outline" onClick={list} disabled={loading}>{loading ? 'Reload…' : 'Refresh'}</Button>
        </div>
        {revealed && (
          <div className="p-3 rounded border bg-muted/50 text-xs">
            <p className="font-mono break-all"><strong>Copy now:</strong> {revealed.apiKey}</p>
            <p className="text-muted-foreground mt-1">This value is only shown once. Store it securely.</p>
          </div>
        )}
        <div className="space-y-2">
          {keys.length === 0 && <p className="text-sm text-muted-foreground">No API keys yet.</p>}
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">Created {new Date(k.created_at).toLocaleDateString()} {k.revoked_at && <span className="text-destructive ml-1">(revoked)</span>}</p>
              </div>
              <div className="flex items-center gap-2">
                {!k.revoked_at && <Button size="sm" variant="destructive" onClick={()=>revoke(k.id)}>Revoke</Button>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
