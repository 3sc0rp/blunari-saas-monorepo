"use client";
import { create } from "zustand";
import type { DetectedEntity } from "@/lib/floorplan/schema";

type State = {
  runId: string | null;
  entities: DetectedEntity[];
  preview?: {
    imgWidth: number;
    imgHeight: number;
    worldWidth: number;
    worldHeight: number;
  };
  isAnalyzing: boolean;
  uploadedImage: string | null;

  setRun: (
    runId: string,
    ents: DetectedEntity[],
    preview: State["preview"],
  ) => void;
  updateEntity: (idx: number, patch: Partial<DetectedEntity>) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setUploadedImage: (image: string | null) => void;
  reset: () => void;
};

export const useFloorPlanStore = create<State>((set) => ({
  runId: null,
  entities: [],
  preview: undefined,
  isAnalyzing: false,
  uploadedImage: null,

  setRun: (runId, ents, preview) => set({ runId, entities: ents, preview }),
  updateEntity: (idx, patch) =>
    set((s) => {
      const copy = s.entities.slice();
      copy[idx] = { ...copy[idx], ...patch };
      return { entities: copy };
    }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setUploadedImage: (uploadedImage) => set({ uploadedImage }),
  reset: () =>
    set({
      runId: null,
      entities: [],
      preview: undefined,
      uploadedImage: null,
      isAnalyzing: false,
    }),
}));
