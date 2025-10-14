"use client";

import { useEffect, useRef, useState } from "react";
import { useFloorPlanStore } from "@/state/useFloorPlanStore";
import { WORLD_W, WORLD_H } from "@/lib/floorplan/normalize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Settings, Maximize2 } from "lucide-react";

export default function FloorPlanViewer2D() {
  const { entities, uploadedImage } = useFloorPlanStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Set canvas size for high DPI displays (throttled)
    const actualW = W * pixelRatio;
    const actualH = H * pixelRatio;

    if (canvas.width !== actualW || canvas.height !== actualH) {
      canvas.width = actualW;
      canvas.height = actualH;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.scale(pixelRatio, pixelRatio);
    }

    // Clear canvas
    ctx.clearRect(0, 0, W, H);

    // Draw background image if available (with caching)
    if (uploadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(img, 0, 0, W, H);
        ctx.restore();
        drawOverlay();
      };
      img.onerror = () => {
        console.warn("Failed to load background image");
        drawOverlay();
      };
      img.src = uploadedImage;
    } else {
      drawOverlay();
    }

    function drawOverlay() {
      if (!ctx) return;

      // Draw subtle grid
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= WORLD_W; i++) {
        const x = (i / WORLD_W) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let j = 0; j <= WORLD_H; j++) {
        const y = (j / WORLD_H) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Draw coordinate labels
      ctx.fillStyle = "#64748b";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      for (let i = 0; i <= WORLD_W; i += 2) {
        const x = (i / WORLD_W) * W;
        ctx.fillText(i.toString(), x, H - 5);
      }
      ctx.textAlign = "left";
      for (let j = 0; j <= WORLD_H; j += 2) {
        const y = (j / WORLD_H) * H;
        ctx.fillText(j.toString(), 5, H - y);
      }

      // Enhanced data validation and error handling
      if (!entities || !Array.isArray(entities)) {
        console.warn("[FloorPlan2D] Invalid entities data:", entities);
        // Draw placeholder message
        ctx.fillStyle = "rgba(107, 114, 128, 0.8)";
        ctx.font = "16px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No floor plan data available", W / 2, H / 2);
        ctx.fillText("Configure your floor plan in Settings", W / 2, H / 2 + 25);
        return;
      }

      // Draw tables with enhanced styling (optimized)
      const tables = entities.filter((e) => e && e.type === "TABLE" && typeof e.x === "number" && typeof e.y === "number");
      
      if (tables.length === 0) {
        console.log(`[FloorPlan2D] No valid table entities found. Total entities: ${entities.length}, Entity types: ${[...new Set(entities.map(e => e?.type).filter(Boolean))]}`);
        
        // Draw helpful message instead of empty canvas
        ctx.fillStyle = "rgba(107, 114, 128, 0.8)";
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Floor plan loaded but no tables detected", W / 2, H / 2);
        ctx.fillText(`Found ${entities.length} entities: ${[...new Set(entities.map(e => e?.type).filter(Boolean))].join(", ") || "none"}`, W / 2, H / 2 + 20);
      } else {
        console.log(`[FloorPlan2D] Rendering ${tables.length} tables successfully`);
      }

      tables.forEach((e, index) => {
        const x = (e.x / WORLD_W) * W;
        const y = (e.y / WORLD_H) * H;

        // Table color based on confidence
        const confidence = e.confidence || 0.5;
        const alpha = Math.max(0.7, confidence);

        if (confidence > 0.7) {
          ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`; // Green for high confidence
          ctx.strokeStyle = `rgba(21, 128, 61, 0.8)`;
        } else {
          ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`; // Orange for lower confidence
          ctx.strokeStyle = `rgba(194, 65, 12, 0.8)`;
        }

        ctx.lineWidth = 2;

        if (e.shape === "ROUND" && e.radius) {
          const r = (e.radius / WORLD_W) * W;

          // Shadow
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
          ctx.beginPath();
          ctx.arc(x + 2, H - (y - 2), r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Table
          ctx.beginPath();
          ctx.arc(x, H - y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner circle for detail
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, H - y, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const w = ((e.width ?? 1) / WORLD_W) * W;
          const h = ((e.height ?? 1) / WORLD_H) * H;

          // Shadow
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
          ctx.fillRect(x - w / 2 + 2, H - (y + h / 2) + 2, w, h);
          ctx.restore();

          // Table
          ctx.fillRect(x - w / 2, H - (y + h / 2), w, h);
          ctx.strokeRect(x - w / 2, H - (y + h / 2), w, h);

          // Inner border for detail
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - w / 2 + 3, H - (y + h / 2) + 3, w - 6, h - 6);
        }

        // Draw table info
        if (showLabels && e.label) {
          ctx.fillStyle = "#1f2937";
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(e.label, x, H - y + 4);
        }

        // Draw seats count
        ctx.fillStyle = "#374151";
        ctx.font = "9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${e.seats} seats`,
          x,
          H - y + (showLabels && e.label ? 16 : 4),
        );

        // Draw confidence if enabled
        if (showConfidence && e.confidence) {
          ctx.fillStyle = confidence > 0.7 ? "#059669" : "#d97706";
          ctx.font = "8px Inter, sans-serif";
          ctx.fillText(`${Math.round(confidence * 100)}%`, x, H - y - 8);
        }
      });
    }
  }, [entities, uploadedImage, showLabels, showConfidence]);

  const tables = entities.filter((e) => e.type === "TABLE");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            2D Floor Plan View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tables.length} Tables</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={showLabels ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              Labels
            </Button>
            <Button
              variant={showConfidence ? "default" : "outline"}
              size="sm"
              onClick={() => setShowConfidence(!showConfidence)}
            >
              Confidence
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Configure
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="border rounded-lg w-full h-[400px] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
          />

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
              <div className="text-center text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No Tables to Display</h3>
                <p className="text-sm">
                  Upload and analyze a floor plan to see the 2D overlay
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1 justify-center py-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            High Confidence
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 justify-center py-2"
          >
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Lower Confidence
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 justify-center py-2"
          >
            <Maximize2 className="w-3 h-3" />
            True Scale
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Tables are overlaid on your floor plan image with confidence-based
          coloring. Coordinates show the normalized 0-10 grid system used by the
          AI analysis.
        </p>
      </CardContent>
    </Card>
  );
}
