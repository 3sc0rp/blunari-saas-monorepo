import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { sendAnalyticsEvent } from '@/api/booking-proxy';

type SceneMapItem = { mesh: string; seatId?: string; label?: string; capacity?: number };

async function fetchScene(area: string) {
  const res = await fetch(`/api/scene?area=${encodeURIComponent(area)}`);
  return res.json() as Promise<{ glbUrl: string; map: SceneMapItem[] }>;
}

function SceneModel({ url, onMeshClick }: { url: string; onMeshClick?: (meshName: string) => void }) {
  const { scene } = useGLTF(url, true);
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    const name = e?.object?.name || e?.target?.name || '';
    if (name && onMeshClick) onMeshClick(name);
  }, [onMeshClick]);
  return <primitive object={scene} onPointerDown={handlePointerDown} />;
}

const Public3DExperience: React.FC = () => {
  const [area] = useState(() => new URLSearchParams(window.location.search).get('area') || 'main-dining');
  const [slug] = useState(() => new URLSearchParams(window.location.search).get('slug') || 'demo');
  const [scene, setScene] = useState<{ glbUrl: string; map: SceneMapItem[] } | null>(null);
  const [fallback2D, setFallback2D] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<SceneMapItem | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const webglAvailable = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch { return false; }
    })();
    if (!webglAvailable) {
      setFallback2D(true);
      return;
    }
    timeoutRef.current = window.setTimeout(() => setFallback2D(true), 2500);
    fetch(`/api/scene?area=${encodeURIComponent(area)}`).then(async (res) => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (res.status === 403) { setForbidden(true); return; }
      const s = await res.json();
      setScene(s);
      sendAnalyticsEvent('three_d_area_view', { area, slug }).catch(() => {});
    }).catch(() => setFallback2D(true));
    return () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } };
  }, [area]);

  const onBack = () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'demo';
    window.location.href = `/public-widget/book/${encodeURIComponent(slug)}`;
  };

  if (fallback2D) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">3D view unavailable</h2>
            <p className="text-sm text-muted-foreground">Your device does not support WebGL or the scene took too long to load. Using standard booking instead.</p>
            <Button onClick={onBack}>Back to Standard View</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">3D Floor not enabled</h2>
            <p className="text-sm text-muted-foreground">Upgrade your plan to unlock the interactive 3D Floor View.</p>
            <div className="flex gap-2">
              <a href={`/api/stripe/checkout?feature=three_d_floor`}>
                <Button>Upgrade</Button>
              </a>
              <Button variant="secondary" onClick={onBack}>Back to Standard View</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scene?.glbUrl) {
    return <div className="p-8 text-center text-muted-foreground">Loading 3D experience…</div>;
  }

  const handleMeshClick = useCallback((meshName: string) => {
    const hit = scene?.map?.find?.((m: any) => m.mesh === meshName) || null;
    if (hit) {
      setSelectedSeat(hit);
      sendAnalyticsEvent('three_d_table_click', { seatId: hit.seatId || hit.label || meshName, area, slug }).catch(() => {});
    }
  }, [scene, area, slug]);

  return (
    <div className="w-full h-[calc(100vh-2rem)] p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base font-medium">3D Floor: {area}</h1>
        <Button variant="secondary" onClick={onBack}>Back to Standard View</Button>
      </div>
      <div className="w-full h-full rounded-lg overflow-hidden border">
        <Canvas camera={{ position: [0, 2, 5], fov: 55 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 7.5]} intensity={0.8} />
          <Suspense fallback={null}>
            <SceneModel url={scene.glbUrl} onMeshClick={handleMeshClick} />
          </Suspense>
          <OrbitControls makeDefault />
        </Canvas>
      </div>

      <Drawer open={!!selectedSeat} onOpenChange={(o) => !o && setSelectedSeat(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Seat {selectedSeat?.label || selectedSeat?.seatId}</DrawerTitle>
          </DrawerHeader>
          {/* For MVP, just deep-link to the widget with seat as query param */}
          <div className="p-4">
            <a href={`/public-widget/book/${encodeURIComponent(slug)}?seat=${encodeURIComponent(selectedSeat?.seatId || '')}`}>
              <Button className="w-full">Start Booking</Button>
            </a>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Public3DExperience;

// drei GLTF loader preloader
useGLTF.preload('/placeholder.glb');


