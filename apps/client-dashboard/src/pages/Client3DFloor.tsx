import React, { useMemo, useState } from "react";
import { useEntitlement } from "@/lib/entitlements";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

const STRIPE_PRICE = import.meta.env.VITE_STRIPE_PRICE_3D_FLOOR as string | undefined;
const STRIPE_PORTAL_URL = import.meta.env.VITE_STRIPE_PORTAL_URL as string | undefined;

const Upsell: React.FC<{ tenantId?: string; slug?: string }> = ({ tenantId, slug }) => (
  <div className="max-w-2xl mx-auto">
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Upgrade to 3D Floor (Beta)</h2>
        <p className="text-sm text-muted-foreground">Interactive 3D floor with table selection and live availability.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Upload GLB scene and map meshes to tables</li>
          <li>Click tables to start the same booking flow</li>
          <li>Fallback to 2D automatically on low-end devices</li>
        </ul>
      </CardContent>
      <CardFooter className="gap-3">
        {STRIPE_PRICE ? (
          <a href={`/api/stripe/checkout?price=${encodeURIComponent(STRIPE_PRICE)}&feature=three_d_floor${tenantId ? `&tenant=${encodeURIComponent(tenantId)}` : ''}${slug ? `&slug=${encodeURIComponent(slug)}` : ''}`}>
            <Button>Upgrade</Button>
          </a>
        ) : null}
        {STRIPE_PORTAL_URL ? (
          <a href={STRIPE_PORTAL_URL} target="_blank" rel="noreferrer">
            <Button variant="secondary">Customer Portal</Button>
          </a>
        ) : null}
      </CardFooter>
    </Card>
  </div>
);

const Client3DFloor: React.FC = () => {
  const { entitled } = useEntitlement('three_d_floor');
  const { tenant } = useTenant();
  const [glbUrl, setGlbUrl] = useState<string>("");
  const [area, setArea] = useState<string>("main-dining");
  const [sceneMapJson, setSceneMapJson] = useState<string>(`[
  { "mesh": "Table_01", "seatId": "T1", "capacity": 4 }
]`);
  const [saving, setSaving] = useState(false);

  const onUploadGlb = (url: string) => setGlbUrl(url);

  const saveScene = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      let parsed: any = [];
      try { parsed = JSON.parse(sceneMapJson || '[]'); } catch {}
      const payload = { glbUrl, map: parsed };
      await supabase.from('tenant_settings').upsert({
        tenant_id: tenant.id,
        setting_key: `scene:${area}`,
        setting_value: payload,
      }, { onConflict: 'tenant_id,setting_key' });
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => {
    const slug = tenant?.slug || 'demo';
    return `/experience/3d?slug=${encodeURIComponent(slug)}&area=${encodeURIComponent(area)}`;
  }, [tenant?.slug, area]);

  if (!entitled) return <Upsell tenantId={tenant?.id} slug={tenant?.slug} />;

  return (
    <div className="max-w-5xl mx-auto grid gap-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">3D Floor Scene</h2>
          <p className="text-sm text-muted-foreground">Upload your GLB and map meshes to seats/tables.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Dining area (key)</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="main-dining" />
            </div>
            <div className="space-y-2">
              <Label>GLB Scene</Label>
              <FileUpload value={glbUrl} onChange={onUploadGlb} accept=".glb" maxSize={10 * 1024 * 1024} label="3D Scene (.glb)" description="Upload a GLB file for your dining area" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Scene Map JSON</Label>
            <Textarea rows={10} value={sceneMapJson} onChange={(e) => setSceneMapJson(e.target.value)} spellCheck={false} className="font-mono" />
            <p className="text-xs text-muted-foreground">Format: [{'{'} mesh, seatId, capacity {'}'}] per entry</p>
          </div>
        </CardContent>
        <CardFooter className="gap-3">
          <Button onClick={saveScene} disabled={saving}>{saving ? 'Saving…' : 'Save Scene'}</Button>
          <a href={previewUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary">Preview</Button>
          </a>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Client3DFloor;
