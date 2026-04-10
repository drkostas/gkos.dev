/**
 * SoundManager — plays real audio files for Pokemon-style SFX.
 *
 * Audio files live in /game/audio/sfx/*.ogg.
 * Singleton: import { sfx } from "./SoundManager";
 */

const SFX_PATH = "/game/audio/sfx";

// ── Audio pool ────────────────────────────────────────────────
// Pre-create Audio elements. We keep a small pool per sound so
// rapid-fire plays (e.g., text ticks) don't cut each other off.

interface SfxPool {
  elements: HTMLAudioElement[];
  idx: number;
}

const pools = new Map<string, SfxPool>();

function getPool(file: string, size = 3): SfxPool {
  let pool = pools.get(file);
  if (!pool) {
    const elements: HTMLAudioElement[] = [];
    for (let i = 0; i < size; i++) {
      const a = new Audio(`${SFX_PATH}/${file}`);
      a.preload = "auto";
      elements.push(a);
    }
    pool = { elements, idx: 0 };
    pools.set(file, pool);
  }
  return pool;
}

function play(file: string, volume = 1.0): void {
  const pool = getPool(file);
  const el = pool.elements[pool.idx % pool.elements.length];
  pool.idx++;
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  el.play().catch(() => {}); // swallow autoplay-policy errors
}

// ── Public API ────────────────────────────────────────────────

/** Cursor move / menu browse */
function playSelect(): void {
  play("se_select.ogg", 0.7);
}

/** A-button confirm (reuses select sound) */
function playConfirm(): void {
  play("se_select.ogg", 0.8);
}

/** B-button cancel / back */
function playCancel(): void {
  play("se_cancel.ogg", 0.7);
}

/** Menu / window open */
function playMenuOpen(): void {
  play("se_win_open.ogg", 0.7);
}

/** Menu close (reuses cancel sound) */
function playMenuClose(): void {
  play("se_cancel.ogg", 0.6);
}

/** Typewriter text tick (reuses select at low volume) */
function playText(): void {
  play("se_select.ogg", 0.3);
}

/** Wall bonk / collision */
function playCollision(): void {
  play("se_wall_hit.ogg", 0.8);
}

/** Ledge hop / jump down */
function playLedge(): void {
  play("se_dansa.ogg", 0.8);
}

/** Grass rustle — removed, no grass sound in OG */
function playGrass(): void {
  // No grass SFX — OG Emerald doesn't play one on grass step
}

/** Item pickup jingle */
function playPickup(): void {
  play("se_itemget.ogg", 0.8);
}

/** Save complete chime */
function playSave(): void {
  play("se_save.ogg", 0.8);
}

/** Trainer card flip */
function playFlip(): void {
  play("se_card.ogg", 0.7);
}

/** Option value change (reuses select) */
function playOptionChange(): void {
  play("se_select.ogg", 0.5);
}

export const sfx = {
  select: playSelect,
  confirm: playConfirm,
  cancel: playCancel,
  menuOpen: playMenuOpen,
  menuClose: playMenuClose,
  text: playText,
  collision: playCollision,
  ledge: playLedge,
  grass: playGrass,
  pickup: playPickup,
  save: playSave,
  flip: playFlip,
  optionChange: playOptionChange,
};
