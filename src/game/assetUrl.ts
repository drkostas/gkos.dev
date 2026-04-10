/**
 * Resolve a game asset path to its full URL.
 *
 * In development: assets are served from /game/ in the public directory.
 * In production: assets are served from Cloudflare R2 (or another CDN).
 *
 * Set GAME_ASSET_BASE in your .env to override:
 *   GAME_ASSET_BASE=https://game-assets.gkos.dev
 *
 * When unset, falls back to the local /game/ path (works for dev and
 * for small-scale deploys where assets ARE in public/).
 */

const ASSET_BASE =
  import.meta.env.PUBLIC_GAME_ASSET_BASE ??
  (typeof process !== "undefined" ? process.env.PUBLIC_GAME_ASSET_BASE : undefined) ??
  "/game";

/**
 * Resolve a relative game asset path to a full URL.
 * @param path - e.g. "maps/town.json" or "sprites/player.png"
 * @returns Full URL e.g. "https://game-assets.gkos.dev/maps/town.json"
 */
export function gameAsset(path: string): string {
  // Strip leading slash if present
  const cleanPath = path.replace(/^\//, "");
  return `${ASSET_BASE}/${cleanPath}`;
}
