import React, { useState, useMemo, useCallback, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Text, Html, Box } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { useWebGLContextManager } from "@/hooks/useWebGLContextManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D,
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  FloorPlanAI,
  type FloorPlanAnalysis,
  type DetectedTable,
} from "@/services/FloorPlanAI";

interface Table3DProps {
  position: [number, number, number];
  capacity: number;
  name: string;
  isAvailable: boolean;
}

interface FloorPlanProps {
  floorPlanImage?: string;
  tables: Array<{
    id: string;
    name: string;
    capacity: number;
    position: { x: number; y: number };
    active: boolean;
  }>;
}

// 3D Table Component with Performance Optimizations
const Table3D: React.FC<Table3DProps> = React.memo(({
  position,
  capacity,
  name,
  isAvailable,
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const tableColor = useMemo(() => isAvailable ? "#10b981" : "#ef4444", [isAvailable]);
  const tableSize = useMemo(() => Math.max(0.3, capacity * 0.15), [capacity]);
  const hoverColor = useMemo(() => hovered ? "#fbbf24" : "#f3f4f6", [hovered]);

  const handlePointerOver = useCallback(() => setHovered(true), []);
  const handlePointerOut = useCallback(() => setHovered(false), []);

  return (
    <group position={position}>
      {/* Table Base */}
      <Box
        ref={meshRef}
        args={[tableSize, 0.1, tableSize]}
        position={[0, 0.05, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial color={tableColor} />
      </Box>

      {/* Table Top */}
      <Box
        args={[tableSize * 1.1, 0.05, tableSize * 1.1]}
        position={[0, 0.125, 0]}
      >
        <meshStandardMaterial color={hoverColor} />
      </Box>

      {/* Table Label */}
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.1}
        color="#374151"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>

      {/* Capacity Badge */}
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.08}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {capacity} seats
      </Text>
    </group>
  );
});

Table3D.displayName = 'Table3D';

// Floor Plan Plane Component
const FloorPlanPlane: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  // Always render the default plane if no image URL
  if (!imageUrl) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.8} />
      </mesh>
    );
  }

  // Suspense wrapper for texture loading
  return (
    <Suspense
      fallback={
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.8} />
        </mesh>
      }
    >
      <FloorPlanPlaneWithTexture imageUrl={imageUrl} />
    </Suspense>
  );
};

// Separate component for texture loading
const FloorPlanPlaneWithTexture: React.FC<{ imageUrl: string }> = ({
  imageUrl,
}) => {
  const texture = useLoader(TextureLoader, imageUrl);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial map={texture} transparent opacity={0.9} />
    </mesh>
  );
};

// Error Boundary for 3D Components
class WebGL3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WebGL 3D Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
          <div className="text-center space-y-2">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-medium">3D View Unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              WebGL rendering encountered an issue. This might be due to hardware limitations or browser settings.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main 3D Scene Component with Advanced WebGL Management
const FloorPlan3D: React.FC<FloorPlanProps> = React.memo(({ floorPlanImage, tables }) => {
  // Advanced WebGL context management
  const webglManager = useWebGLContextManager({
    maxRetries: 3,
    retryDelay: 1000,
    onContextLost: () => {
      console.warn("FloorPlan3D: WebGL context lost, maintaining state");
    },
    onContextRestored: () => {
      console.log("FloorPlan3D: WebGL context restored successfully");
    },
    onMaxRetriesReached: () => {
      console.error("FloorPlan3D: WebGL permanently unavailable, consider 2D fallback");
    }
  });

  // Memoize table positions for performance
  const memoizedTables = useMemo(() => 
    tables.map(table => ({
      ...table,
      position3D: [
        (table.position.x - 5) * 2, // Convert to 3D coordinates
        0,
        (table.position.y - 5) * 2,
      ] as [number, number, number]
    })), [tables]
  );

  // Memoize Canvas configuration
  const canvasConfig = useMemo(() => ({
    camera: { position: [0, 8, 8] as [number, number, number], fov: 60 },
    style: {
      height: "500px",
      background: "linear-gradient(to bottom, #e0f2fe, #f0f9ff)",
    },
    gl: {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "default" as WebGLPowerPreference,
    }
  }), []);

  return (
    <WebGL3DErrorBoundary>
      <Canvas
        {...canvasConfig}
        onCreated={({ gl, scene, camera }) => {
          // Register WebGL context with our advanced manager
          const webglContext = gl.getContext();
          if (webglContext) {
            webglManager.registerWebGLContext(webglContext);
          }

          // Enhanced WebGL context recovery system
          let isContextLost = false;
          let restoreAttempts = 0;
          const MAX_RESTORE_ATTEMPTS = 3;
          let cleanupHandlers: (() => void)[] = [];

          const handleContextLost = (event: Event) => {
            event.preventDefault();
            isContextLost = true;
            console.warn("🚨 WebGL context lost - Three.js Canvas implementing recovery");
            
            // Let the WebGL manager handle the recovery
            if (restoreAttempts < MAX_RESTORE_ATTEMPTS) {
              const timeout = setTimeout(() => {
                console.log(`🔄 Three.js attempting context recovery (attempt ${restoreAttempts + 1}/${MAX_RESTORE_ATTEMPTS})`);
                restoreAttempts++;
                
                try {
                  // Force re-render safely
                  if (gl && gl.domElement) {
                    gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
                  }
                } catch (error) {
                  console.error("Context recovery failed:", error);
                }
              }, 1000 * Math.pow(2, restoreAttempts));
              
              cleanupHandlers.push(() => clearTimeout(timeout));
            }
          };

          const handleContextRestored = () => {
            console.log("✅ Three.js WebGL context restored successfully");
            isContextLost = false;
            restoreAttempts = 0;
            
            try {
              // Reinitialize renderer safely
              if (gl && scene && camera) {
                gl.clear();
                gl.render(scene, camera);
              }
            } catch (error) {
              console.error("Context restoration failed:", error);
            }
          };

          // Enhanced context event handling with error boundaries
          if (gl && gl.domElement) {
            gl.domElement.addEventListener("webglcontextlost", handleContextLost, false);
            gl.domElement.addEventListener("webglcontextrestored", handleContextRestored, false);
          }

          // Comprehensive cleanup function
          const cleanup = () => {
            try {
              if (gl && gl.domElement) {
                gl.domElement.removeEventListener("webglcontextlost", handleContextLost);
                gl.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
              }
              
              // Clean up all pending timeouts
              cleanupHandlers.forEach(handler => handler());
              cleanupHandlers = [];
              
              webglManager.cleanup();
            } catch (error) {
              console.error("Cleanup error:", error);
            }
          };

          return cleanup;
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        {/* Floor Plan */}
        <FloorPlanPlane imageUrl={floorPlanImage} />

        {/* 3D Tables */}
        {memoizedTables.map((table) => (
          <Table3D
            key={table.id}
            position={table.position3D}
            capacity={table.capacity}
            name={table.name}
            isAvailable={table.active}
          />
        ))}

        {/* Grid Helper */}
        <gridHelper
          args={[20, 20, "#cbd5e1", "#e2e8f0"]}
          position={[0, -0.01, 0]}
        />

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </WebGL3DErrorBoundary>
  );
});

FloorPlan3D.displayName = 'FloorPlan3D';

// Main Component with Performance Optimizations
export const FloorPlan3DManager: React.FC<{
  tables: Array<{
    id: string;
    name: string;
    capacity: number;
    position: { x: number; y: number };
    active: boolean;
  }>;
  onTablesDetected?: (tables: DetectedTable[]) => void;
}> = React.memo(({ tables, onTablesDetected }) => {
  const { toast } = useToast();
  const [floorPlanImage, setFloorPlanImage] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);

  // Cleanup effect for object URLs
  React.useEffect(() => {
    return () => {
      if (floorPlanImage && floorPlanImage.startsWith('blob:')) {
        URL.revokeObjectURL(floorPlanImage);
      }
    };
  }, [floorPlanImage]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      setUploadedFile(file);
      setAnalysis(null);

      try {
        // Cleanup previous URL
        if (floorPlanImage && floorPlanImage.startsWith('blob:')) {
          URL.revokeObjectURL(floorPlanImage);
        }

        // Create a local URL for preview
        const imageUrl = URL.createObjectURL(file);
        setFloorPlanImage(imageUrl);

        toast({
          title: "Floor plan uploaded!",
          description: "Ready for AI analysis",
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload floor plan image",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [toast, floorPlanImage],
  );

  const analyzeFloorPlan = useCallback(async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);

    try {
      // Create image element for AI analysis
      const img = new Image();
      img.crossOrigin = "anonymous"; // Handle CORS
      img.src = floorPlanImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (error) => {
          console.error("Image load error:", error);
          reject(new Error("Failed to load image for analysis"));
        };
      });

      console.log("Image loaded successfully, starting AI analysis...");
      const analysisResult = await FloorPlanAI.analyzeFloorPlan(img);
      setAnalysis(analysisResult);

      if (onTablesDetected && analysisResult.detectedTables.length > 0) {
        onTablesDetected(analysisResult.detectedTables);
      }

      if (analysisResult.tableCount > 0) {
        toast({
          title: "Analysis complete!",
          description: `Detected ${analysisResult.tableCount} tables with ${(analysisResult.confidence * 100).toFixed(1)}% confidence`,
        });
      } else {
        toast({
          title: "Analysis complete",
          description:
            "No tables detected. You can manually position tables in Floor Plan view.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);

      // Create fallback analysis result
      const fallbackAnalysis: FloorPlanAnalysis = {
        tableCount: 0,
        detectedTables: [],
        confidence: 0,
        recommendations: [
          "AI analysis failed. This could be due to:",
          "• Image format not supported (try JPG or PNG)",
          "• Floor plan image unclear or too complex",
          "• Temporary AI service issues",
          "You can still manually position tables using the Floor Plan view.",
        ],
        analysisTime: 0,
      };

      setAnalysis(fallbackAnalysis);

      toast({
        title: "Analysis had issues",
        description:
          "Check recommendations below. You can still manually set up tables.",
        variant: "default",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedFile, floorPlanImage, onTablesDetected, toast]);

  const clearFloorPlan = useCallback(() => {
    if (floorPlanImage && floorPlanImage.startsWith('blob:')) {
      URL.revokeObjectURL(floorPlanImage);
    }
    setFloorPlanImage("");
    setUploadedFile(null);
    setAnalysis(null);
  }, [floorPlanImage]);

  // Memoize analysis statistics
  const analysisStats = useMemo(() => {
    if (!analysis) return null;
    
    return {
      tableCount: analysis.tableCount,
      confidence: (analysis.confidence * 100).toFixed(0),
      totalCapacity: analysis.detectedTables.reduce((sum, t) => sum + t.estimatedCapacity, 0),
      analysisTime: (analysis.analysisTime / 1000).toFixed(1),
    };
  }, [analysis]);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move3D className="w-5 h-5" />
            3D Floor Plan Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="floorplan-upload">Upload Floor Plan Image</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="floorplan-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  onClick={clearFloorPlan}
                  variant="outline"
                  disabled={!floorPlanImage}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant={floorPlanImage ? "default" : "secondary"}>
                {floorPlanImage ? "Floor Plan Active" : "No Floor Plan"}
              </Badge>
              {uploadedFile && (
                <p className="text-sm text-muted-foreground">
                  {uploadedFile.name}
                </p>
              )}
            </div>
          </div>

          {!floorPlanImage ? (
            <div className="text-sm text-muted-foreground">
              <p>• Upload a top-down view of your restaurant floor plan</p>
              <p>• AI will automatically detect and count tables</p>
              <p>• Get instant analytics and 3D visualization</p>
            </div>
          ) : !analysis ? (
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Ready for AI Analysis</h4>
                <Button
                  onClick={analyzeFloorPlan}
                  disabled={isAnalyzing}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze Floor Plan"}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>🤖 AI will detect tables and estimate capacity</p>
                <p>📊 Get detailed analytics and recommendations</p>
                <p>🎯 Automatically create 3D table representations</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Analysis Complete
                </h4>
                <Button
                  onClick={analyzeFloorPlan}
                  disabled={isAnalyzing}
                  size="sm"
                  variant="outline"
                >
                  Re-analyze
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisStats?.tableCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tables Detected
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisStats?.confidence || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Confidence
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisStats?.totalCapacity || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Est. Capacity
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisStats?.analysisTime || 0}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Analysis Time
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <p
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                    {rec}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3D Floor Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive 3D Floor Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <FloorPlan3D floorPlanImage={floorPlanImage} tables={tables} />

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Available Tables
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Unavailable Tables
            </Badge>
            <Badge variant="outline">
              <ZoomIn className="w-3 h-3 mr-1" />
              Scroll to Zoom
            </Badge>
            <Badge variant="outline">
              <Move3D className="w-3 h-3 mr-1" />
              Drag to Rotate
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

FloorPlan3DManager.displayName = 'FloorPlan3DManager';
