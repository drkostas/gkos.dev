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

/**
 * Play a sound and return a Promise that resolves when playback
 * finishes (or immediately on an autoplay-policy error / missing
 * metadata). Callers that want the game flow to WAIT for a reward
 * jingle before the next dialog advances should `await` this.
 *
 * Uses the same Audio pool as `play()`, so rapid-fire calls with
 * the same file are still round-robin safe.
 */
function playAsync(file: string, volume = 1.0): Promise<void> {
  const pool = getPool(file);
  const el = pool.elements[pool.idx % pool.elements.length];
  pool.idx++;
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("ended", done);
      el.removeEventListener("error", done);
      resolve();
    };
    el.addEventListener("ended", done);
    el.addEventListener("error", done);
    el.play().catch(() => {
      // Autoplay blocked or element error → resolve immediately so
      // the dialog doesn't hang waiting for a sound that never plays.
      done();
    });
  });
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
  play("se_itemget.ogg", 0.4);
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

/** Door enter (walking into a building) */
function playDoor(): void {
  play("se_door_enter.ogg", 0.8);
}

/** Door exit (leaving a building) */
function playExit(): void {
  play("se_door_exit.ogg", 0.8);
}

/** PC turn on */
function playPcOn(): void {
  play("se_pc_on.ogg", 0.7);
}

/** PC turn off */
function playPcOff(): void {
  play("se_pc_off.ogg", 0.7);
}

/**
 * Badge received — standard gym badge jingle. Used for badges 1..6.
 */
function playBadgeGet(): void {
  play("se_badge_get.mp3", 0.6);
}

/**
 * Badge received — 7th gym badge (the last regular gym in Hoenn).
 * A slightly grander fanfare than the standard badge jingle.
 */
function playBadgeFinalGym(): void {
  play("se_badge_final_gym.mp3", 0.6);
}

/**
 * CHAMPION badge — full Battle Symbol fanfare for the final badge.
 * Only play this when the 8th / CHAMPION badge is awarded.
 */
function playBadgeChampion(): void {
  play("se_badge_champion.mp3", 0.7);
}

/**
 * Blog post obtained — shorter berry-style chime.
 * Used when the player collects a blog post entry.
 */
function playBlogGet(): void {
  play("se_blog_get.mp3", 0.55);
}

/**
 * TM obtained — full TM fanfare used when a step milestone awards
 * a new TM or when KOSTAS / an NPC hands one over.
 */
function playTmGet(): void {
  play("se_tm_get.mp3", 0.55);
}

// ── Async variants: resolve when the audio file finishes ────
// Used by the reward flows so the "Received X!" dialog stays open
// until the jingle has actually completed, matching OG behavior.

function playBadgeGetAsync(): Promise<void> {
  return playAsync("se_badge_get.mp3", 0.6);
}

function playBadgeFinalGymAsync(): Promise<void> {
  return playAsync("se_badge_final_gym.mp3", 0.6);
}

function playBadgeChampionAsync(): Promise<void> {
  return playAsync("se_badge_champion.mp3", 0.7);
}

function playBlogGetAsync(): Promise<void> {
  return playAsync("se_blog_get.mp3", 0.55);
}

function playTmGetAsync(): Promise<void> {
  return playAsync("se_tm_get.mp3", 0.55);
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
  door: playDoor,
  exit: playExit,
  pcOn: playPcOn,
  pcOff: playPcOff,
  badgeGet: playBadgeGet,
  badgeFinalGym: playBadgeFinalGym,
  badgeChampion: playBadgeChampion,
  blogGet: playBlogGet,
  tmGet: playTmGet,
  // Async variants — resolve when the jingle finishes playing.
  badgeGetAsync: playBadgeGetAsync,
  badgeFinalGymAsync: playBadgeFinalGymAsync,
  badgeChampionAsync: playBadgeChampionAsync,
  blogGetAsync: playBlogGetAsync,
  tmGetAsync: playTmGetAsync,
};
