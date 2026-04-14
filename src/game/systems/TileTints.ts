/**
 * Tile tint runtime — loads tile-tints.json and applies per-tile color
 * adjustments to tilemap layers and top sprites.
 *
 * Tint key format: "{map}:{layer}:{x},{y}"
 *   map:   "overworld" | "pokecenter" | "mart" | "gym"
 *   layer: "ground" | "top" | "foreground"
 *   x, y:  tile coordinates (integers)
 *
 * Each entry is either:
 *   - { presetId: "shadow" }    → look up preset from TINT_PRESETS
 *   - { h, s, l, a }            → inline adjustment
 */

import { TINT_PRESETS, adjustToRgb, type TintAdjust } from "@/game/data/tintPresets";

export type TileLayer = "ground" | "top" | "foreground";
export type TintMapId = string;

export interface TintEntry {
  presetId?: string;
  h?: number;
  s?: number;
  l?: number;
  a?: number;
}

export interface TileTintsFile {
  version: number;
  tints: Record<string, TintEntry>;
}

/** In-memory cache of the latest loaded tint file. */
let cache: TileTintsFile | null = null;

/** Load (or reload) tile tints from /game/tile-tints.json. */
export async function loadTileTints(): Promise<TileTintsFile> {
  try {
    const r = await fetch("/game/tile-tints.json", { cache: "no-cache" });
    if (!r.ok) {
      cache = { version: 1, tints: {} };
      return cache;
    }
    cache = await r.json();
    return cache!;
  } catch {
    cache = { version: 1, tints: {} };
    return cache;
  }
}

/** Synchronously get the last loaded cache. */
export function getTileTints(): TileTintsFile {
  return cache || { version: 1, tints: {} };
}

/** Resolve a tint entry to a 24-bit RGB value, or null if no adjust. */
export function resolveTintRgb(entry: TintEntry | undefined): number | null {
  if (!entry) return null;
  let adj: TintAdjust;
  if (entry.presetId) {
    const preset = TINT_PRESETS[entry.presetId];
    if (!preset) return null;
    adj = preset.adjust;
  } else {
    adj = {
      h: entry.h ?? 0,
      s: entry.s ?? 0,
      l: entry.l ?? 0,
      a: entry.a ?? 1,
    };
  }
  return adjustToRgb(adj);
}

/** Resolve alpha (defaults to 1 when no entry or no alpha set). */
export function resolveTintAlpha(entry: TintEntry | undefined): number {
  if (!entry) return 1;
  if (entry.presetId) {
    const preset = TINT_PRESETS[entry.presetId];
    return preset?.adjust.a ?? 1;
  }
  return entry.a ?? 1;
}

/** Build a key for lookups. */
export function tintKey(map: string, layer: TileLayer, x: number, y: number): string {
  return `${map}:${layer}:${x},${y}`;
}

/** Get a tint entry for a specific tile, or null. */
export function getTintAt(map: string, layer: TileLayer, x: number, y: number): TintEntry | null {
  const t = getTileTints();
  return t.tints[tintKey(map, layer, x, y)] || null;
}

/**
 * Apply all tints for a given map + layer to a Phaser tilemap layer.
 * Walks every tint entry for the (map, layer) and sets tile.tint.
 */
export function applyTintsToTilemapLayer(
  mapId: string,
  layer: TileLayer,
  tilemapLayer: Phaser.Tilemaps.TilemapLayer,
): void {
  const t = getTileTints();
  const prefix = `${mapId}:${layer}:`;
  for (const key in t.tints) {
    if (!key.startsWith(prefix)) continue;
    const coordStr = key.substring(prefix.length);
    const [xs, ys] = coordStr.split(",");
    const x = parseInt(xs, 10);
    const y = parseInt(ys, 10);
    const rgb = resolveTintRgb(t.tints[key]);
    if (rgb == null) continue;
    const tile = tilemapLayer.getTileAt(x, y);
    if (!tile) continue;
    tile.tint = rgb;
  }
}

/** Apply a tint to a single sprite, if one exists for (map, layer, x, y). */
export function applyTintToSprite(
  mapId: string,
  layer: TileLayer,
  x: number,
  y: number,
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
): void {
  const entry = getTintAt(mapId, layer, x, y);
  if (!entry) return;
  const rgb = resolveTintRgb(entry);
  if (rgb != null) sprite.setTint(rgb);
  const a = resolveTintAlpha(entry);
  if (a < 1) sprite.setAlpha(a);
}
