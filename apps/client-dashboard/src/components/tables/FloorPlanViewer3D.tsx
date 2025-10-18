"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Text,
  Environment,
  ContactShadows,
  Float,
  Html,
  Sparkles,
} from "@react-three/drei";
import { useFloorPlanStore } from "@/state/useFloorPlanStore";
import { useMemo, useRef, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Move3D,
  RotateCcw,
  ZoomIn,
  Eye,
  Settings,
  Download,
  Maximize2,
  Users,
  Star,
  Lightbulb,
  Volume2,
  Sparkles as SparklesIcon,
} from "lucide-react";
import * as THREE from "three";

// Enhanced Round Table with realistic materials and details
function RoundTable({
  x,
  y,
  r,
  rotation,
  label,
  seats,
  confidence,
}: {
  x: number;
  y: number;
  r: number;
  rotation: number;
  label?: string;
  seats: number;
  confidence?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);

  const tableColor = confidence && confidence > 0.7 ? "#8B4513" : "#A0522D";
  const topColor = hovered ? "#F4D03F" : selected ? "#E8D5B7" : "#DEB887";
  const glowColor = hovered ? "#FFD700" : selected ? "#FFA500" : "transparent";

  return (
    <group
      ref={groupRef}
      position={[x - 5, 0, y - 5]}
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(!selected);
      }}
    >
      {/* Ambient glow effect */}
      {(hovered || selected) && (
        <pointLight
          position={[0, 0.5, 0]}
          intensity={0.3}
          color={glowColor}
          distance={2}
        />
      )}

      {/* Contact shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 1.1, 32]} />
        <meshBasicMaterial color="black" transparent opacity={0.15} />
      </mesh>

      {/* Table pedestal */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[r * 0.2, r * 0.3, 0.4, 16]} />
        <meshStandardMaterial
          color={tableColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Table base */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[r * 0.9, r, 0.08, 32]} />
        <meshStandardMaterial
          color={tableColor}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Table top with matte finish */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[r, r, 0.05, 32]} />
        <meshStandardMaterial
          color={topColor}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Table edge detail */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[r + 0.02, r + 0.02, 0.02, 32]} />
        <meshStandardMaterial color="#8B4513" roughness={0.4} />
      </mesh>

      {/* Chairs arranged around table */}
      {Array.from({ length: seats }, (_, i) => {
        const angle = (i / seats) * Math.PI * 2;
        const chairDistance = r + 0.4;
        const chairX = Math.cos(angle) * chairDistance;
        const chairZ = Math.sin(angle) * chairDistance;

        return (
          <group
            key={i}
            position={[chairX, 0, chairZ]}
            rotation={[0, angle + Math.PI, 0]}
          >
            {/* Chair seat */}
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.18, 0.05, 0.18]} />
              <meshStandardMaterial color="#654321" roughness={0.7} />
            </mesh>
            {/* Chair legs */}
            {[
              [-0.07, -0.07],
              [0.07, -0.07],
              [-0.07, 0.07],
              [0.07, 0.07],
            ].map(([x, z], idx) => (
              <mesh key={idx} position={[x, 0.125, z]}>
                <cylinderGeometry args={[0.01, 0.01, 0.25, 8]} />
                <meshStandardMaterial color="#654321" />
              </mesh>
            ))}
            {/* Chair back */}
            <mesh position={[0, 0.4, -0.08]}>
              <boxGeometry args={[0.18, 0.25, 0.03]} />
              <meshStandardMaterial color="#654321" roughness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Floating label with glass effect */}
      {label && (
        <Html position={[0, 0.8, 0]} center>
          <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg border border-surface-3/20 animate-fade-in">
            <div className="text-sm font-semibold text-text">{label}</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              <Users className="w-3 h-3" />
              {seats} seats
              {confidence && (
                <>
                  <Star className="w-3 h-3 ml-1" />
                  {Math.round(confidence * 100)}%
                </>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Enhanced Rectangular Table
function RectTable({
  x,
  y,
  w,
  h,
  rotation,
  label,
  seats,
  confidence,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  label?: string;
  seats: number;
  confidence?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);

  const tableColor = confidence && confidence > 0.7 ? "#8B4513" : "#A0522D";
  const topColor = hovered ? "#F4D03F" : selected ? "#E8D5B7" : "#DEB887";

  return (
    <group
      ref={groupRef}
      position={[x - 5, 0, y - 5]}
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(!selected);
      }}
    >
      {/* Contact shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 1.1, h * 1.1]} />
        <meshBasicMaterial color="black" transparent opacity={0.15} />
      </mesh>

      {/* Table legs */}
      {[
        [-w / 2 + 0.1, h / 2 - 0.1],
        [w / 2 - 0.1, h / 2 - 0.1],
        [-w / 2 + 0.1, -h / 2 + 0.1],
        [w / 2 - 0.1, -h / 2 + 0.1],
      ].map(([legX, legZ], i) => (
        <mesh key={i} position={[legX, 0.175, legZ]}>
          <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
          <meshStandardMaterial color={tableColor} roughness={0.8} />
        </mesh>
      ))}

      {/* Table frame */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[w * 0.95, 0.08, h * 0.95]} />
        <meshStandardMaterial
          color={tableColor}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Table top with matte finish */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[w, 0.05, h]} />
        <meshStandardMaterial
          color={topColor}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Chairs around perimeter */}
      {Array.from({ length: seats }, (_, i) => {
        const perimeter = 2 * (w + h);
        const position = (i / seats) * perimeter;
        let chairX = 0,
          chairZ = 0,
          chairRotation = 0;

        if (position < w) {
          chairX = position - w / 2;
          chairZ = -h / 2 - 0.4;
          chairRotation = 0;
        } else if (position < w + h) {
          chairX = w / 2 + 0.4;
          chairZ = position - w - h / 2;
          chairRotation = Math.PI / 2;
        } else if (position < 2 * w + h) {
          chairX = w / 2 - (position - w - h);
          chairZ = h / 2 + 0.4;
          chairRotation = Math.PI;
        } else {
          chairX = -w / 2 - 0.4;
          chairZ = h / 2 - (position - 2 * w - h);
          chairRotation = -Math.PI / 2;
        }

        return (
          <group
            key={i}
            position={[chairX, 0, chairZ]}
            rotation={[0, chairRotation, 0]}
          >
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.18, 0.05, 0.18]} />
              <meshStandardMaterial color="#654321" roughness={0.7} />
            </mesh>
            {[
              [-0.07, -0.07],
              [0.07, -0.07],
              [-0.07, 0.07],
              [0.07, 0.07],
            ].map(([x, z], idx) => (
              <mesh key={idx} position={[x, 0.125, z]}>
                <cylinderGeometry args={[0.01, 0.01, 0.25, 8]} />
                <meshStandardMaterial color="#654321" />
              </mesh>
            ))}
            <mesh position={[0, 0.4, -0.08]}>
              <boxGeometry args={[0.18, 0.25, 0.03]} />
              <meshStandardMaterial color="#654321" roughness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Floating label */}
      {label && (
        <Html position={[0, 0.8, 0]} center>
          <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg border border-surface-3/20 animate-fade-in">
            <div className="text-sm font-semibold text-text">{label}</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              <Users className="w-3 h-3" />
              {seats} seats
              {confidence && (
                <>
                  <Star className="w-3 h-3 ml-1" />
                  {Math.round(confidence * 100)}%
                </>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Enhanced floor surface with neutral grid and brand accent lines
function RestaurantFloor() {
  return (
    <group>
      {/* Neutral floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="hsl(var(--surface-2))"
          roughness={0.9}
          metalness={0.0}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Brand accent grid lines every 5 units */}
      {Array.from({ length: 9 }, (_, i) => {
        const position = (i - 4) * 5;
        return (
          <group key={i}>
            {/* Vertical lines */}
            <mesh
              position={[position, 0.005, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.05, 20]} />
              <meshBasicMaterial
                color="hsl(var(--brand))"
                transparent
                opacity={0.3}
              />
            </mesh>
            {/* Horizontal lines */}
            <mesh
              position={[0, 0.005, position]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[20, 0.05]} />
              <meshBasicMaterial
                color="hsl(var(--brand))"
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Soft contact shadows */}
      <ContactShadows
        opacity={0.2}
        scale={15}
        blur={3}
        far={6}
        resolution={256}
        color="hsl(var(--muted-foreground))"
        smooth
      />
    </group>
  );
}

// Loading component for 3D scene
function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-muted-foreground">
          Loading 3D Environment...
        </div>
      </div>
    </Html>
  );
}

export default function FloorPlanViewer3D() {
  const { entities } = useFloorPlanStore();
  const [viewMode, setViewMode] = useState<"perspective" | "top" | "walk">(
    "perspective",
  );
  const [enableAudio, setEnableAudio] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const tables = useMemo(
    () => entities.filter((e) => e.type === "TABLE"),
    [entities],
  );

  const stats = useMemo(() => {
    const totalCapacity = tables.reduce((sum, t) => sum + t.seats, 0);
    const avgConfidence =
      tables.length > 0
        ? tables.reduce((sum, t) => sum + (t.confidence || 0), 0) /
          tables.length
        : 0;
    const highConfidenceTables = tables.filter(
      (t) => (t.confidence || 0) > 0.7,
    ).length;

    return { totalCapacity, avgConfidence, highConfidenceTables };
  }, [tables]);

  const getCameraPosition = (): [number, number, number] => {
    switch (viewMode) {
      case "perspective":
        return [8, 6, 8];
      case "top":
        return [0, 15, 0.1];
      case "walk":
        return [0, 1.7, 5];
      default:
        return [8, 6, 8];
    }
  };

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-brand to-accent text-brand-foreground">
              <Move3D className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                Interactive 3D Restaurant
              </h3>
              <p className="text-sm text-muted-foreground font-normal">
                Professional floor plan visualization with AI-detected tables
              </p>
            </div>
          </CardTitle>

          <div className="flex items-center gap-2">
            {showStats && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Badge
                  variant="outline"
                  className="flex flex-col gap-1 py-2 hover-scale"
                >
                  <span className="font-bold text-lg">{tables.length}</span>
                  <span>Tables</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="flex flex-col gap-1 py-2 hover-scale"
                >
                  <span className="font-bold text-lg">
                    {stats.totalCapacity}
                  </span>
                  <span>Capacity</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="flex flex-col gap-1 py-2 hover-scale"
                >
                  <span className="font-bold text-lg">
                    {Math.round(stats.avgConfidence * 100)}%
                  </span>
                  <span>Confidence</span>
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Control Panel */}
        <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "perspective" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("perspective")}
              className="hover-scale"
            >
              <Eye className="w-4 h-4 mr-1" />
              Perspective
            </Button>
            <Button
              variant={viewMode === "top" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("top")}
              className="hover-scale"
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              Top View
            </Button>
            <Button
              variant={viewMode === "walk" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("walk")}
              className="hover-scale"
            >
              <Users className="w-4 h-4 mr-1" />
              Walk Mode
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEnableAudio(!enableAudio)}
              className="hover-scale"
            >
              <Volume2
                className={`w-4 h-4 ${enableAudio ? "" : "opacity-50"}`}
              />
            </Button>
            <Button variant="ghost" size="sm" className="hover-scale">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover-scale">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 3D Scene */}
        <div className="h-[600px] relative bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
          <Canvas
            camera={{
              position: getCameraPosition(),
              fov: viewMode === "walk" ? 80 : 60,
            }}
            shadows
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
            }}
            frameloop="demand"
            performance={{ min: 0.2 }}
          >
            <Suspense fallback={<SceneLoader />}>
              {/* Enhanced Lighting Setup - Ambient ~0.6 */}
              <ambientLight intensity={0.6} color="hsl(var(--background))" />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                color="#FFFFFF"
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
              />

              {/* Restaurant ambiance lighting */}
              <pointLight
                position={[-3, 4, -3]}
                intensity={0.4}
                color="#FFE4B5"
              />
              <pointLight
                position={[3, 4, 3]}
                intensity={0.4}
                color="#F0F8FF"
              />
              <spotLight
                position={[0, 8, 0]}
                intensity={0.6}
                angle={Math.PI / 3}
                penumbra={0.5}
                color="#FFFACD"
                castShadow
              />

              {/* Environment and atmosphere */}
              <Environment preset="apartment" background={false} />
              <fog attach="fog" args={["#F5F5DC", 15, 25]} />

              {/* Restaurant floor */}
              <RestaurantFloor />

              {/* Enhanced grid */}
              <Grid
                args={[10, 10]}
                cellSize={1}
                infiniteGrid={false}
                fadeDistance={20}
                fadeStrength={0.5}
                cellThickness={0.8}
                sectionThickness={1.2}
                cellColor="#E0E0E0"
                sectionColor="#C0C0C0"
              />

              {/* Render tables with enhanced details */}
              {tables.map((t, i) => {
                if (t.shape === "ROUND" && t.radius) {
                  return (
                    <RoundTable
                      key={t.id || i}
                      x={t.x}
                      y={t.y}
                      r={t.radius}
                      rotation={t.rotation}
                      label={t.label}
                      seats={t.seats}
                      confidence={t.confidence}
                    />
                  );
                }
                const w = t.width ?? 1.2;
                const h = t.height ?? 0.8;
                return (
                  <RectTable
                    key={t.id || i}
                    x={t.x}
                    y={t.y}
                    w={w}
                    h={h}
                    rotation={t.rotation}
                    label={t.label}
                    seats={t.seats}
                    confidence={t.confidence}
                  />
                );
              })}

              {/* Enhanced camera controls */}
              <OrbitControls
                enablePan={true}
                enableRotate={true}
                enableZoom={true}
                minDistance={2}
                maxDistance={30}
                maxPolarAngle={
                  viewMode === "top"
                    ? 0.1
                    : viewMode === "walk"
                      ? Math.PI / 2.5
                      : Math.PI / 2.1
                }
                dampingFactor={0.05}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
                panSpeed={0.8}
                autoRotate={false}
                autoRotateSpeed={0.5}
              />
            </Suspense>
          </Canvas>

          {/* Overlay UI for empty state */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/20 backdrop-blur-sm">
              <div className="text-center text-text bg-surface/80 p-8 rounded-2xl backdrop-blur-sm border border-surface-3/30 animate-fade-in">
                <Move3D className="w-16 h-16 mx-auto mb-4 opacity-70" />
                <h3 className="text-xl font-semibold mb-2">
                  No Tables to Display
                </h3>
                <p className="text-sm opacity-90 max-w-md">
                  Upload and analyze a floor plan to see your restaurant come to
                  life in 3D
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Controls Footer */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 border-t">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <SparklesIcon className="w-3 h-3 text-yellow-500" />
              AI Enhanced
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <RotateCcw className="w-3 h-3" />
              Drag to Rotate
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <ZoomIn className="w-3 h-3" />
              Scroll to Zoom
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <Move3D className="w-3 h-3" />
              Click Tables
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <Lightbulb className="w-3 h-3" />
              Realistic Lighting
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 justify-center py-2 hover-scale"
            >
              <Eye className="w-3 h-3" />
              Multiple Views
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
