import { type DetectedEntity } from "./schema";

export const WORLD_W = 10;
export const WORLD_H = 10;

/** Flip Y (image origin top-left → world origin bottom-left) and scale to [0..10]. */
export function img01ToWorld10([cx, cy]: [number, number]): [number, number] {
  const x = clamp(cx * WORLD_W, 0, WORLD_W);
  const y = clamp((1 - cy) * WORLD_H, 0, WORLD_H); // flip Y
      return [x, y];
}

export function clamp(v: number, lo = 0, hi = 10) {
  return Math.max(lo, Math.min(hi, v));
}

/** Ensure every entity is clamped to the visible world plane. */
export function clampEntities(entities: DetectedEntity[]): DetectedEntity[] {
  return entities.map((e) => ({
    ...e,
    x: clamp(e.x, 0, WORLD_W),
    y: clamp(e.y, 0, WORLD_H),
    width: e.width != null ? clamp(e.width, 0, WORLD_W) : e.width,
    height: e.height != null ? clamp(e.height, 0, WORLD_H) : e.height,
    radius: e.radius != null ? clamp(e.radius, 0, WORLD_W / 2) : e.radius,
  }));
}

/** Simple seats heuristic if missing. */
export function inferSeats(e: DetectedEntity): number {
  if (e.seats && e.seats > 0) return e.seats;
  if (e.shape === "ROUND" && e.radius) {
    const circumference = 2 * Math.PI * e.radius;
    return Math.max(2, Math.floor(circumference / 0.55));
  }
  if (e.shape === "RECT" && e.width && e.height) {
    const longEdge = Math.max(e.width, e.height);
    return Math.max(2, 2 * Math.floor(longEdge / 0.55));
  }
  return 2;
}

