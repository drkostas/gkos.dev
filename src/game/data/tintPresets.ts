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
  /** Rotation in degrees (0, 90, 180, 270). Only applied to top sprites, not ground tiles. */
  rot?: number;
  /** Horizontal flip. */
  flipX?: boolean;
  /** Vertical flip. */
  flipY?: boolean;
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
 * True-HSL tint: apply the adjustment to a Phaser sprite via the preFX
 * ColorMatrix pipeline. This supports full hue rotation, saturation
 * (positive = more saturated, negative = desaturate toward grey), and
 * brightness (positive brightens, negative darkens) — unlike the
 * multiplicative `setTint()` which can only darken toward black.
 *
 * Alpha is applied as the sprite's opacity (separate from the color matrix).
 *
 * Pass `null` for `adj` to clear any existing FX.
 */
export function applyAdjustToFX(
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
  adj: TintAdjust | null,
): void {
  // preFX is only available on the WebGL renderer. In canvas mode, fall back
  // to clearing — callers can use adjustToRgb() as a partial fallback if needed.
  const preFX = (sprite as unknown as { preFX?: Phaser.GameObjects.Components.FX | null }).preFX;
  if (!preFX) return;
  // Always clear first so sliders don't accumulate.
  (preFX as unknown as { clear: () => void }).clear();
  if (!adj) {
    sprite.setAlpha(1);
    return;
  }
  sprite.setAlpha(adj.a ?? 1);
  const hasChange = adj.h !== 0 || adj.s !== 0 || adj.l !== 0;
  if (!hasChange) return;
  const addMatrix = (preFX as unknown as { addColorMatrix: () => Phaser.Display.ColorMatrix }).addColorMatrix;
  if (!addMatrix) return;
  const cm = addMatrix.call(preFX) as Phaser.Display.ColorMatrix;
  // Reset the matrix to identity, then compose the requested ops. Passing
  // multiply=true on each op keeps prior ops in the matrix.
  cm.reset();
  if (adj.l !== 0) cm.brightness(1 + adj.l, true);
  if (adj.s !== 0) cm.saturate(adj.s, true);
  if (adj.h !== 0) cm.hue(adj.h, true);
}

/**
 * Legacy RGB multiplier — kept for code paths that can't use preFX
 * (e.g. Canvas renderer fallback, individual tilemap tiles that share a
 * single FX pipeline). Real HSL goes through `applyAdjustToFX` instead.
 *
 * This is a best-effort approximation: it only darkens (Phaser tint can't
 * brighten), and hue requires saturation > 0 to express.
 */
export function adjustToRgb(adj: TintAdjust): number {
  if (adj.h === 0 && adj.s === 0 && adj.l === 0) return 0xffffff;

  const lightFactor = Math.max(0, Math.min(2, 1 + adj.l));

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
    targetR = 1 - sat + r * sat;
    targetG = 1 - sat + g * sat;
    targetB = 1 - sat + b * sat;
  }

  const R = Math.max(0, Math.min(255, Math.round(targetR * 255 * lightFactor)));
  const G = Math.max(0, Math.min(255, Math.round(targetG * 255 * lightFactor)));
  const B = Math.max(0, Math.min(255, Math.round(targetB * 255 * lightFactor)));
  return (R << 16) | (G << 8) | B;
}
