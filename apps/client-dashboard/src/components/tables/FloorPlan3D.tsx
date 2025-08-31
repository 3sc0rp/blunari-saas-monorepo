import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, RotateCcw, ZoomIn, ZoomOut, Move3D, Brain, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FloorPlanAI, type FloorPlanAnalysis, type DetectedTable } from '@/services/FloorPlanAI';

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

// 3D Table Component
const Table3D: React.FC<Table3DProps> = ({ position, capacity, name, isAvailable }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const tableColor = isAvailable ? '#10b981' : '#ef4444';
  const tableSize = Math.max(0.3, capacity * 0.15);

  return (
    <group position={position}>
      {/* Table Base */}
      <Box
        ref={meshRef}
        args={[tableSize, 0.1, tableSize]}
        position={[0, 0.05, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={tableColor} />
      </Box>
      
      {/* Table Top */}
      <Box
        args={[tableSize * 1.1, 0.05, tableSize * 1.1]}
        position={[0, 0.125, 0]}
      >
        <meshStandardMaterial color={hovered ? '#fbbf24' : '#f3f4f6'} />
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
};

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
    <React.Suspense fallback={
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.8} />
      </mesh>
    }>
      <FloorPlanPlaneWithTexture imageUrl={imageUrl} />
    </React.Suspense>
  );
};

// Separate component for texture loading
const FloorPlanPlaneWithTexture: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const texture = useLoader(TextureLoader, imageUrl);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial map={texture} transparent opacity={0.9} />
    </mesh>
  );
};

// Main 3D Scene Component
const FloorPlan3D: React.FC<FloorPlanProps> = ({ floorPlanImage, tables }) => {
  return (
    <Canvas
      camera={{ position: [0, 8, 8], fov: 60 }}
      style={{ height: '500px', background: 'linear-gradient(to bottom, #e0f2fe, #f0f9ff)' }}
      gl={{ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "default"
      }}
      onCreated={({ gl }) => {
        // Handle context lost/restored events
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          console.log('WebGL context lost');
        });
        
        gl.domElement.addEventListener('webglcontextrestored', () => {
          console.log('WebGL context restored');
        });
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
      {tables.map((table) => (
        <Table3D
          key={table.id}
          position={[
            (table.position.x - 5) * 2, // Convert to 3D coordinates
            0,
            (table.position.y - 5) * 2
          ]}
          capacity={table.capacity}
          name={table.name}
          isAvailable={table.active}
        />
      ))}

      {/* Grid Helper */}
      <gridHelper args={[20, 20, '#cbd5e1', '#e2e8f0']} position={[0, -0.01, 0]} />

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
  );
};

// Main Component
export const FloorPlan3DManager: React.FC<{ tables: any[], onTablesDetected?: (tables: DetectedTable[]) => void }> = ({ tables, onTablesDetected }) => {
  const { toast } = useToast();
  const [floorPlanImage, setFloorPlanImage] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);
    setAnalysis(null);

    try {
      // Create a local URL for preview
      const imageUrl = URL.createObjectURL(file);
      setFloorPlanImage(imageUrl);
      
      toast({
        title: "Floor plan uploaded!",
        description: "Ready for AI analysis"
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload floor plan image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const analyzeFloorPlan = useCallback(async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    
    try {
      // Create image element for AI analysis
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS
      img.src = floorPlanImage;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load image for analysis'));
        };
      });

      console.log('Image loaded successfully, starting AI analysis...');
      const analysisResult = await FloorPlanAI.analyzeFloorPlan(img);
      setAnalysis(analysisResult);
      
      if (onTablesDetected && analysisResult.detectedTables.length > 0) {
        onTablesDetected(analysisResult.detectedTables);
      }

      if (analysisResult.tableCount > 0) {
        toast({
          title: "Analysis complete!",
          description: `Detected ${analysisResult.tableCount} tables with ${(analysisResult.confidence * 100).toFixed(1)}% confidence`
        });
      } else {
        toast({
          title: "Analysis complete",
          description: "No tables detected. You can manually position tables in Floor Plan view.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Create fallback analysis result
      const fallbackAnalysis = {
        tableCount: 0,
        detectedTables: [],
        confidence: 0,
        recommendations: [
          "AI analysis failed. This could be due to:",
          "• Image format not supported (try JPG or PNG)",
          "• Floor plan image unclear or too complex",
          "• Temporary AI service issues",
          "You can still manually position tables using the Floor Plan view."
        ],
        analysisTime: 0
      };
      
      setAnalysis(fallbackAnalysis);
      
      toast({
        title: "Analysis had issues",
        description: "Check recommendations below. You can still manually set up tables.",
        variant: "default"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedFile, floorPlanImage, onTablesDetected, toast]);

  const clearFloorPlan = () => {
    setFloorPlanImage('');
    setUploadedFile(null);
    setAnalysis(null);
    if (floorPlanImage) {
      URL.revokeObjectURL(floorPlanImage);
    }
  };

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
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Floor Plan'}
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
                  <div className="text-2xl font-bold text-blue-600">{analysis.tableCount}</div>
                  <div className="text-xs text-muted-foreground">Tables Detected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(analysis.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.detectedTables.reduce((sum, t) => sum + t.estimatedCapacity, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Est. Capacity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(analysis.analysisTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground">Analysis Time</div>
                </div>
              </div>
              <div className="space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <p key={index} className="text-sm text-muted-foreground flex items-start gap-2">
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
};