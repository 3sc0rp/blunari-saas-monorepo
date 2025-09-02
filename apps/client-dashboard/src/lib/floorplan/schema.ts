import { z } from "zod";

export const EntityTypeSchema = z.enum([
  "TABLE",
  "CHAIR",
  "WALL",
  "DOOR",
  "BAR",
  "OBSTACLE",
  "ZONE",
]);
export const TableShapeSchema = z.enum(["ROUND", "RECT", "POLYGON"]);

export const DetectedEntitySchema = z.object({
  id: z.string().uuid().optional(),
  type: EntityTypeSchema,
  shape: TableShapeSchema.optional(),
  x: z.number().min(0).max(10),
  y: z.number().min(0).max(10),
  width: z.number().min(0).max(10).optional(),
  height: z.number().min(0).max(10).optional(),
  radius: z.number().min(0).max(5).optional(),
  rotation: z.number().optional().default(0),
  seats: z.number().int().min(0).default(0),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const AnalyzeRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  calibration: z
    .object({
      mode: z.enum(["AUTO", "MANUAL"]).default("AUTO"),
      anchors: z
        .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
        .length(4)
        .optional(),
    })
    .default({ mode: "AUTO" }),
});

export const AnalyzeResponseSchema = z.object({
  runId: z.string().uuid(),
  tablesDetected: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  analysisMs: z.number().int().min(0),
  entities: z.array(DetectedEntitySchema),
  preview: z.object({
    imgWidth: z.number().int().positive(),
    imgHeight: z.number().int().positive(),
    worldWidth: z.number().min(0).max(10).default(10),
    worldHeight: z.number().min(0).max(10).default(10),
  }),
});

export type DetectedEntity = z.infer<typeof DetectedEntitySchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
