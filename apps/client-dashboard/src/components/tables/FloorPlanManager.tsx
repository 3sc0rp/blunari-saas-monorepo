"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useFloorPlanStore } from "@/state/useFloorPlanStore";
import { WORLD_W, WORLD_H } from "@/lib/floorplan/normalize";
import { FloorPlanAI } from "@/services/FloorPlanAI";
import type { DetectedEntity } from "@/lib/floorplan/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Brain,
  RotateCcw,
  CheckCircle2,
  Camera,
  Zap,
  FileImage,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Settings,
  Download,
  Share,
  Users,
} from "lucide-react";

export default function FloorPlanManager() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    entities,
    runId,
    isAnalyzing,
    uploadedImage,
    setRun,
    setAnalyzing,
    setUploadedImage,
    reset,
  } = useFloorPlanStore();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, PNG, etc.)");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error("Image size should be less than 10MB");
        return;
      }

      setFile(selectedFile);

      // Create preview URL
      const imageUrl = URL.createObjectURL(selectedFile);
      setUploadedImage(imageUrl);

      toast.success("✨ Image uploaded successfully! Ready for AI analysis");
    },
    [setUploadedImage],
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [], // Remove handleFile dependency to avoid circular dependency
  );

  const analyzeFloorPlan = useCallback(async () => {
    if (!file || !uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }    setAnalyzing(true);
    setAnalysisProgress(0);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate progress for better UX
      progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => Math.min(prev + 15, 85));
      }, 500);

      // Create image element for AI analysis
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = uploadedImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      if (progressInterval) clearInterval(progressInterval);
      setAnalysisProgress(90);

      // Use existing FloorPlanAI service
      const analysisResult = await FloorPlanAI.analyzeFloorPlan(img);

      setAnalysisProgress(100);

      // Convert to our schema format with enhanced distribution
      const runId =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Enhanced table positioning and sizing algorithm with better AI integration
      const entities = analysisResult.detectedTables.map((table, index) => {        // Use AI positioning with smart fallbacks
        let x = table.position?.x || 0;
        let y = table.position?.y || 0;

        // Validate and adjust AI coordinates (0-10 range)
        if (x < 0 || x > 10 || y < 0 || y > 10) {
          console.warn(
            `Invalid AI coordinates for table ${index + 1}: (${x}, ${y}), using fallback`,
          );
          // Fallback to grid positioning if AI coordinates are invalid
          const gridSize = Math.ceil(Math.sqrt(analysisResult.tableCount));
          const spacing = 8 / Math.max(gridSize, 1);
          const margin = (10 - 8) / 2;

          x = margin + (index % gridSize) * spacing + 1;
          y = margin + Math.floor(index / gridSize) * spacing + 1;
        }

        // Smart distribution for multiple tables to avoid clustering
        if (analysisResult.tableCount > 1) {
          // Add slight randomization to prevent perfect grid alignment
          const jitter = 0.3;
          x += (Math.random() - 0.5) * jitter;
          y += (Math.random() - 0.5) * jitter;
        }

        // Enhanced table sizing based on AI analysis and capacity
        const capacity = Math.max(
          2,
          Math.min(12, table.estimatedCapacity || 4),
        );
        const tableType =
          (table as { tableType?: string }).tableType || "round";

        // Determine shape based on AI analysis or capacity
        let shape: "ROUND" | "RECT";
        if (
          tableType === "rectangular" ||
          tableType === "booth" ||
          capacity > 6
        ) {
          shape = "RECT";
        } else {
          shape = "ROUND";
        }

        // Calculate appropriate dimensions
        let radius: number | undefined;
        let width: number | undefined;
        let height: number | undefined;

        if (shape === "ROUND") {
          // Round table sizing: base 0.4 + capacity scaling
          radius = Math.max(0.3, Math.min(1.2, 0.4 + capacity * 0.08));
        } else {
          // Rectangular table sizing
          if (tableType === "booth") {
            // Booths are typically longer and narrower
            width = Math.max(1.2, Math.min(3.0, capacity * 0.25 + 0.8));
            height = Math.max(0.6, Math.min(1.2, capacity * 0.1 + 0.5));
          } else {
            // Regular rectangular tables
            width = Math.max(1.0, Math.min(2.8, capacity * 0.2 + 0.6));
            height = Math.max(0.8, Math.min(2.0, capacity * 0.15 + 0.6));
          }
        }

        const entity: DetectedEntity = {
          id: `table_${runId}_${index}`,
          type: "TABLE" as const,
          shape,
          x: Math.max(0.8, Math.min(9.2, x)),
          y: Math.max(0.8, Math.min(9.2, y)),
          radius,
          width,
          height,
          rotation: (Math.random() - 0.5) * Math.PI * 0.2, // Subtle random rotation
          seats: capacity,
          label: table.name || `Table ${index + 1}`,
          confidence: table.confidence || 0.5,
          meta: {
            aiDetected: true,
            tableType,
            originalPosition: table.position,
            detectionIndex: index,
            description:
              (table as { description?: string }).description ||
              "AI detected table",
          },
        };        return entity;
      });

      const preview = {
        imgWidth: img.naturalWidth,
        imgHeight: img.naturalHeight,
        worldWidth: WORLD_W,
        worldHeight: WORLD_H,
      };

      setTimeout(() => {        setRun(runId, entities, preview);

        if (analysisResult.tableCount > 0) {
          const totalCapacity = entities.reduce((sum, e) => sum + e.seats, 0);
          toast.success(
            `🎯 Analysis complete! Detected ${analysisResult.tableCount} tables (${totalCapacity} seats) with intelligent positioning`,
          );
        } else {
          // Show specific error if it's a rate limit issue
          const isRateLimit = analysisResult.recommendations?.some(
            (r) => r.includes("rate limit") || r.includes("429"),
          );
          if (isRateLimit) {
            toast.error(
              "⏱️ OpenAI rate limit exceeded. Please wait a few minutes and try again.",
            );
          } else {
            toast("🤖 No tables detected in this image", {
              description:
                "Try uploading a clearer floor plan or manually position tables below",
            });
          }
        }
      }, 300);
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Enhanced analysis failed:", error);
      toast.error(
        "Analysis failed. Please try again or position tables manually.",
      );
    } finally {
      setTimeout(() => {
        setAnalyzing(false);
        setAnalysisProgress(0);
      }, 1000);
    }
  }, [file, uploadedImage, setAnalyzing, setRun]);

  const clearFloorPlan = useCallback(() => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setFile(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast("🗑️ Floor plan cleared");
  }, [uploadedImage, reset]);

  const hasAnalysis = runId && entities.length > 0;
  const totalCapacity = entities.reduce((sum, e) => sum + e.seats, 0);
  const avgConfidence =
    entities.length > 0
      ? entities.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        entities.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Upload Card */}
      <Card className="relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-brand to-accent text-brand-foreground">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">AI Floor Plan Analysis</h3>
              <p className="text-sm text-muted-foreground font-normal">
                Upload your restaurant floor plan for intelligent table
                detection
              </p>
            </div>
            <div className="ml-auto">
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300"
              >
                GPT-4 Vision
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer hover-scale
              ${
                dragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]"
                  : uploadedImage
                    ? "border-success bg-success/10"
                    : "border-surface-3 hover:border-surface-3 hover:bg-surface-2"
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {uploadedImage ? (
                <>
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 animate-scale-in">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="animate-fade-in">
                    <h4 className="text-lg font-medium text-green-800 dark:text-green-300">
                      Image Ready for Analysis
                    </h4>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {file?.name} •{" "}
                      {((file?.size || 0) / 1024 / 1024).toFixed(1)}MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20 animate-scale-in">
                    <FileImage className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="animate-fade-in">
                    <h4 className="text-lg font-medium">
                      Drop your floor plan here
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      or click to browse • JPG, PNG up to 10MB
                    </p>
                  </div>
                </>
              )}
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={analyzeFloorPlan}
                disabled={!uploadedImage || isAnalyzing}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale"
              >
                {isAnalyzing ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Analyze Floor Plan
                  </>
                )}
              </Button>

              {uploadedImage && (
                <Button
                  onClick={clearFloorPlan}
                  variant="outline"
                  size="lg"
                  className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950/20 hover-scale"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover-scale">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" className="hover-scale">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  AI Analysis Progress
                </span>
                <span className="font-medium">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>GPT-4 Vision is analyzing your floor plan...</span>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {hasAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover-scale">
                <CardContent className="p-4 text-center">
                  <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {entities.length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Tables Detected
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800 hover-scale">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {Math.round(avgConfidence * 100)}%
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Avg Confidence
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 hover-scale">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {totalCapacity}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    Total Capacity
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800 hover-scale">
                <CardContent className="p-4 text-center">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    AI
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    Enhanced
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions */}
          {!uploadedImage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/20">
                  <Camera className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Clear Photo</div>
                  <div>Take a top-down photo of your restaurant floor plan</div>
                </div>
              </div>
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/20">
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">AI Analysis</div>
                  <div>GPT-4 Vision detects tables and estimates capacity</div>
                </div>
              </div>
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="p-1 rounded bg-green-100 dark:bg-green-900/20">
                  <Eye className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    3D Visualization
                  </div>
                  <div>View and interact with your floor plan in 3D</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

