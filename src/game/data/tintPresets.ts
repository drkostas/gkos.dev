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
 *
 * The tint is a *multiplier* — 0xffffff preserves original colors, darker
 * values dim, and applying a hue blends the tile toward that color.
 *
 * Behavior:
 *   - All deltas zero → 0xffffff (no change)
 *   - Lightness < 0 → dims (e.g., l=-0.5 → 0x808080 grey multiplier)
 *   - Lightness > 0 → no useful effect (Phaser tint can't brighten)
 *   - Hue + Sat>0 → blends white toward the hue color (strength = sat)
 */
export function adjustToRgb(adj: TintAdjust): number {
  if (adj.h === 0 && adj.s === 0 && adj.l === 0) return 0xffffff;

  // Brightness multiplier from lightness delta
  const lightFactor = Math.max(0, Math.min(2, 1 + adj.l));

  // Determine the hue color as a "target" to blend toward
  let targetR = 1, targetG = 1, targetB = 1;
  const sat = Math.max(0, Math.min(1, adj.s));
  if (sat > 0) {
    const hueNorm = ((adj.h % 360) + 360) % 360;
    const c = 1;
    const x = c * (1 - Math.abs(((hueNorm / 60) % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hueNorm < 60) { r = c; g = x; }
    else if (hueNorm < 120) { r = x; g = c; }
    else if (hueNorm < 180) { g = c; b = x; }
    else if (hueNorm < 240) { g = x; b = c; }
    else if (hueNorm < 300) { r = x; b = c; }
    else { r = c; b = x; }
    // Linear blend from white (1,1,1) toward hue color by saturation
    targetR = 1 - sat + r * sat;
    targetG = 1 - sat + g * sat;
    targetB = 1 - sat + b * sat;
  }

  const R = Math.max(0, Math.min(255, Math.round(targetR * 255 * lightFactor)));
  const G = Math.max(0, Math.min(255, Math.round(targetG * 255 * lightFactor)));
  const B = Math.max(0, Math.min(255, Math.round(targetB * 255 * lightFactor)));
  return (R << 16) | (G << 8) | B;
}
