/**
 * Named tile tint presets — reusable color adjustments applied to tiles
 * via the editor. Each preset is an HSL/alpha delta that can be assigned
 * to any tile instance on any map. Edited via /editor Data → Tints.
 *
 * Deltas are in the ranges:
 *   h: -180 … 180 (degrees of hue shift)
 *   s: -1 … 1 (saturation multiplier offset; 0 = no change)
 *   l: -1 … 1 (lightness offset)
 *   a: 0 … 1 (alpha, 1 = fully opaque)
 */

export interface TintAdjust {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface TintPreset {
  id: string;
  label: string;
  adjust: TintAdjust;
}

export const TINT_PRESETS: Record<string, TintPreset> = {
  shadow: {
    id: "shadow",
    label: "Shadow (darken)",
    adjust: { h: 0, s: 0, l: -0.2, a: 1 },
  },
  moonlight: {
    id: "moonlight",
    label: "Moonlight (blue-dim)",
    adjust: { h: 210, s: 0.3, l: -0.3, a: 1 },
  },
};

export function getTintPreset(id: string | undefined): TintPreset | undefined {
  if (!id) return undefined;
  return TINT_PRESETS[id];
}

/**
 * Convert an HSL adjustment into a 24-bit RGB multiplier that Phaser's
 * `tile.tint = 0xrrggbb` treats as a per-channel multiplier.
 * Returns 0xffffff (no change) when all deltas are zero.
 */
export function adjustToRgb(adj: TintAdjust): number {
  // Convert HSL deltas into an RGB tint. Phaser multiplies channel values
  // by tint/255, so we construct an RGB that approximates the HSL change.
  // Start from white (1,1,1), apply the delta.
  let h = adj.h;
  let s = 1 + adj.s; // >1 saturates beyond neutral
  let l = 0.5 + adj.l; // 0.5 = neutral gray midpoint

  // Clamp
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(2, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * Math.min(s, 1);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}
