import { pipeline, env } from '@huggingface/transformers';
import { supabase } from '@/integrations/supabase/client';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface DetectedTable {
  id: string;
  name: string;
  position: { x: number; y: number };
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  estimatedCapacity: number;
  tableType?: string;
  description?: string;
}

export interface FloorPlanAnalysis {
  tableCount: number;
  detectedTables: DetectedTable[];
  confidence: number;
  recommendations: string[];
  analysisTime: number;
}

export class FloorPlanAI {
  private static detector: any = null;
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing AI object detection model...');
      
      // Try WebGPU first, then fall back to CPU
      try {
        this.detector = await pipeline(
          'object-detection', 
          'Xenova/detr-resnet-50',
          { device: 'webgpu' }
        );
        console.log('AI model initialized with WebGPU successfully');
      } catch (webgpuError) {
        console.warn('WebGPU not available, falling back to CPU:', webgpuError);
        this.detector = await pipeline(
          'object-detection', 
          'Xenova/detr-resnet-50'
        );
        console.log('AI model initialized with CPU successfully');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI model:', error);
      throw new Error(`Failed to load AI model: ${error.message}`);
    }
  }

  static async analyzeFloorPlan(imageElement: HTMLImageElement): Promise<FloorPlanAnalysis> {
    const startTime = Date.now();
    
    try {
      console.log('Starting advanced floor plan analysis with GPT-4 Vision...');
      console.log('Image dimensions:', imageElement.width, 'x', imageElement.height);
      
      // Ensure image is loaded
      if (!imageElement.complete || imageElement.naturalHeight === 0) {
        throw new Error('Image not properly loaded');
      }

      // Convert image to canvas for better quality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      
      // Use original dimensions but limit size for API
      const maxSize = 1024;
      const scale = Math.min(maxSize / imageElement.naturalWidth, maxSize / imageElement.naturalHeight, 1);
      
      canvas.width = imageElement.naturalWidth * scale;
      canvas.height = imageElement.naturalHeight * scale;
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      // Get high-quality image data
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Image converted for AI analysis');

      // Call our edge function for GPT-4 Vision analysis using Supabase client
      console.log('Sending to GPT-4 Vision for analysis...');
      const { data: result, error } = await supabase.functions.invoke('analyze-floor-plan', {
        body: { imageBase64: imageDataUrl }
      });

      if (error) {
        throw new Error(`Analysis API error: ${error.message}`);
      }

      console.log('GPT-4 Vision analysis result:', result);

      // Convert GPT-4 response to our format
      const analysisTime = Date.now() - startTime;
      
      return {
        tableCount: result.tableCount || 0,
        detectedTables: (result.detectedTables || []).map((table: any, index: number) => ({
          id: table.id || `detected_${index + 1}`,
          name: table.name || `Table ${index + 1}`,
          position: {
            x: Math.max(0, Math.min(10, table.position?.x || (Math.random() * 8 + 1))),
            y: Math.max(0, Math.min(10, table.position?.y || (Math.random() * 8 + 1)))
          },
          confidence: table.confidence || 0,
          boundingBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 100
          },
          estimatedCapacity: Math.max(2, Math.min(12, table.estimatedCapacity || 4)),
          tableType: table.tableType || 'round',
          description: table.description || 'AI detected table'
        })),
        confidence: result.confidence || 0,
        recommendations: result.recommendations || [
          "Analysis completed with enhanced GPT-4 Vision",
          result.analysis || "Advanced AI analysis of your restaurant floor plan",
          result.tableCount > 0 ? 
            `Successfully identified ${result.tableCount} dining areas` : 
            "No clear tables detected - try a more detailed floor plan image"
        ],
        analysisTime
      };

    } catch (error) {
      console.error('Error in advanced floor plan analysis:', error);
      
      // Fallback to simple analysis if advanced fails
      console.log('Falling back to basic object detection...');
      try {
        return await this.basicAnalysis(imageElement, startTime);
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
        return this.createFallbackAnalysis(startTime, error.message);
      }
    }
  }

  // Keep the original DETR analysis as fallback
  private static async basicAnalysis(imageElement: HTMLImageElement, startTime: number): Promise<FloorPlanAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not create canvas context');
    
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const detections = await this.detector(imageDataUrl);
    
    const tableDetections = detections.filter((detection: any) => 
      this.isTableLikeObject(detection.label) && detection.score > 0.3
    );

    const detectedTables: DetectedTable[] = tableDetections.map((detection: any, index: number) => {
      const boundingBox = detection.box;
      
      return {
        id: `detected_${index + 1}`,
        name: `Table ${index + 1}`,
        position: {
          x: Math.max(0, Math.min(10, (boundingBox.xmin + boundingBox.xmax) / 2 / imageElement.naturalWidth * 10)),
          y: Math.max(0, Math.min(10, (boundingBox.ymin + boundingBox.ymax) / 2 / imageElement.naturalHeight * 10))
        },
        confidence: detection.score,
        boundingBox: {
          x: boundingBox.xmin,
          y: boundingBox.ymin,
          width: boundingBox.xmax - boundingBox.xmin,
          height: boundingBox.ymax - boundingBox.ymin
        },
        estimatedCapacity: this.estimateTableCapacity(boundingBox)
      };
    });

    const analysisTime = Date.now() - startTime;
    const averageConfidence = detectedTables.length > 0 
      ? detectedTables.reduce((sum, table) => sum + table.confidence, 0) / detectedTables.length 
      : 0;

    return {
      tableCount: detectedTables.length,
      detectedTables,
      confidence: averageConfidence,
      recommendations: this.generateRecommendations(detectedTables, imageElement),
      analysisTime
    };
  }

  private static createFallbackAnalysis(startTime: number, errorMessage?: string): FloorPlanAnalysis {
    const analysisTime = Date.now() - startTime;
    
    return {
      tableCount: 0,
      detectedTables: [],
      confidence: 0,
      recommendations: [
        "🔍 AI analysis encountered an issue - this could be due to:",
        "• Image format: Try uploading JPG or PNG format",
        "• Image clarity: Use a high-contrast, well-lit floor plan",
        "• Network: Check your internet connection", 
        "• Floor plan complexity: Very detailed plans may need manual review",
        errorMessage ? `• Technical details: ${errorMessage}` : "• Temporary AI service issues",
        "",
        "💡 You can manually position tables using the interactive Floor Plan view below",
        "📊 The 3D visualization will still work with manually placed tables"
      ],
      analysisTime
    };
  }

  private static isTableLikeObject(label: string): boolean {
    const tableKeywords = [
      'dining table', 'table', 'desk', 'bench', 'chair',
      'furniture', 'couch', 'sofa'
    ];
    
    return tableKeywords.some(keyword => 
      label.toLowerCase().includes(keyword)
    );
  }

  private static estimateTableCapacity(boundingBox: any): number {
    // Estimate capacity based on bounding box size
    const area = (boundingBox.xmax - boundingBox.xmin) * (boundingBox.ymax - boundingBox.ymin);
    
    if (area < 1000) return 2;
    if (area < 2500) return 4;
    if (area < 5000) return 6;
    return 8;
  }

  private static generateRecommendations(tables: DetectedTable[], image: HTMLImageElement): string[] {
    const recommendations: string[] = [];
    
    if (tables.length === 0) {
      recommendations.push("No tables detected. Try uploading a clearer floor plan image.");
      recommendations.push("Ensure tables are clearly visible and not obstructed by other objects.");
    } else {
      recommendations.push(`Successfully detected ${tables.length} tables.`);
      
      const lowConfidenceTables = tables.filter(t => t.confidence < 0.5);
      if (lowConfidenceTables.length > 0) {
        recommendations.push(`${lowConfidenceTables.length} tables detected with low confidence. Manual verification recommended.`);
      }
      
      const totalCapacity = tables.reduce((sum, table) => sum + table.estimatedCapacity, 0);
      recommendations.push(`Estimated total seating capacity: ${totalCapacity} guests.`);
      
      if (tables.length < 5) {
        recommendations.push("Consider optimizing your layout for more tables if space allows.");
      }
    }
    
    return recommendations;
  }
}